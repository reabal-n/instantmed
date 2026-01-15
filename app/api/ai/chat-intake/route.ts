import { NextRequest } from "next/server"
import { streamText } from "ai"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createClient } from "@/lib/supabase/server"
import { checkAndSanitize } from "@/lib/ai/prompt-safety"

const log = createLogger("ai-chat-intake")

// Emergency keywords that trigger hard-block (server-side, not prompt-only)
const EMERGENCY_KEYWORDS = [
  "chest pain",
  "chest pains",
  "heart attack",
  "can't breathe",
  "cant breathe",
  "cannot breathe",
  "difficulty breathing",
  "hard to breathe",
  "struggling to breathe",
  "shortness of breath",
  "stroke",
  "paralysis",
  "paralyzed",
  "numbness",
  "slurred speech",
  "face drooping",
  "severe bleeding",
  "heavy bleeding",
  "unconscious",
  "passed out",
  "seizure",
  "fitting",
  "convulsion",
]

const SELF_HARM_KEYWORDS = [
  "suicide",
  "suicidal",
  "kill myself",
  "end my life",
  "want to die",
  "don't want to live",
  "dont want to live",
  "self harm",
  "self-harm",
  "hurt myself",
  "cutting myself",
  "overdose",
]

// Emergency response payloads (not AI-generated)
const EMERGENCY_RESPONSE = {
  type: "emergency_block",
  message: `I'm concerned about what you've shared. This sounds like a medical emergency that needs immediate attention.

**Please call 000 (Triple Zero) immediately** or go to your nearest emergency department.

If you're unsure, you can also call Healthdirect on 1800 022 222 for 24/7 health advice.

InstantMed is not able to help with medical emergencies. Your safety is the priority right now.`,
  buttons: ["[Call 000]", "[Find nearest ED]"],
}

const SELF_HARM_RESPONSE = {
  type: "crisis_block", 
  message: `I hear that you're going through a really difficult time. Your feelings are valid, and support is available.

**Please reach out to one of these services now:**

- **Lifeline**: 13 11 14 (24/7 crisis support)
- **Beyond Blue**: 1300 22 4636
- **Kids Helpline**: 1800 55 1800 (if under 25)

If you're in immediate danger, please call 000.

These services are free, confidential, and staffed by people who genuinely want to help. You don't have to face this alone.`,
  buttons: ["[Call Lifeline 13 11 14]", "[Chat with Beyond Blue]"],
}

/**
 * Check messages for emergency/crisis keywords
 * Returns response payload if blocked, null otherwise
 */
function checkForEmergency(messages: Array<{ role: string; content: string }>): {
  blocked: boolean
  response?: typeof EMERGENCY_RESPONSE | typeof SELF_HARM_RESPONSE
  reason?: string
} {
  // Only check user messages
  const userMessages = messages.filter(m => m.role === "user")
  const latestUserMessage = userMessages[userMessages.length - 1]?.content?.toLowerCase() || ""
  const allUserText = userMessages.map(m => m.content.toLowerCase()).join(" ")

  // Check self-harm first (more specific response needed)
  for (const keyword of SELF_HARM_KEYWORDS) {
    if (latestUserMessage.includes(keyword) || allUserText.includes(keyword)) {
      return {
        blocked: true,
        response: SELF_HARM_RESPONSE,
        reason: `self_harm_keyword: ${keyword}`,
      }
    }
  }

  // Check emergency keywords
  for (const keyword of EMERGENCY_KEYWORDS) {
    if (latestUserMessage.includes(keyword)) {
      return {
        blocked: true,
        response: EMERGENCY_RESPONSE,
        reason: `emergency_keyword: ${keyword}`,
      }
    }
  }

  return { blocked: false }
}

/**
 * AI Chat Intake - Conversational intake form
 * 
 * This endpoint powers the chat-based intake flow that guides patients
 * through the request process in a conversational manner.
 */

