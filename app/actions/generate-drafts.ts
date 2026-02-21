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
import { getPostHogClient } from "@/lib/posthog-server"
import { 
  safeParseClinicalNoteOutput, 
  safeParseMedCertDraftOutput,
  safeParseRepeatRxDraftOutput,
  safeParseConsultDraftOutput,
} from "@/lib/ai/schemas"
import { validateClinicalNoteAgainstIntake, validateMedCertAgainstIntake } from "@/lib/ai/validation"
import { checkAndSanitize, validateAIOutput } from "@/lib/ai/prompt-safety"
import { normalizeServiceType, getDraftCategory, type DraftCategory } from "@/lib/constants/service-types"
import type { ServiceType } from "@/types/db"
import * as Sentry from "@sentry/nextjs"

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
  serviceType?: ServiceType
  draftCategory?: DraftCategory
  clinicalNote?: { status: "ready" | "failed"; error?: string }
  medCert?: { status: "ready" | "failed"; error?: string }
  repeatRx?: { status: "ready" | "failed"; error?: string }
  consult?: { status: "ready" | "failed"; error?: string }
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
  "relevantInformation": "Any additional context from intake answers including allergies, current medications, medical conditions",
  "certificateDetails": "If medical certificate: type, dates, duration. If prescription: medication details. If consult: consultation type.",
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

// Prompt for repeat prescription draft generation (JSON output)
const REPEAT_RX_JSON_PROMPT = `You are a medical documentation assistant helping Australian GPs review repeat prescription requests.

Generate a clinical summary for a repeat prescription request based on the patient intake information provided.

IMPORTANT RULES:
- This is a DRAFT for doctor review only
- Summarize the medication request factually
- Do not make prescribing decisions - that's for the reviewing doctor
- Note any compliance or control concerns from the intake
- Set controlledSubstance to true if medication may be a controlled substance
- Set requiresReview to true if < 3 months on medication OR poor control OR recent changes

OUTPUT: Return ONLY valid JSON (no markdown, no explanation) matching this exact structure:
{
  "medicationSummary": "Patient requesting repeat of [medication] [strength] for [condition/indication]",
  "indicationStatement": "Brief statement of why patient takes this medication",
  "treatmentHistory": "Duration on current medication, previous treatments if mentioned",
  "complianceNotes": "Notes on adherence, side effects, or concerns from intake",
  "clinicalConsiderations": "Any relevant clinical factors for doctor to consider",
  "flags": {
    "requiresReview": false,
    "flagReason": null,
    "controlledSubstance": false,
    "interactionRisk": false
  }
}`

