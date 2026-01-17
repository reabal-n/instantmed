import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { defaultModel } from "@/lib/ai/provider"
import { requireAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createClient } from "@/lib/supabase/server"

const log = createLogger("ai-decline-reason")

/**
 * AI Decline Reason Generation
 * 
 * Generates a compassionate, professional decline reason for patient communication.
 * IMPORTANT: This is a DRAFT only - requires doctor review and approval
 * before sending to patient.
 */

const DECLINE_REASON_PROMPT = `You are helping an Australian GP write a compassionate decline message for a telehealth patient.

The doctor has decided not to approve this request. Generate a brief, professional message that:

1. Is empathetic and respectful
2. Does NOT reveal specific clinical reasoning (privacy/liability)
3. Suggests appropriate next steps (visit local GP, call healthdirect 1800 022 222 if urgent)
4. Maintains the patient's dignity
5. Is concise (2-3 sentences max)
6. Uses Australian English spelling

NEVER include:
- Specific diagnoses or clinical judgments
- Anything that could be seen as medical advice
- Promises or guarantees

Example tone:
"Unfortunately, your request couldn't be approved through our online service. For your situation, we recommend speaking with a GP in person who can conduct a proper examination. If you're concerned, healthdirect (1800 022 222) can provide guidance."`

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.id) {
      const rateLimitResponse = await applyRateLimit(request, 'sensitive', user.id)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }
    
    // Require doctor authentication
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for AI Gateway API key (or OIDC on Vercel)
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL) {
      log.error("AI_GATEWAY_API_KEY not configured")
      return NextResponse.json(
        { success: false, error: "AI service not configured", reason: null },
        { status: 503 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { requestType, internalReason } = body as { 
      requestType?: string
      internalReason?: string 
    }

    // Generate decline reason via Vercel AI Gateway
    const { text } = await generateText({
      model: defaultModel,
      system: DECLINE_REASON_PROMPT,
      prompt: `Generate a patient-facing decline message for a ${requestType || "telehealth"} request.${internalReason ? `\n\nInternal context (DO NOT include in message): ${internalReason}` : ""}`,
    })

    log.info("Decline reason generated", { 
      doctorId: profile.id,
      requestType,
      reasonLength: text.length 
    })

    return NextResponse.json({
      success: true,
      reason: text,
      isDraft: true,
      generatedAt: new Date().toISOString(),
      generatedBy: "ai",
      requiresApproval: true,
    })

  } catch (error) {
    log.error("Error generating decline reason", { error })
    return NextResponse.json(
      { success: false, error: "Failed to generate reason", reason: null },
      { status: 500 }
    )
  }
}