const SYSTEM_PROMPT = `You are a friendly, professional medical intake assistant for InstantMed, an Australian telehealth service. Your role is to guide patients through requesting medical certificates or repeat prescriptions.

PERSONALITY:
- Warm but professional
- Concise - keep messages short (1-2 sentences max)
- Use Australian English spelling
- Never give medical advice - you're just collecting information

FLOW RULES:
1. First, ask what they need help with (med cert, repeat prescription, or GP consult)
2. Based on their choice, guide them through the required questions
3. Always offer quick-reply buttons when possible (format: [Button Text])
4. After collecting all required info, summarize and confirm

MEDICAL CERTIFICATE FLOW:
1. Ask: Work, school/uni, or caring for someone?
2. Ask: Start date (offer [Today] [Tomorrow] or let them type)
3. Ask: How many days? (offer [1 day] [2 days] [3 days])
4. Ask: Main symptoms (offer common ones as buttons + "Other")
5. Confirm emergency disclaimer
6. Summarize and proceed to payment

REPEAT PRESCRIPTION FLOW:
1. Ask: What medication do you need refilled?
2. Ask: When did you last see a doctor about this?
3. Ask: Any changes to your health?
4. Confirm they have a regular GP
5. Summarize and proceed

BUTTON FORMAT:
When offering choices, format them exactly like this on their own line:
[Option 1] [Option 2] [Option 3]

IMPORTANT:
- Never diagnose or give medical advice
- If they mention emergency symptoms (chest pain, difficulty breathing, etc.), immediately direct them to call 000
- Keep the conversation moving forward
- If they seem confused, offer to connect them with support

STRUCTURED DATA:
When you have collected enough information to proceed, include this JSON block at the end of your message:
\`\`\`intake_data
{
  "ready": true/false,
  "service_type": "med_cert" | "repeat_rx" | "consult" | null,
  "collected": {
    // all collected fields
  }
}
\`\`\`

Start by greeting them warmly and asking how you can help today.`

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.id) {
      const rateLimitResponse = await applyRateLimit(request, 'standard', user.id)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }

    // Check for AI Gateway API key (or OIDC on Vercel)
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL) {
      log.error("AI_GATEWAY_API_KEY not configured")
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { messages } = body as { 
      messages: Array<{ role: "user" | "assistant"; content: string }>
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // HARD-BLOCK: Check for emergency/crisis keywords BEFORE calling AI
    const emergencyCheck = checkForEmergency(messages)
    if (emergencyCheck.blocked && emergencyCheck.response) {
      log.warn("Emergency keyword detected - blocking AI call", {
        reason: emergencyCheck.reason,
        userId: user?.id || "anonymous",
      })
      
      // Return fixed response (not AI-generated) as a streaming-compatible format
      const responseText = `${emergencyCheck.response.message}\n\n${emergencyCheck.response.buttons.join(" ")}`
      return new Response(responseText, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // P1 FIX: Check for prompt injection in user messages
    const userMessages = messages.filter(m => m.role === "user")
    const latestUserMessage = userMessages[userMessages.length - 1]?.content || ""
    
    const safetyCheck = checkAndSanitize(latestUserMessage, {
      endpoint: "chat-intake",
      userId: user?.id,
    })
    
    if (safetyCheck.blocked) {
      log.warn("Prompt injection blocked", {
        userId: user?.id || "anonymous",
        messageLength: latestUserMessage.length,
      })
      // Return a generic response that doesn't reveal the block reason
      return new Response(
        "I'm sorry, I couldn't process that message. Could you rephrase what you're looking for help with?",
        { status: 200, headers: { "Content-Type": "text/plain" } }
      )
    }

    // Sanitize messages before sending to AI
    const sanitizedMessages = messages.map(m => ({
      ...m,
      content: m.role === "user" ? checkAndSanitize(m.content, { endpoint: "chat-intake" }).output : m.content
    }))

    log.info("Chat intake request", { 
      messageCount: messages.length,
      userId: user?.id || "anonymous"
    })

    // Stream the response via Vercel AI Gateway
    const result = streamText({
      model: "openai/gpt-4o-mini",
      system: SYSTEM_PROMPT,
      messages: sanitizedMessages,
    })

    return result.toTextStreamResponse()

  } catch (error) {
    log.error("Error in chat intake", { error })
    return new Response(
      JSON.stringify({ error: "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
