"use server"

/**
 * Server Action: Generate AI Drafts for Intake
 * 
 * Generates clinical note and med cert drafts using AI.
 * Idempotent - skips if drafts already exist (unless force=true).
 * Called after payment is confirmed via Stripe webhook.
 */

import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { env } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { upsertDraft, draftsExist, deleteDrafts } from "@/lib/ai/drafts"
import { safeParseClinicalNoteOutput, safeParseMedCertDraftOutput } from "@/lib/ai/schemas"
import { validateClinicalNoteAgainstIntake, validateMedCertAgainstIntake } from "@/lib/ai/validation"

const log = createLogger("generate-drafts")

// Type helper for AI SDK usage (varies by version)
interface AIUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

function getUsage(usage: unknown): AIUsage {
  if (!usage || typeof usage !== 'object') return {}
  const u = usage as Record<string, unknown>
  return {
    promptTokens: typeof u.promptTokens === 'number' ? u.promptTokens : undefined,
    completionTokens: typeof u.completionTokens === 'number' ? u.completionTokens : undefined,
  }
}

// Service client for server-side operations
function getServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
}

export interface GenerateDraftsResult {
  success: boolean
  skipped?: boolean
  clinicalNote?: { status: "ready" | "failed"; error?: string }
  medCert?: { status: "ready" | "failed"; error?: string }
  error?: string
}

// Prompt for clinical note generation (JSON output)
const CLINICAL_NOTE_JSON_PROMPT = `You are a medical documentation assistant helping Australian GPs write clinical notes.

Generate a concise clinical note based on the patient intake information provided.

IMPORTANT RULES:
- This is a DRAFT note for doctor review only
- Use professional medical terminology appropriate for Australian healthcare
- Be factual and objective - only include information from the intake
- Do not make clinical diagnoses - that's for the reviewing doctor
- Do not mention specific disease names (covid, influenza, etc.) - use general terms
- Do not recommend or mention any medications

OUTPUT: Return ONLY valid JSON (no markdown, no explanation) matching this exact structure:
{
  "presentingComplaint": "Brief summary of symptoms/reason for consultation",
  "historyOfPresentIllness": "Details from intake including duration, symptom specifics",
  "relevantInformation": "Any additional context from intake answers",
  "certificateDetails": "If medical certificate: type, dates, duration",
  "flags": {
    "requiresReview": false,
    "flagReason": null
  }
}`

// Prompt for med cert draft generation (JSON output)
const MED_CERT_JSON_PROMPT = `You are a medical documentation assistant helping Australian GPs draft medical certificates.

Generate a professional medical certificate draft based on the patient information provided.

IMPORTANT RULES:
- This is a DRAFT for doctor review only
- Use standard Australian medical certificate language
- Do not include specific diagnoses - just "medical condition"
- Do not mention specific disease names (covid, influenza, etc.)
- Do not recommend or mention any medications
- Set requiresReview to true if duration > 3 days OR backdated > 3 days

OUTPUT: Return ONLY valid JSON (no markdown, no explanation) matching this exact structure:
{
  "certificateStatement": "This is to certify that [Patient Name] attended a telehealth consultation on [Date]. In my opinion, they were suffering from a medical condition and were unfit for [work/study] from [Start Date] to [End Date] inclusive ([X] days).",
  "symptomsSummary": "2-3 word general symptom category (e.g., 'Upper respiratory symptoms')",
  "clinicalNotes": "1-2 sentence clinical observation based on intake",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "durationDays": 1,
  "certificateType": "work",
  "flags": {
    "requiresReview": false,
    "flagReason": null
  }
}`

/**
 * Generate AI drafts for an intake
 * 
 * @param intakeId - The intake ID to generate drafts for
 * @param force - If true, regenerate even if drafts exist
 */