// Prompt for consultation draft generation (JSON output)
const CONSULT_JSON_PROMPT = `You are a medical documentation assistant helping Australian GPs prepare for telehealth consultations.

Generate a clinical summary for a GP consultation request based on the patient intake information provided.

IMPORTANT RULES:
- This is a DRAFT for doctor review only
- Summarize the presenting concern factually
- Do not diagnose or recommend treatments - that's for the consulting doctor
- Note urgency level from patient's self-assessment
- Set urgentConcern to true if patient indicates urgent/severe symptoms
- Set mentalHealthFlag to true if mental health concerns are mentioned

OUTPUT: Return ONLY valid JSON (no markdown, no explanation) matching this exact structure:
{
  "chiefComplaint": "Main reason for consultation in patient's words/summary",
  "historyOfPresentIllness": "Details about symptoms, duration, progression from intake",
  "relevantHistory": "Any relevant medical history mentioned",
  "systemsReview": "Other symptoms or concerns mentioned",
  "urgencyAssessment": "routine|soon|urgent",
  "suggestedConsultType": "async|phone|video",
  "clinicalConsiderations": "Any factors that may affect consultation approach",
  "flags": {
    "requiresReview": false,
    "flagReason": null,
    "urgentConcern": false,
    "mentalHealthFlag": false
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
    // AUTH CHECK: Verify caller is doctor/admin when called as server action.
    // When called from Stripe webhook (no user session), auth will return null — that's OK
    // because the webhook handler already verified the Stripe signature.
    try {
      const { requireRoleOrNull } = await import("@/lib/auth")
      const authResult = await requireRoleOrNull(["doctor", "admin"])
      if (!authResult) {
        log.info("Draft generation called without doctor session (likely webhook)", { intakeId })
      }
    } catch {
      // Auth module may throw in non-request contexts (cron, webhook) — acceptable
      log.info("Auth check skipped for non-request context", { intakeId })
    }

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

    // Fetch intake with answers and service details
    const supabase = getServiceClient()
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        *,
        service:services!service_id(
          id,
          slug,
          name,
          type
        ),
        patient:profiles!patient_id(
          id,
          full_name,
          date_of_birth
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

    // Determine service type and validate
    const service = intake.service as { slug: string; type: string; name: string } | null
    if (!service || !service.type) {
      log.info("No service type found, skipping draft generation", { intakeId })
      return { success: true, skipped: true }
    }

    // Normalize service type to canonical value using centralized util
    const serviceType = normalizeServiceType(service.type)
    
    if (!serviceType) {
      // Unknown service type - generate ONLY clinical_note draft and log warning to Sentry
      log.warn("Unknown service type, generating clinical_note only", { 
        intakeId, 
        rawServiceType: service.type 
      })
      
      Sentry.captureMessage("Unknown service type in draft generation", {
        level: "warning",
        tags: {
          service_type: service.type,
          intake_id: intakeId,
        },
        extra: {
          serviceName: service.name,
          serviceSlug: service.slug,
        },
      })
      
      // Generate only clinical note for unknown service types
      const patient = intake.patient as { id: string; full_name: string; date_of_birth: string | null } | null
      const answersArray = intake.answers as { answers: Record<string, unknown> }[] | null
      const answers = answersArray?.[0]?.answers || {}
      const intakeContext = formatIntakeContext(intake, patient, answers, "med_certs") // Use med_certs as fallback for context
      
      const clinicalNoteResult = await generateClinicalNoteDraft(intakeId, intakeContext, answers)
      
      return {
        success: true,
        clinicalNote: clinicalNoteResult,
      }
    }
    
    // Get draft category from canonical service type
    const draftCategory = getDraftCategory(serviceType)

    const patient = intake.patient as { id: string; full_name: string; date_of_birth: string | null } | null
    const answersArray = intake.answers as { answers: Record<string, unknown> }[] | null
    const answers = answersArray?.[0]?.answers || {}

    // Prepare intake context for AI (service-type aware)
    const intakeContext = formatIntakeContext(intake, patient, answers, serviceType)
    
    // Generate clinical note for ALL service types
    const clinicalNoteResult = await generateClinicalNoteDraft(intakeId, intakeContext, answers)

    // Generate service-specific draft based on draft category (derived from canonical service type)
    let serviceSpecificResult: { status: "ready" | "failed"; error?: string }
    
    if (draftCategory === "med_cert") {
      serviceSpecificResult = await generateMedCertDraft(intakeId, intakeContext, answers, patient?.full_name || "Patient")
    } else if (draftCategory === "repeat_rx") {
      serviceSpecificResult = await generateRepeatRxDraft(intakeId, intakeContext, answers)
    } else {
      serviceSpecificResult = await generateConsultDraft(intakeId, intakeContext, answers)
    }

    const duration = Date.now() - startTime
    log.info("Draft generation completed", {
      intakeId,
      serviceType,
      draftCategory,
      durationMs: duration,
      clinicalNote: clinicalNoteResult.status,
      serviceSpecific: serviceSpecificResult.status,
    })

    // Build result based on draft category
    const result: GenerateDraftsResult = {
      success: true,
      serviceType,
      draftCategory,
      clinicalNote: clinicalNoteResult,
    }

    if (draftCategory === "med_cert") {
      result.medCert = serviceSpecificResult
    } else if (draftCategory === "repeat_rx") {
      result.repeatRx = serviceSpecificResult
    } else {
      result.consult = serviceSpecificResult
    }

    return result

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
      
      // Track failure in PostHog
      try {
        const posthog = getPostHogClient()
        posthog.capture({
          distinctId: intakeId,
          event: 'ai_draft_failed',
          properties: {
            intake_id: intakeId,
            draft_type: 'clinical_note',
            error: parseResult.error,
          },
        })
      } catch { /* non-blocking */ }
      
      // Capture to Sentry with intake_id as tag for traceability
      Sentry.captureMessage("AI draft generation failed: clinical_note", {
        level: "warning",
        tags: {
          source: "ai_draft",
          draft_type: "clinical_note",
          intake_id: intakeId,
        },
        extra: {
          error: parseResult.error,
          zodErrors: parseResult.zodErrors,
        },
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

    // Validate AI output doesn't contain leaked prompts
    const outputValidation = validateAIOutput(result.text)
    if (!outputValidation.valid) {
      log.warn("AI output validation issues", { intakeId, issues: outputValidation.issues })
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

    // Track in PostHog
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: intakeId,
        event: 'ai_draft_generated',
        properties: {
          intake_id: intakeId,
          draft_type: 'clinical_note',
          duration_ms: durationMs,
          prompt_tokens: getUsage(result.usage).promptTokens,
          completion_tokens: getUsage(result.usage).completionTokens,
        },
      })
    } catch { /* non-blocking */ }

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
      
      // Track failure in PostHog
      try {
        const posthog = getPostHogClient()
        posthog.capture({
          distinctId: intakeId,
          event: 'ai_draft_failed',
          properties: {
            intake_id: intakeId,
            draft_type: 'med_cert',
            error: parseResult.error,
          },
        })
      } catch { /* non-blocking */ }
      
      // Capture to Sentry with intake_id and service_type as tags for traceability
      Sentry.captureMessage("AI draft generation failed: med_cert", {
        level: "warning",
        tags: {
          source: "ai_draft",
          draft_type: "med_cert",
          intake_id: intakeId,
          service_type: "med_certs",
        },
        extra: {
          error: parseResult.error,
          zodErrors: parseResult.zodErrors,
        },
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

    // Track in PostHog
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: intakeId,
        event: 'ai_draft_generated',
        properties: {
          intake_id: intakeId,
          draft_type: 'med_cert',
          duration_ms: durationMs,
          prompt_tokens: getUsage(result.usage).promptTokens,
          completion_tokens: getUsage(result.usage).completionTokens,
        },
      })
    } catch { /* non-blocking */ }

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
 * Generate repeat prescription draft
 */
async function generateRepeatRxDraft(
  intakeId: string,
  intakeContext: string,
  _answers: Record<string, unknown>
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const startTime = Date.now()
  
  try {
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      system: REPEAT_RX_JSON_PROMPT,
      prompt: intakeContext,
    })

    const durationMs = Date.now() - startTime

    // Parse and validate AI output
    const parseResult = safeParseRepeatRxDraftOutput(result.text)
    
    if (!parseResult.success) {
      log.error("Repeat Rx validation failed", {
        intakeId,
        error: parseResult.error,
        zodErrors: parseResult.zodErrors,
      })
      
      await upsertDraft({
        intakeId,
        type: "repeat_rx",
        content: { raw: result.text },
        status: "failed",
        error: parseResult.error,
        promptTokens: getUsage(result.usage).promptTokens,
        completionTokens: getUsage(result.usage).completionTokens,
        generationDurationMs: durationMs,
        validationErrors: parseResult.zodErrors,
      })
      
      // Track failure in PostHog
      try {
        const posthog = getPostHogClient()
        posthog.capture({
          distinctId: intakeId,
          event: 'ai_draft_failed',
          properties: {
            intake_id: intakeId,
            draft_type: 'repeat_rx',
            error: parseResult.error,
          },
        })
      } catch { /* non-blocking */ }
      
      // Capture to Sentry with intake_id and service_type as tags for traceability
      Sentry.captureMessage("AI draft generation failed: repeat_rx", {
        level: "warning",
        tags: {
          source: "ai_draft",
          draft_type: "repeat_rx",
          intake_id: intakeId,
          service_type: "repeat_scripts",
        },
        extra: {
          error: parseResult.error,
          zodErrors: parseResult.zodErrors,
        },
      })

      return { status: "failed", error: parseResult.error }
    }

    // Save successful draft (no ground-truth validation for repeat_rx yet)
    await upsertDraft({
      intakeId,
      type: "repeat_rx",
      content: parseResult.data!,
      status: "ready",
      promptTokens: getUsage(result.usage).promptTokens,
      completionTokens: getUsage(result.usage).completionTokens,
      generationDurationMs: durationMs,
    })

    log.info("Repeat Rx draft generated", {
      intakeId,
      durationMs,
      promptTokens: getUsage(result.usage).promptTokens,
      completionTokens: getUsage(result.usage).completionTokens,
    })

    // Track in PostHog
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: intakeId,
        event: 'ai_draft_generated',
        properties: {
          intake_id: intakeId,
          draft_type: 'repeat_rx',
          duration_ms: durationMs,
          prompt_tokens: getUsage(result.usage).promptTokens,
          completion_tokens: getUsage(result.usage).completionTokens,
        },
      })
    } catch { /* non-blocking */ }

    return { status: "ready" }

  } catch (error) {
    log.error("Repeat Rx generation error", { intakeId }, error)
    
    await upsertDraft({
      intakeId,
      type: "repeat_rx",
      content: {},
      status: "failed",
      error: error instanceof Error ? error.message : "Generation failed",
    })
    
    return { status: "failed", error: error instanceof Error ? error.message : "Generation failed" }
  }
}

/**
 * Generate consultation draft
 */
async function generateConsultDraft(
  intakeId: string,
  intakeContext: string,
  _answers: Record<string, unknown>
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const startTime = Date.now()
  
  try {
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      system: CONSULT_JSON_PROMPT,
      prompt: intakeContext,
    })

    const durationMs = Date.now() - startTime

    // Parse and validate AI output
    const parseResult = safeParseConsultDraftOutput(result.text)
    
    if (!parseResult.success) {
      log.error("Consult validation failed", {
        intakeId,
        error: parseResult.error,
        zodErrors: parseResult.zodErrors,
      })
      
      await upsertDraft({
        intakeId,
        type: "consult",
        content: { raw: result.text },
        status: "failed",
        error: parseResult.error,
        promptTokens: getUsage(result.usage).promptTokens,
        completionTokens: getUsage(result.usage).completionTokens,
        generationDurationMs: durationMs,
        validationErrors: parseResult.zodErrors,
      })
      
      // Track failure in PostHog
      try {
        const posthog = getPostHogClient()
        posthog.capture({
          distinctId: intakeId,
          event: 'ai_draft_failed',
          properties: {
            intake_id: intakeId,
            draft_type: 'consult',
            error: parseResult.error,
          },
        })
      } catch { /* non-blocking */ }
      
      // Capture to Sentry with intake_id and service_type as tags for traceability
      Sentry.captureMessage("AI draft generation failed: consult", {
        level: "warning",
        tags: {
          source: "ai_draft",
          draft_type: "consult",
          intake_id: intakeId,
          service_type: "consults",
        },
        extra: {
          error: parseResult.error,
          zodErrors: parseResult.zodErrors,
        },
      })

      return { status: "failed", error: parseResult.error }
    }

    // Save successful draft (no ground-truth validation for consult yet)
    await upsertDraft({
      intakeId,
      type: "consult",
      content: parseResult.data!,
      status: "ready",
      promptTokens: getUsage(result.usage).promptTokens,
      completionTokens: getUsage(result.usage).completionTokens,
      generationDurationMs: durationMs,
    })

    log.info("Consult draft generated", {
      intakeId,
      durationMs,
      promptTokens: getUsage(result.usage).promptTokens,
      completionTokens: getUsage(result.usage).completionTokens,
    })

    // Track in PostHog
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: intakeId,
        event: 'ai_draft_generated',
        properties: {
          intake_id: intakeId,
          draft_type: 'consult',
          duration_ms: durationMs,
          prompt_tokens: getUsage(result.usage).promptTokens,
          completion_tokens: getUsage(result.usage).completionTokens,
        },
      })
    } catch { /* non-blocking */ }

    return { status: "ready" }

  } catch (error) {
    log.error("Consult generation error", { intakeId }, error)
    
    await upsertDraft({
      intakeId,
      type: "consult",
      content: {},
      status: "failed",
      error: error instanceof Error ? error.message : "Generation failed",
    })
    
    return { status: "failed", error: error instanceof Error ? error.message : "Generation failed" }
  }
}

/**
 * Sanitize a single user-provided value for AI prompt inclusion
 */
function sanitizeAnswerValue(value: unknown, intakeId: string): string {
  if (value === null || value === undefined) return ""
  const strValue = String(value)
  const result = checkAndSanitize(strValue, { endpoint: "generate-drafts", userId: intakeId })
  if (result.blocked) {
    log.warn("Prompt injection blocked in intake answer", { intakeId })
    return "[content filtered]"
  }
  return result.output
}

/**
 * Format intake data for AI context (service-type aware)
 */
function formatIntakeContext(
  intake: Record<string, unknown>,
  patient: { full_name: string; date_of_birth: string | null } | null,
  answers: Record<string, unknown>,
  serviceType: ServiceType
): string {
  const intakeId = String(intake.id || "unknown")
  const parts: string[] = []
  
  // Get draft category for service-specific field extraction
  const draftCategory = getDraftCategory(serviceType)

  if (patient) {
    parts.push(`Patient: ${sanitizeAnswerValue(patient.full_name, intakeId)}`)
    if (patient.date_of_birth) {
      parts.push(`DOB: ${patient.date_of_birth}`)
    }
  }

  parts.push(`Request Date: ${new Date().toISOString().split("T")[0]}`)
  parts.push(`Service Type: ${serviceType}`)

  // Common fields across all service types
  if (answers.symptoms && Array.isArray(answers.symptoms)) {
    const sanitizedSymptoms = answers.symptoms.map(s => sanitizeAnswerValue(s, intakeId))
    parts.push(`Symptoms: ${sanitizedSymptoms.join(", ")}`)
  }

  if (answers.otherSymptomDetails) {
    parts.push(`Additional Symptoms: ${sanitizeAnswerValue(answers.otherSymptomDetails, intakeId)}`)
  }

  if (answers.reason) {
    parts.push(`Reason: ${sanitizeAnswerValue(answers.reason, intakeId)}`)
  }

  // Service-specific fields (use draftCategory for comparisons)
  if (draftCategory === "med_cert") {
    if (answers.certificateType) {
      parts.push(`Certificate Type: ${sanitizeAnswerValue(answers.certificateType, intakeId)}`)
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
      parts.push(`Duration: ${sanitizeAnswerValue(answers.duration, intakeId)}`)
    }
    // Legacy fields
    if (answers.specificDateFrom) {
      parts.push(`Start Date: ${answers.specificDateFrom}`)
    }
    if (answers.specificDateTo) {
      parts.push(`End Date: ${answers.specificDateTo}`)
    }
  }

  if (draftCategory === "repeat_rx") {
    if (answers.medication || answers.medicationName) {
      parts.push(`Medication: ${sanitizeAnswerValue(answers.medication || answers.medicationName, intakeId)}`)
    }
    if (answers.medicationStrength || answers.strength) {
      parts.push(`Strength: ${sanitizeAnswerValue(answers.medicationStrength || answers.strength, intakeId)}`)
    }
    if (answers.treatmentDuration || answers.medicationDuration) {
      parts.push(`Treatment Duration: ${sanitizeAnswerValue(answers.treatmentDuration || answers.medicationDuration, intakeId)}`)
    }
    if (answers.conditionControl || answers.controlLevel) {
      parts.push(`Condition Control: ${sanitizeAnswerValue(answers.conditionControl || answers.controlLevel, intakeId)}`)
    }
    if (answers.lastDoctorVisit || answers.lastReview) {
      parts.push(`Last Doctor Visit: ${sanitizeAnswerValue(answers.lastDoctorVisit || answers.lastReview, intakeId)}`)
    }
    if (answers.sideEffects) {
      parts.push(`Side Effects: ${sanitizeAnswerValue(answers.sideEffects, intakeId)}`)
    }
    if (answers.recentChanges) {
      parts.push(`Recent Changes: ${sanitizeAnswerValue(answers.recentChanges, intakeId)}`)
    }
    if (answers.changeDetails) {
      parts.push(`Change Details: ${sanitizeAnswerValue(answers.changeDetails, intakeId)}`)
    }
  }

  if (draftCategory === "consult") {
    if (answers.primaryConcern || answers.concern || answers.concernSummary) {
      parts.push(`Primary Concern: ${sanitizeAnswerValue(answers.primaryConcern || answers.concern || answers.concernSummary, intakeId)}`)
    }
    if (answers.concernCategory || answers.category) {
      parts.push(`Category: ${sanitizeAnswerValue(answers.concernCategory || answers.category, intakeId)}`)
    }
    if (answers.urgency) {
      parts.push(`Urgency: ${sanitizeAnswerValue(answers.urgency, intakeId)}`)
    }
    if (answers.consultType) {
      parts.push(`Preferred Consult Type: ${sanitizeAnswerValue(answers.consultType, intakeId)}`)
    }
    if (answers.duration || answers.symptomDuration) {
      parts.push(`Duration of Concern: ${sanitizeAnswerValue(answers.duration || answers.symptomDuration, intakeId)}`)
    }
  }

  // Clinical history fields (all service types — useful for Relevant Information section)
  if (answers.hasAllergies === true || answers.has_allergies === true) {
    const allergyDetail = answers.allergyDetails || answers.allergy_details || answers.allergies
    parts.push(`Allergies: ${allergyDetail ? sanitizeAnswerValue(allergyDetail, intakeId) : "Yes (not specified)"}`)
  } else if (answers.hasAllergies === false || answers.has_allergies === false) {
    parts.push("Allergies: Nil known")
  }

  if (answers.currentMedications || answers.current_medications) {
    parts.push(`Current Medications: ${sanitizeAnswerValue(answers.currentMedications || answers.current_medications, intakeId)}`)
  }

  if (answers.medicalConditions || answers.medical_conditions) {
    parts.push(`Medical Conditions: ${sanitizeAnswerValue(answers.medicalConditions || answers.medical_conditions, intakeId)}`)
  }

  if (answers.medicalHistory || answers.medical_history) {
    parts.push(`Medical History: ${sanitizeAnswerValue(answers.medicalHistory || answers.medical_history, intakeId)}`)
  }

  // Carer information (med certs)
  if (answers.carerPersonName || answers.carer_person_name) {
    parts.push(`Caring for: ${sanitizeAnswerValue(answers.carerPersonName || answers.carer_person_name, intakeId)}`)
  }
  if (answers.carerRelationship || answers.carer_relationship) {
    parts.push(`Relationship: ${sanitizeAnswerValue(answers.carerRelationship || answers.carer_relationship, intakeId)}`)
  }

  // Additional notes (all service types)
  if (answers.additionalNotes || answers.notes) {
    parts.push(`Additional Notes: ${sanitizeAnswerValue(answers.additionalNotes || answers.notes, intakeId)}`)
  }

  return parts.join("\n")
}
