import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getModelWithConfig, isAIConfigured, AI_MODEL_CONFIG } from "@/lib/ai/provider"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createLogger } from "@/lib/observability/logger"
import { REVIEW_SUMMARY_PROMPT, FALLBACK_RESPONSES, PROMPT_VERSION } from "@/lib/ai/prompts"
import { logAIAudit } from "@/lib/ai/audit"
import { getCachedResponse, setCachedResponse } from "@/lib/ai/cache"

const log = createLogger("ai-review-summary")

/**
 * Doctor Review Summary Generator
 * 
 * Generates a concise 2-3 line clinical summary for doctors reviewing requests.
 * Helps doctors quickly understand the key information without reading all details.
 */

interface ReviewSummaryRequest {
  requestId: string
  requestType: "med_cert" | "repeat_rx" | "consult"
}

interface MedCertAnswers {
  certType?: string
  duration?: string
  selectedSymptoms?: string[]
  symptomDescription?: string
  additionalNotes?: string
  carerPatientName?: string
  carerRelationship?: string
  startDate?: string
  specificDateFrom?: string
  specificDateTo?: string
}

interface RepeatRxAnswers {
  medication?: {
    product_name?: string
    active_ingredients_raw?: string
  }
  indication?: string
  currentDose?: string
  lastPrescribed?: string
  stability?: string
  prescriber?: string
  doseChanged?: boolean
  sideEffects?: string
}

interface ConsultAnswers {
  consultReason?: string
  consultDetails?: string
  currentMedications?: string
}

