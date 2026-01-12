import { NextRequest } from "next/server"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createClient } from "@/lib/supabase/server"

const log = createLogger("ai-chat-intake")

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

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      log.error("OPENAI_API_KEY not configured")
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

    log.info("Chat intake request", { 
      messageCount: messages.length,
      userId: user?.id || "anonymous"
    })

    // Stream the response
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages,
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
