import { NextRequest } from "next/server"
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { auth } from "@clerk/nextjs/server"
import { checkAndSanitize } from "@/lib/ai/prompt-safety"
import { logAIInteraction, logSafetyBlock, PROMPT_VERSION } from "@/lib/intake/audit-trail"
import { trackAIInteraction } from "@/lib/intake/intake-analytics"
// Validation is performed via separate /api/ai/chat-intake/validate endpoint
// See lib/intake/chat-validation.ts for validation logic

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

const SYSTEM_PROMPT = `You are a structured intake assistant for InstantMed (Australian telehealth). Your output feeds a doctor review queue.

ROLE BOUNDARIES (CRITICAL):
- You COLLECT data. You do NOT diagnose, interpret, or advise.
- You FLAG patterns. Doctors make clinical decisions.
- You SUMMARIZE. Doctors assess.
- If asked medical questions: "I collect information for your request. A doctor will review and can answer medical questions."

PERSONALITY:
- Direct, calm, efficient. No filler.
- One question per turn. Max two sentences.
- Australian English. No empathy theatrics.

CORE RULES:
1. ONE question per turn — never multiple
2. BUTTONS for discrete options: [Option]
3. SHORT confirmations: "Got it." not summaries
4. NO interpretation of symptoms
5. STRUCTURED output for doctor queue

INTENT DETECTION (Turn 1):
"What do you need today?"
[Medical Certificate] [Repeat Prescription] [New Prescription] [GP Consult]

=== MEDICAL CERTIFICATE ===
Collect in order:
1. purpose: [Work] [Education] [Carer's leave]
2. if carer: carerName (text), carerRelationship: [Child] [Parent] [Partner] [Other]
3. startDate: [Today] [Tomorrow] [Custom date]
4. durationDays: [1 day] [2 days] [3 days] [4+ days]
5. primarySymptoms: [Upper respiratory] [Gastro] [Headache/Migraine] [Fatigue] [Menstrual] [Mental health] [Other]
6. if other: symptomDescription (text, max 100 chars)
7. symptomOnset: [Today] [Yesterday] [2-3 days] [4-7 days] [Over 1 week]
8. symptomSeverity: [Mild] [Moderate] [Severe]

FLAGS to set:
- durationDays >= 4: flag "duration_concern"
- isBackdated (startDate before today): flag "backdated_request"
- symptomSeverity = "severe": flag "severity_concern"

=== REPEAT PRESCRIPTION ===
Collect in order:
1. medicationName (text)
2. medicationStrength (text, optional)
3. treatmentDuration: [Under 3 months] [3-12 months] [Over 1 year]
4. prescribedBy: [Regular GP] [Specialist] [Other doctor] [This service]
5. lastReviewDate: [Under 3 months] [3-6 months] [6-12 months] [Over 1 year]
6. conditionControl: [Well controlled] [Partially] [Poorly]
7. sideEffects: [None] [Mild] [Moderate] [Severe]
8. recentChanges: [No] [Yes] → if yes, changeDetails (text)
9. takingAsDirected: [Yes] [No]

FLAGS to set:
- treatmentDuration = "under_3_months": flag "new_medication_concern"
- lastReviewDate = "over_1_year": flag "overdue_review"
- conditionControl = "poorly": flag "poor_control"
- sideEffects in ["moderate", "severe"]: flag "side_effect_concern"

=== NEW PRESCRIPTION ===
Collect in order:
1. conditionCategory: [Skin] [Infection] [Respiratory] [Contraception] [Mental health] [Pain] [Gastro] [Other]
2. conditionDescription (text, max 200 chars)
3. conditionDuration: [Acute] [Recent] [Chronic] [Recurring]
4. triedBefore: [Yes] [No] → if yes, previousMedications (text)
5. hasAllergies: [Yes] [No] → if yes, allergyList (text)
6. takingOtherMeds: [Yes] [No] → if yes, currentMedications (text)
7. hasMedicationPreference: [Yes] [No] → if yes, preferredMedication (text)

FLAGS to set:
- conditionCategory = "mental_health": flag "requires_detailed_form"

=== GP CONSULT ===
Collect in order:
1. concernSummary (text, max 200 chars)
2. concernCategory: [New symptom] [Ongoing condition] [Test results] [Second opinion] [Preventive] [Mental health] [Sexual health] [Other]
3. urgency: [Routine] [Soon] [Urgent]
4. consultType: [Video] [Phone] [Async]
5. if symptoms: symptomList (text), symptomSeverity, symptomProgression: [Improving] [Stable] [Worsening]

FLAGS to set:
- urgency = "urgent" AND symptomSeverity = "severe": flag "urgent_severe"

=== SAFETY EXITS (Immediate) ===
Emergency keywords (chest pain, can't breathe, stroke, seizure, overdose):
→ STOP intake. Return emergency response. Set status: "safety_exit"

Crisis keywords (suicide, self-harm, want to die):
→ STOP intake. Return crisis support. Set status: "safety_exit"

Controlled substances (oxycodone, diazepam, alprazolam, zolpidem, cannabis, testosterone, etc.):
→ STOP intake. Explain cannot prescribe online. Set exclusion: "controlled_substance"

=== FORM TRANSITION ===
Set requiresFormTransition: true when:
- Medical certificate > 7 days
- Mental health new prescription
- Complex multi-condition case
- Poor control + severe side effects

Message: "This needs more detail. I'll take you to a form that captures everything."

=== OUTPUT FORMAT ===
After each response, include structured data:

\`\`\`intake_data
{
  "status": "in_progress" | "ready_for_review" | "requires_form" | "safety_exit",
  "service_type": "medical_certificate" | "repeat_prescription" | "new_prescription" | "general_consult",
  "collected": {
    // All fields collected so far, using exact field names from schema
  },
  "flags": [
    { "severity": "info|caution|urgent|blocker", "category": "string", "message": "string", "field": "string" }
  ],
  "exclusions": [],
  "requiresFormTransition": false,
  "turnCount": 1
}
\`\`\`

Set status: "ready_for_review" only when ALL required fields are collected.
Never auto-submit. Server validates everything.

=== CONFIRMATION (when ready) ===
Brief bullet summary, no prose:
"Ready for doctor review:
• [Service type]
• [Key field]: [value]
• [Key field]: [value]
[Submit] [Edit]"`

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { userId: clerkUserId } = await auth()
    
    if (clerkUserId) {
      const rateLimitResponse = await applyRateLimit(request, 'standard', clerkUserId)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }

    // Check for AI Gateway API key
    const apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_API_KEY
    if (!apiKey && !process.env.VERCEL) {
      log.error("VERCEL_AI_GATEWAY_API_KEY not configured")
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    }
    
    // Generate session ID for tracking
    const sessionId = request.headers.get('x-session-id') || `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const startTime = Date.now()

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

    // Extract latest user message early for logging
    const userMessages = messages.filter(m => m.role === "user")
    const latestUserMessage = userMessages[userMessages.length - 1]?.content || ""

    // HARD-BLOCK: Check for emergency/crisis keywords BEFORE calling AI
    const emergencyCheck = checkForEmergency(messages)
    if (emergencyCheck.blocked && emergencyCheck.response) {
      log.warn("Emergency keyword detected - blocking AI call", {
        reason: emergencyCheck.reason,
        userId: clerkUserId || "anonymous",
      })
      
      // Log safety block for audit
      const blockType = emergencyCheck.response.type === 'crisis_block' ? 'crisis' : 'emergency'
      await logSafetyBlock(
        sessionId,
        clerkUserId ?? undefined,
        blockType,
        latestUserMessage,
        'N/A - blocked before AI call'
      )
      
      // Return fixed response (not AI-generated) as a streaming-compatible format
      const responseText = `${emergencyCheck.response.message}\n\n${emergencyCheck.response.buttons.join(" ")}`
      return new Response(responseText, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // P1 FIX: Check for prompt injection in user messages
    
    const safetyCheck = checkAndSanitize(latestUserMessage, {
      endpoint: "chat-intake",
      userId: clerkUserId ?? undefined,
    })
    
    if (safetyCheck.blocked) {
      log.warn("Prompt injection blocked", {
        userId: clerkUserId || "anonymous",
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
      userId: clerkUserId || "anonymous",
      sessionId,
    })

    // Configure AI provider with Vercel AI Gateway
    const modelName = process.env.CHAT_INTAKE_MODEL || "gpt-4o-mini"
    const openai = createOpenAI({
      apiKey: apiKey,
      baseURL: process.env.VERCEL_AI_GATEWAY_URL || 'https://api.openai.com/v1',
    })

    // Stream the response
    const result = streamText({
      model: openai(modelName),
      system: SYSTEM_PROMPT,
      messages: sanitizedMessages,
      onFinish: async ({ text, usage }) => {
        const responseTime = Date.now() - startTime
        const detectedService = detectServiceType(text)
        const flags = extractFlags(text)
        
        // Log to audit trail
        await logAIInteraction({
          sessionId,
          patientId: clerkUserId ?? undefined,
          serviceType: detectedService,
          turnNumber: Math.ceil(messages.length / 2),
          userInput: latestUserMessage,
          aiOutput: text,
          inputTokens: usage?.totalTokens ? Math.floor(usage.totalTokens * 0.3) : undefined,
          outputTokens: usage?.totalTokens ? Math.floor(usage.totalTokens * 0.7) : undefined,
          responseTimeMs: responseTime,
          modelVersion: modelName,
          promptVersion: PROMPT_VERSION,
          safetyFlags: flags,
          wasBlocked: false,
        })
        
        // Track for analytics
        trackAIInteraction({
          sessionId,
          messageCount: messages.length + 1,
          serviceType: detectedService as 'med_cert' | 'repeat_rx' | 'new_rx' | 'consult' | null,
          turnNumber: Math.ceil(messages.length / 2),
          inputLength: latestUserMessage.length,
          outputLength: text.length,
          responseTimeMs: responseTime,
          hasFlags: flags.length > 0,
          flagTypes: flags,
          modelVersion: modelName,
          promptVersion: PROMPT_VERSION,
        }, clerkUserId ?? undefined)
      },
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

// Helper to detect service type from AI response
function detectServiceType(text: string): string | null {
  const match = text.match(/"service_type"\s*:\s*"([^"]+)"/)
  return match ? match[1] : null
}

// Helper to extract flags from AI response
function extractFlags(text: string): string[] {
  const flags: string[] = []
  const flagMatch = text.match(/"flags"\s*:\s*\[([^\]]*)/)
  if (flagMatch) {
    const categoryMatches = flagMatch[1].matchAll(/"category"\s*:\s*"([^"]+)"/g)
    for (const match of categoryMatches) {
      flags.push(match[1])
    }
  }
  return flags
}