export async function POST(req: NextRequest) {
  try {
    // P0 FIX: Add authentication - this endpoint exposes PHI
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      log.warn("Unauthorized review-summary attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const supabase = createServiceRoleClient()

    // Verify the user is a doctor
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("clerk_user_id", clerkUserId)
      .single()

    if (!profile || !["doctor", "admin"].includes(profile.role)) {
      log.warn("Non-doctor attempted review-summary", { userId: clerkUserId, role: profile?.role })
      return NextResponse.json({ error: "Forbidden - doctors only" }, { status: 403 })
    }

    // Apply rate limiting (sensitive tier - 20/hour)
    const rateLimitResponse = await applyRateLimit(req, "sensitive", clerkUserId ?? undefined)
    if (rateLimitResponse) {
      log.warn("Rate limited review-summary", { userId: clerkUserId })
      return rateLimitResponse
    }

    const body: ReviewSummaryRequest = await req.json()
    const { requestId, requestType } = body

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 })
    }

    // Fetch the intake data (intakes is single source of truth)
    const { data: intake, error } = await supabase
      .from("intakes")
      .select(`
        *,
        patient:profiles!patient_id (
          full_name,
          date_of_birth
        ),
        answers:intake_answers (
          answers
        )
      `)
      .eq("id", requestId)
      .single()

    if (error || !intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 })
    }

    const answers = intake.answers?.[0]?.answers || {}
    const patientName = intake.patient?.full_name || "Patient"
    const patientDob = intake.patient?.date_of_birth
    const patientAge = patientDob ? calculateAge(patientDob) : null

    // Build context based on request type
    let context = ""
    let prompt = ""

    if (requestType === "med_cert") {
      const medCertAnswers = answers as MedCertAnswers
      const isCarer = medCertAnswers.certType === "carer"
      
      context = `
Medical Certificate Request:
- Type: ${medCertAnswers.certType || "work"} ${isCarer ? `(caring for: ${medCertAnswers.carerPatientName})` : ""}
- Duration: ${medCertAnswers.duration || "1"} day(s)
- Start Date: ${medCertAnswers.startDate || medCertAnswers.specificDateFrom || "today"}
- Symptoms: ${medCertAnswers.selectedSymptoms?.join(", ") || "Not specified"}
- Description: ${medCertAnswers.symptomDescription || medCertAnswers.additionalNotes || "None provided"}
- Patient: ${patientName}${patientAge ? `, ${patientAge}yo` : ""}
`

      prompt = `You are a medical intake summarizer. Generate a brief 2-3 line clinical summary for a doctor reviewing this medical certificate request.

${context}

Write a concise summary that highlights:
1. Patient demographics and certificate type
2. Key symptoms/reason
3. Any notable flags or standard presentation

Use clinical shorthand where appropriate (e.g., "2/7" for 2 days, "yo" for years old).
Keep it factual and neutral. Do not make clinical recommendations.
Return ONLY the summary text, no labels or formatting.`

    } else if (requestType === "repeat_rx") {
      const rxAnswers = answers as RepeatRxAnswers
      
      context = `
Repeat Prescription Request:
- Medication: ${rxAnswers.medication?.product_name || "Unknown"}
- Active Ingredient: ${rxAnswers.medication?.active_ingredients_raw || "Unknown"}
- Indication: ${rxAnswers.indication || "Not specified"}
- Current Dose: ${rxAnswers.currentDose || "Not specified"}
- Last Prescribed: ${rxAnswers.lastPrescribed || "Unknown"}
- On stable dose: ${rxAnswers.stability || "Unknown"}
- Original Prescriber: ${rxAnswers.prescriber || "Unknown"}
- Dose Changed: ${rxAnswers.doseChanged ? "Yes" : "No"}
- Side Effects: ${rxAnswers.sideEffects || "None reported"}
- Patient: ${patientName}${patientAge ? `, ${patientAge}yo` : ""}
`

      prompt = `You are a medical intake summarizer. Generate a brief 2-3 line clinical summary for a doctor reviewing this repeat prescription request.

${context}

Write a concise summary that highlights:
1. Medication and indication
2. Stability and compliance indicators
3. Any flags (dose changes, side effects, etc.)

Use clinical shorthand where appropriate.
Keep it factual and neutral. Do not make clinical recommendations.
Return ONLY the summary text, no labels or formatting.`

    } else if (requestType === "consult") {
      const consultAnswers = answers as ConsultAnswers
      
      context = `
GP Consultation Request:
- Reason: ${consultAnswers.consultReason || "General"}
- Details: ${consultAnswers.consultDetails || "Not specified"}
- Current Medications: ${consultAnswers.currentMedications || "None listed"}
- Patient: ${patientName}${patientAge ? `, ${patientAge}yo` : ""}
`

      prompt = `You are a medical intake summarizer. Generate a brief 2-3 line clinical summary for a doctor reviewing this consultation request.

${context}

Write a concise summary that highlights:
1. Patient demographics and main concern
2. Key clinical details
3. Any relevant background

Use clinical shorthand where appropriate.
Keep it factual and neutral. Do not make clinical recommendations.
Return ONLY the summary text, no labels or formatting.`
    } else {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 })
    }

    // Check cache first
    const cached = await getCachedResponse<string>('reviewSummary', requestId)
    if (cached) {
      return NextResponse.json({
        summary: cached,
        requestId,
        requestType,
        cached: true,
      })
    }

    // Check AI configuration
    if (!isAIConfigured()) {
      return NextResponse.json({
        summary: FALLBACK_RESPONSES.reviewSummary,
        requestId,
        requestType,
        fallback: true,
      })
    }

    const startTime = Date.now()

    // Get model with clinical configuration
    const { model, temperature } = getModelWithConfig('clinical')

    // Generate summary
    const { text } = await generateText({
      model,
      system: REVIEW_SUMMARY_PROMPT,
      prompt,
      temperature,
    })

    const responseTime = Date.now() - startTime
    const summary = text.trim()

    // Cache the result
    await setCachedResponse('reviewSummary', requestId, summary)

    // Log to audit trail
    await logAIAudit({
      endpoint: 'review-summary',
      userId: profile.id,
      patientId: intake.patient_id,
      requestType: 'review_summary',
      inputPreview: context,
      outputPreview: summary,
      responseTimeMs: responseTime,
      modelVersion: AI_MODEL_CONFIG.clinical.model,
      metadata: {
        requestId,
        requestType,
        promptVersion: PROMPT_VERSION,
      },
    })

    log.info("Review summary generated", {
      requestId,
      doctorId: profile.id,
      responseTimeMs: responseTime,
    })

    return NextResponse.json({
      summary,
      requestId,
      requestType,
      promptVersion: PROMPT_VERSION,
    })
  } catch (error) {
    log.error("Failed to generate review summary", { error })
    return NextResponse.json({
      summary: FALLBACK_RESPONSES.reviewSummary,
      error: "AI generation failed",
      fallback: true,
    })
  }
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
