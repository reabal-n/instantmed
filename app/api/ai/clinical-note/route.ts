import { NextRequest, NextResponse } from "next/server"
import { streamText } from "ai"
import { getModelWithConfig, isAIConfigured, AI_MODEL_CONFIG } from "@/lib/ai/provider"
import { getApiAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { FORBIDDEN_DIAGNOSIS_TERMS, FORBIDDEN_MEDICATION_TERMS } from "@/lib/ai/validation/ground-truth"
import { checkPromptInjection } from "@/lib/ai/prompt-safety"
import { CLINICAL_NOTE_PROMPT, FALLBACK_RESPONSES, PROMPT_VERSION } from "@/lib/ai/prompts"
import { logAIAudit } from "@/lib/ai/audit"
import { calculateConfidence } from "@/lib/ai/confidence"

const log = createLogger("ai-clinical-note")

/**
 * AI Clinical Note Generation
 * 
 * Generates a draft clinical note from patient intake answers.
 * IMPORTANT: This is a DRAFT only - requires doctor review and approval
 * before any patient-facing use.
 * 
 * Features:
 * - Streaming response for better UX
 * - Temperature tuned for clinical accuracy (0.1)
 * - Audit logging for TGA compliance
 * - Confidence scoring for review guidance
 * - Fallback response if AI unavailable
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
  hasAllergies?: boolean
  has_allergies?: boolean
  allergyDetails?: string
  allergy_details?: string
  allergies?: string
  currentMedications?: string
  current_medications?: string
  medicalConditions?: string
  medical_conditions?: string
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Rate limiting BEFORE auth - protect against unauthenticated abuse
    const ipRateLimitResponse = await applyRateLimit(request, 'sensitive')
    if (ipRateLimitResponse) {
      return ipRateLimitResponse
    }
    
    // Require doctor authentication
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { profile } = authResult

    // Check for AI configuration
    if (!isAIConfigured()) {
      log.error("AI not configured")
      // Return fallback response instead of error
      return NextResponse.json({
        success: true,
        note: FALLBACK_RESPONSES.clinicalNote,
        isDraft: true,
        isFallback: true,
        generatedAt: new Date().toISOString(),
        generatedBy: "template",
        requiresApproval: true,
      })
    }

    // Parse request body
    const body = await request.json()
    const { intakeId, answers, patientId } = body as { 
      intakeId?: string
      answers?: IntakeAnswers
      patientId?: string 
    }

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { success: false, error: "No intake answers provided", note: null },
        { status: 400 }
      )
    }

    // Format intake data for the prompt
    const intakeContext = formatIntakeForPrompt(answers)

    // Check for prompt injection attempts in intake answers
    const injectionCheck = checkPromptInjection(intakeContext)
    if (!injectionCheck.isSafe) {
      log.warn("Potential prompt injection detected in clinical note request", {
        intakeId,
        detectedPatterns: injectionCheck.detectedPatterns,
        riskLevel: injectionCheck.riskLevel,
      })
      return NextResponse.json(
        { success: false, error: "Invalid input detected", note: null },
        { status: 400 }
      )
    }

    // Get model with clinical configuration (low temperature for accuracy)
    const { model, temperature } = getModelWithConfig('clinical')

    // Generate clinical note with streaming for better UX
    const result = await streamText({
      model,
      system: CLINICAL_NOTE_PROMPT,
      prompt: `Generate a clinical note based on this patient intake:\n\n${intakeContext}`,
      temperature,
    })

    // Collect full text from stream
    const text = await result.text
    const responseTime = Date.now() - startTime

    // Validate AI output for forbidden terms (hallucination prevention)
    const textLower = text.toLowerCase()
    const validationErrors: string[] = []
    
    for (const term of FORBIDDEN_DIAGNOSIS_TERMS) {
      if (textLower.includes(term.toLowerCase())) {
        validationErrors.push(`Contains forbidden diagnosis term: "${term}"`)
      }
    }
    
    for (const term of FORBIDDEN_MEDICATION_TERMS) {
      if (textLower.includes(term.toLowerCase())) {
        validationErrors.push(`Contains forbidden medication term: "${term}"`)
      }
    }
    
    const validationPassed = validationErrors.length === 0
    
    // Calculate confidence score
    const confidence = calculateConfidence(text, answers)
    
    if (!validationPassed) {
      log.warn("Clinical note failed ground-truth validation", {
        intakeId,
        errors: validationErrors,
      })
    }

    // Log to audit trail
    await logAIAudit({
      endpoint: 'clinical-note',
      userId: profile.id,
      patientId,
      requestType: 'clinical_note',
      inputPreview: intakeContext,
      outputPreview: text,
      responseTimeMs: responseTime,
      modelVersion: AI_MODEL_CONFIG.clinical.model,
      confidence: confidence.score,
      metadata: {
        intakeId,
        validationPassed,
        promptVersion: PROMPT_VERSION,
      },
    })

    log.info("Clinical note generated", { 
      intakeId, 
      doctorId: profile.id,
      noteLength: text.length,
      validationPassed,
      confidence: confidence.score,
      responseTimeMs: responseTime,
    })

    return NextResponse.json({
      success: true,
      note: text,
      isDraft: true,
      generatedAt: new Date().toISOString(),
      generatedBy: "ai",
      requiresApproval: true,
      validation: {
        passed: validationPassed,
        errors: validationErrors.length > 0 ? validationErrors : undefined,
      },
      confidence: {
        score: confidence.score,
        level: confidence.level,
        flaggedSections: confidence.flaggedSections,
      },
      promptVersion: PROMPT_VERSION,
    })

  } catch (error) {
    log.error("Error generating clinical note", { error })
    
    // Return fallback on error
    return NextResponse.json({
      success: true,
      note: FALLBACK_RESPONSES.clinicalNote,
      isDraft: true,
      isFallback: true,
      error: "AI generation failed, template provided",
      generatedAt: new Date().toISOString(),
      generatedBy: "template",
      requiresApproval: true,
    })
  }
}

function formatIntakeForPrompt(answers: IntakeAnswers): string {
  const lines: string[] = []

  if (answers.certificate_type) {
    lines.push(`Certificate Type: ${answers.certificate_type}`)
  }

  if (answers.symptoms && answers.symptoms.length > 0) {
    lines.push(`Symptoms: ${answers.symptoms.join(", ")}`)
  }

  if (answers.other_symptom_details) {
    lines.push(`Additional Symptom Details: ${answers.other_symptom_details}`)
  }

  if (answers.start_date) {
    lines.push(`Start Date: ${answers.start_date}`)
  }

  if (answers.end_date) {
    lines.push(`End Date: ${answers.end_date}`)
  }

  if (answers.duration_days) {
    lines.push(`Duration: ${answers.duration_days} day(s)`)
  }

  if (answers.carer_person_name) {
    lines.push(`Caring for: ${answers.carer_person_name}`)
  }

  if (answers.carer_relationship) {
    lines.push(`Relationship: ${answers.carer_relationship}`)
  }

  // Clinical history fields
  if (answers.hasAllergies === true || answers.has_allergies === true) {
    const allergyDetail = answers.allergyDetails || answers.allergy_details || answers.allergies
    lines.push(`Allergies: ${allergyDetail ? String(allergyDetail) : "Yes (not specified)"}`)
  } else if (answers.hasAllergies === false || answers.has_allergies === false) {
    lines.push("Allergies: Nil known")
  }

  if (answers.currentMedications || answers.current_medications) {
    lines.push(`Current Medications: ${String(answers.currentMedications || answers.current_medications)}`)
  }

  if (answers.medicalConditions || answers.medical_conditions) {
    lines.push(`Medical Conditions: ${String(answers.medicalConditions || answers.medical_conditions)}`)
  }

  // Include any other relevant fields
  const excludedKeys = [
    'certificate_type', 'symptoms', 'other_symptom_details',
    'start_date', 'end_date', 'duration_days',
    'carer_person_name', 'carer_relationship',
    'hasAllergies', 'has_allergies', 'allergyDetails', 'allergy_details', 'allergies',
    'currentMedications', 'current_medications',
    'medicalConditions', 'medical_conditions',
    'emergency_disclaimer_confirmed', 'emergency_disclaimer_timestamp',
    'patient_confirmed_accurate', 'patient_confirmed_timestamp',
    'template_version', 'submitted_at'
  ]

  for (const [key, value] of Object.entries(answers)) {
    if (!excludedKeys.includes(key) && value !== null && value !== undefined) {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      lines.push(`${formattedKey}: ${String(value)}`)
    }
  }

  return lines.join("\n")
}
