"use server"

import { generateText } from "ai"
import { getModelWithConfig } from "@/lib/ai/provider"
import { upsertDraft } from "@/lib/ai/drafts"
import { getPostHogClient } from "@/lib/analytics/posthog-server"
import { safeParseClinicalNoteOutput } from "@/lib/ai/schemas"
import { validateClinicalNoteAgainstIntake } from "@/lib/ai/validation"
import { validateAIOutput } from "@/lib/ai/prompt-safety"
import { CLINICAL_SAFETY_PREAMBLE } from "@/lib/ai/prompts"
import * as Sentry from "@sentry/nextjs"
import { log, getUsage } from "./shared"

// Prompt for clinical note generation (JSON output)
// Produces SOAP-format clinical note for record-keeping
const CLINICAL_NOTE_JSON_PROMPT = `You are a medical documentation assistant helping Australian GPs write SOAP-format clinical notes.

${CLINICAL_SAFETY_PREAMBLE}

Generate a clinical note in SOAP format based on the patient intake information provided.

SOAP SECTIONS:
- Subjective (presentingComplaint): Chief complaint and history in patient's words. Include symptom duration, severity, relevant context from intake.
- Objective (historyOfPresentIllness): Observable findings from intake - e.g. "No fever reported. Symptoms x days. No red flags on screening."
- Assessment (relevantInformation): Brief clinical impression - e.g. "Suitable for telehealth [service type]. No contraindications identified." Do NOT diagnose - use "suitable for" or "as per intake" language.
- Plan (certificateDetails): What is being issued - e.g. "Medical certificate [X] days [dates]" or "Repeat prescription [medication]" or "Consultation [type]."

IMPORTANT RULES:
- This is a DRAFT note for doctor review only
- Use professional medical terminology appropriate for Australian healthcare
- Be factual - only include information from the intake
- Do not make clinical diagnoses - that's for the reviewing doctor
- Do not mention specific disease names (covid, influenza, etc.) - use general terms
- Do not recommend or mention any medications
- Keep each section concise (1-2 sentences)

FLAGGING POLICY (requiresReview):
- Set requiresReview=true ONLY when the clinical content itself raises a concern
  (e.g. red-flag symptoms, mental-health distress, contradictions between fields,
  symptoms outside the scope of telehealth med certs).
- Do NOT set requiresReview=true based on language quality, spelling, grammar,
  brevity, typos, or "atypical" phrasing of the free-text "Additional Symptoms"
  field. Patients describe symptoms in their own words - that is normal.
- When the patient has selected 2 or more structured symptoms, treat the
  structured selections as the primary clinical signal. The free-text
  "Additional Symptoms" field is supplementary context only - ignore it for
  flagging purposes if it is unclear or non-substantive.
- If you cannot draft the Subjective section from the structured fields alone,
  use a neutral summary (e.g. "Patient reports [symptom list] for [duration].")
  rather than flagging for review.

OUTPUT: Return ONLY valid JSON (no markdown, no explanation) matching this exact structure.
Do NOT include "Subjective:", "Objective:" etc in the values - we add those when displaying.
{
  "presentingComplaint": "[Chief complaint and HPI in patient's words]",
  "historyOfPresentIllness": "[Observable findings from intake form]",
  "relevantInformation": "[Suitable for telehealth, no contraindications]",
  "certificateDetails": "[What is being issued - certificate, script, consult]",
  "flags": {
    "requiresReview": false,
    "flagReason": null
  }
}`

/**
 * Generate clinical note draft
 */
export async function generateClinicalNoteDraft(
  intakeId: string,
  intakeContext: string,
  answers: Record<string, unknown>
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const startTime = Date.now()

  try {
    const result = await generateText({
      model: getModelWithConfig('clinical').model,
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
