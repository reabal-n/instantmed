import { NextRequest, NextResponse } from "next/server"
import { streamText } from "ai"
import { getModelWithConfig, isAIConfigured, AI_MODEL_CONFIG } from "@/lib/ai/provider"
import { getApiAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { auth } from "@clerk/nextjs/server"
import { MED_CERT_DRAFT_PROMPT, FALLBACK_RESPONSES, PROMPT_VERSION } from "@/lib/ai/prompts"
import { logAIAudit } from "@/lib/ai/audit"
import { calculateConfidence } from "@/lib/ai/confidence"

const log = createLogger("ai-med-cert-draft")

/**
 * AI Medical Certificate Draft Generation
 * 
 * Features:
 * - Streaming response for better UX
 * - Temperature tuned for legal document accuracy (0.1)
 * - Audit logging for TGA compliance
 * - Confidence scoring for review guidance
 * - Fallback template if AI unavailable
 */

interface IntakeAnswers {
  certificate_type?: string
  symptoms?: string[]
  other_symptom_details?: string
  start_date?: string
  end_date?: string
  duration_days?: number
  carer_person_name?: string
  carer_relationship?: string
  [key: string]: unknown
}

interface PatientInfo {
  fullName: string
  dateOfBirth?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Rate limiting
    const { userId: clerkUserId } = await auth()
    
    if (clerkUserId) {
      const rateLimitResponse = await applyRateLimit(request, 'sensitive', clerkUserId)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }
    
    // Require doctor authentication
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { profile } = authResult

    // Parse request body
    const body = await request.json()
    const { intakeId, answers, patient, patientId } = body as { 
      intakeId?: string
      answers?: IntakeAnswers
      patient?: PatientInfo
      patientId?: string
    }

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { success: false, error: "No intake answers provided", draft: null },
        { status: 400 }
      )
    }

    if (!patient?.fullName) {
      return NextResponse.json(
        { success: false, error: "Patient name required", draft: null },
        { status: 400 }
      )
    }

    // Format context for the prompt
    const context = formatMedCertContext(answers, patient)

    // Check for AI configuration - return fallback if not configured
    if (!isAIConfigured()) {
      log.warn("AI not configured, returning fallback template")
      return NextResponse.json({
        success: true,
        draft: FALLBACK_RESPONSES.medCertDraft,
        isDraft: true,
        isFallback: true,
        generatedAt: new Date().toISOString(),
        generatedBy: "template",
        requiresApproval: true,
      })
    }

    // Get model with clinical configuration (low temperature for accuracy)
    const { model, temperature } = getModelWithConfig('clinical')

    // Generate med cert draft with streaming
    const result = await streamText({
      model,
      system: MED_CERT_DRAFT_PROMPT,
      prompt: `Generate a medical certificate statement for:\n\n${context}`,
      temperature,
    })

    const text = await result.text
    const responseTime = Date.now() - startTime

    // Calculate confidence score
    const confidence = calculateConfidence(text, { 
      patientName: patient.fullName,
      startDate: answers.start_date,
      symptoms: answers.symptoms,
    })

    // Log to audit trail
    await logAIAudit({
      endpoint: 'med-cert-draft',
      userId: profile.id,
      patientId,
      requestType: 'med_cert_draft',
      inputPreview: context,
      outputPreview: text,
      responseTimeMs: responseTime,
      modelVersion: AI_MODEL_CONFIG.clinical.model,
      confidence: confidence.score,
      metadata: {
        intakeId,
        certificateType: answers.certificate_type,
        promptVersion: PROMPT_VERSION,
      },
    })

    log.info("Med cert draft generated", { 
      intakeId, 
      doctorId: profile.id,
      certificateType: answers.certificate_type,
      draftLength: text.length,
      confidence: confidence.score,
      responseTimeMs: responseTime,
    })

    return NextResponse.json({
      success: true,
      draft: text,
      isDraft: true,
      generatedAt: new Date().toISOString(),
      generatedBy: "ai",
      requiresApproval: true,
      metadata: {
        certificateType: answers.certificate_type,
        startDate: answers.start_date,
        endDate: answers.end_date,
        durationDays: answers.duration_days,
      },
      confidence: {
        score: confidence.score,
        level: confidence.level,
        flaggedSections: confidence.flaggedSections,
      },
      promptVersion: PROMPT_VERSION,
    })

  } catch (error) {
    log.error("Error generating med cert draft", { error })
    
    // Return fallback on error
    return NextResponse.json({
      success: true,
      draft: FALLBACK_RESPONSES.medCertDraft,
      isDraft: true,
      isFallback: true,
      error: "AI generation failed, template provided",
      generatedAt: new Date().toISOString(),
      generatedBy: "template",
      requiresApproval: true,
    })
  }
}

function formatMedCertContext(answers: IntakeAnswers, patient: PatientInfo): string {
  const lines: string[] = []

  lines.push(`Patient Name: ${patient.fullName}`)
  
  if (patient.dateOfBirth) {
    lines.push(`Date of Birth: ${patient.dateOfBirth}`)
  }

  lines.push(`Consultation Date: ${new Date().toLocaleDateString("en-AU")}`)

  if (answers.certificate_type) {
    const typeLabels: Record<string, string> = {
      work: "Work/Normal Duties",
      study: "Study/University",
      carer: "Carer's Certificate"
    }
    lines.push(`Certificate Type: ${typeLabels[answers.certificate_type] || answers.certificate_type}`)
  }

  if (answers.start_date) {
    lines.push(`Absence Start Date: ${answers.start_date}`)
  }

  if (answers.end_date) {
    lines.push(`Absence End Date: ${answers.end_date}`)
  }

  if (answers.duration_days) {
    lines.push(`Duration: ${answers.duration_days} day(s)`)
  }

  if (answers.symptoms && answers.symptoms.length > 0) {
    lines.push(`Reported Symptoms: ${answers.symptoms.join(", ")}`)
  }

  if (answers.other_symptom_details) {
    lines.push(`Additional Details: ${answers.other_symptom_details}`)
  }

  // Carer-specific fields
  if (answers.certificate_type === "carer") {
    if (answers.carer_person_name) {
      lines.push(`Person Being Cared For: ${answers.carer_person_name}`)
    }
    if (answers.carer_relationship) {
      lines.push(`Relationship: ${answers.carer_relationship}`)
    }
  }

  return lines.join("\n")
}