export async function generateDraftsForIntake(
  intakeId: string,
  force: boolean = false
): Promise<GenerateDraftsResult> {
  const startTime = Date.now()
  
  log.info("Starting draft generation", { intakeId, force })

  try {
    // Check idempotency - skip if drafts already exist
    if (!force) {
      const exists = await draftsExist(intakeId)
      if (exists) {
        log.info("Drafts already exist, skipping", { intakeId })
        return { success: true, skipped: true }
      }
    } else {
      // Force regenerate - delete existing drafts
      await deleteDrafts(intakeId)
    }

    // Fetch intake with answers
    const supabase = getServiceClient()
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        *,
        patient:profiles!patient_id(
          id,
          full_name,
          date_of_birth
        ),
        service:services!service_id(
          slug,
          type,
          name
        ),
        answers:intake_answers(
          answers
        )
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      log.error("Intake not found", { intakeId }, intakeError)
      return { success: false, error: "Intake not found" }
    }

    // Only generate drafts for medical certificate service
    const service = intake.service as { slug: string; type: string; name: string } | null
    if (!service || service.type !== "med_certs") {
      log.info("Not a med cert service, skipping draft generation", { 
        intakeId, 
        serviceType: service?.type 
      })
      return { success: true, skipped: true }
    }

    const patient = intake.patient as { id: string; full_name: string; date_of_birth: string | null } | null
    const answersArray = intake.answers as { answers: Record<string, unknown> }[] | null
    const answers = answersArray?.[0]?.answers || {}

    // Prepare intake context for AI
    const intakeContext = formatIntakeContext(intake, patient, answers)
    
    // Generate both drafts in parallel
    const [clinicalNoteResult, medCertResult] = await Promise.all([
      generateClinicalNoteDraft(intakeId, intakeContext, answers),
      generateMedCertDraft(intakeId, intakeContext, answers, patient?.full_name || "Patient"),
    ])

    const duration = Date.now() - startTime
    log.info("Draft generation completed", {
      intakeId,
      durationMs: duration,
      clinicalNote: clinicalNoteResult.status,
      medCert: medCertResult.status,
    })

    return {
      success: true,
      clinicalNote: clinicalNoteResult,
      medCert: medCertResult,
    }

  } catch (error) {
    log.error("Unexpected error in draft generation", { intakeId }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Generate clinical note draft
 */
async function generateClinicalNoteDraft(
  intakeId: string,
  intakeContext: string,
  answers: Record<string, unknown>
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const startTime = Date.now()
  
  try {
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      system: CLINICAL_NOTE_JSON_PROMPT,
      prompt: intakeContext,
    })

    const durationMs = Date.now() - startTime

    // Parse and validate AI output
    const parseResult = safeParseClinicalNoteOutput(result.text)
    
    if (!parseResult.success) {
      log.error("Clinical note validation failed", {
        intakeId,
        error: parseResult.error,
        zodErrors: parseResult.zodErrors,
      })
      
      await upsertDraft({
        intakeId,
        type: "clinical_note",
        content: { raw: result.text },
        status: "failed",
        error: parseResult.error,
        promptTokens: getUsage(result.usage).promptTokens,
        completionTokens: getUsage(result.usage).completionTokens,
        generationDurationMs: durationMs,
        validationErrors: parseResult.zodErrors,
      })
      
      return { status: "failed", error: parseResult.error }
    }

    // Ground-truth validation
    const groundTruth = validateClinicalNoteAgainstIntake(parseResult.data!, answers as never)
    
    if (!groundTruth.valid) {
      log.warn("Clinical note ground-truth validation failed", {
        intakeId,
        errors: groundTruth.errors,
      })
      
      await upsertDraft({
        intakeId,
        type: "clinical_note",
        content: parseResult.data!,
        status: "failed",
        error: "Ground-truth validation failed",
        promptTokens: getUsage(result.usage).promptTokens,
        completionTokens: getUsage(result.usage).completionTokens,
        generationDurationMs: durationMs,
        groundTruthErrors: groundTruth.errors,
      })
      
      return { status: "failed", error: "Ground-truth validation failed" }
    }

    // Save successful draft
    await upsertDraft({
      intakeId,
      type: "clinical_note",
      content: parseResult.data!,
      status: "ready",
      promptTokens: getUsage(result.usage).promptTokens,
      completionTokens: getUsage(result.usage).completionTokens,
      generationDurationMs: durationMs,
    })

    log.info("Clinical note draft generated", {
      intakeId,
      durationMs,
      promptTokens: getUsage(result.usage).promptTokens,
      completionTokens: getUsage(result.usage).completionTokens,
    })

    return { status: "ready" }

  } catch (error) {
    log.error("Clinical note generation error", { intakeId }, error)
    
    await upsertDraft({
      intakeId,
      type: "clinical_note",
      content: {},
      status: "failed",
      error: error instanceof Error ? error.message : "Generation failed",
    })
    
    return { status: "failed", error: error instanceof Error ? error.message : "Generation failed" }
  }
}

/**
 * Generate med cert draft
 */
async function generateMedCertDraft(
  intakeId: string,
  intakeContext: string,
  answers: Record<string, unknown>,
  patientName: string
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const startTime = Date.now()
  
  try {
    const prompt = `${intakeContext}\n\nPatient Name: ${patientName}`
    
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      system: MED_CERT_JSON_PROMPT,
      prompt,
    })

    const durationMs = Date.now() - startTime

    // Parse and validate AI output
    const parseResult = safeParseMedCertDraftOutput(result.text)
    
    if (!parseResult.success) {
      log.error("Med cert validation failed", {
        intakeId,
        error: parseResult.error,
        zodErrors: parseResult.zodErrors,
      })
      
      await upsertDraft({
        intakeId,
        type: "med_cert",
        content: { raw: result.text },
        status: "failed",
        error: parseResult.error,
        promptTokens: getUsage(result.usage).promptTokens,
        completionTokens: getUsage(result.usage).completionTokens,
        generationDurationMs: durationMs,
        validationErrors: parseResult.zodErrors,
      })
      
      return { status: "failed", error: parseResult.error }
    }

    // Ground-truth validation
    const groundTruth = validateMedCertAgainstIntake(parseResult.data!, answers as never)
    
    if (!groundTruth.valid) {
      log.warn("Med cert ground-truth validation failed", {
        intakeId,
        errors: groundTruth.errors,
      })
      
      await upsertDraft({
        intakeId,
        type: "med_cert",
        content: parseResult.data!,
        status: "failed",
        error: "Ground-truth validation failed",
        promptTokens: getUsage(result.usage).promptTokens,
        completionTokens: getUsage(result.usage).completionTokens,
        generationDurationMs: durationMs,
        groundTruthErrors: groundTruth.errors,
      })
      
      return { status: "failed", error: "Ground-truth validation failed" }
    }

    // Save successful draft
    await upsertDraft({
      intakeId,
      type: "med_cert",
      content: parseResult.data!,
      status: "ready",
      promptTokens: getUsage(result.usage).promptTokens,
      completionTokens: getUsage(result.usage).completionTokens,
      generationDurationMs: durationMs,
    })

    log.info("Med cert draft generated", {
      intakeId,
      durationMs,
      promptTokens: getUsage(result.usage).promptTokens,
      completionTokens: getUsage(result.usage).completionTokens,
    })

    return { status: "ready" }

  } catch (error) {
    log.error("Med cert generation error", { intakeId }, error)
    
    await upsertDraft({
      intakeId,
      type: "med_cert",
      content: {},
      status: "failed",
      error: error instanceof Error ? error.message : "Generation failed",
    })
    
    return { status: "failed", error: error instanceof Error ? error.message : "Generation failed" }
  }
}

/**
 * Format intake data for AI context
 */
function formatIntakeContext(
  intake: Record<string, unknown>,
  patient: { full_name: string; date_of_birth: string | null } | null,
  answers: Record<string, unknown>
): string {
  const parts: string[] = []

  if (patient) {
    parts.push(`Patient: ${patient.full_name}`)
    if (patient.date_of_birth) {
      parts.push(`DOB: ${patient.date_of_birth}`)
    }
  }

  parts.push(`Request Date: ${new Date().toISOString().split("T")[0]}`)

  // Extract relevant answer fields
  if (answers.certificateType) {
    parts.push(`Certificate Type: ${answers.certificateType}`)
  }
  
  if (answers.startDate) {
    parts.push(`Start Date: ${answers.startDate}`)
  }
  
  if (answers.endDate) {
    parts.push(`End Date: ${answers.endDate}`)
  }
  
  if (answers.durationDays) {
    parts.push(`Duration: ${answers.durationDays} day(s)`)
  } else if (answers.duration) {
    parts.push(`Duration: ${answers.duration}`)
  }

  if (answers.symptoms && Array.isArray(answers.symptoms)) {
    parts.push(`Symptoms: ${answers.symptoms.join(", ")}`)
  }

  if (answers.otherSymptomDetails) {
    parts.push(`Additional Symptoms: ${answers.otherSymptomDetails}`)
  }

  if (answers.reason) {
    parts.push(`Reason: ${answers.reason}`)
  }

  // Legacy fields
  if (answers.specificDateFrom) {
    parts.push(`Start Date: ${answers.specificDateFrom}`)
  }
  
  if (answers.specificDateTo) {
    parts.push(`End Date: ${answers.specificDateTo}`)
  }

  return parts.join("\n")
}
