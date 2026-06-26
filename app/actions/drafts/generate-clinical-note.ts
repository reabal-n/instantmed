"use server"

import * as Sentry from "@sentry/nextjs"
import { generateText } from "ai"

import { upsertDraft } from "@/lib/ai/drafts"
import { validateAIOutput } from "@/lib/ai/prompt-safety"
import { CLINICAL_SAFETY_PREAMBLE } from "@/lib/ai/prompts"
import { getModelWithConfig } from "@/lib/ai/provider"
import { safeParseClinicalNoteOutput } from "@/lib/ai/schemas"
import { validateClinicalNoteAgainstIntake } from "@/lib/ai/validation"
import { getPostHogClient } from "@/lib/analytics/posthog-server"

import { getUsage,log } from "./shared"

// Prompt for clinical note generation (JSON output)
// Produces a BRIEF, service-aware clinical note for record-keeping.
const CLINICAL_NOTE_JSON_PROMPT = `You are a medical documentation assistant helping Australian doctors write brief clinical notes.

${CLINICAL_SAFETY_PREAMBLE}

Write a BRIEF clinical note based on the patient intake provided.

CRITICAL — MATCH THE SERVICE:
- The intake's "Service Type:" line names the EXACT service (e.g. "Hair loss
  consult", "Erectile dysfunction (ED) consult", "Repeat prescription", "Medical
  certificate"). Write the note for THAT service. ONLY call it a medical
  certificate if the Service Type literally says "Medical certificate".
- NEVER default to a medical-certificate note for a consult. If the Service Type
  is a consult, the note is about that consult concern, not a certificate.
- The per-service examples below show the STYLE only. NEVER copy an example
  verbatim — write from this patient's actual intake fields.
- Services you may see: medical certificate, repeat prescription, or a consult
  subtype — erectile dysfunction (ed), hair loss (hair_loss), or women's health
  (womens_health, e.g. UTI or contraceptive pill).

FILL EACH FIELD WITH ONE CONCISE SENTENCE:
- presentingComplaint: the patient's actual request/concern in one sentence.
  - ED example: "38yo requesting ED treatment; gradual onset over 3-12 months, IIEF-5 9/25, goal to improve erections."
  - Hair loss example: "Patient requesting hair-loss treatment; gradual onset, family history reported."
  - Women's health example: "Patient requesting assessment for UTI symptoms (burning, frequency)."
  - Repeat prescription example: "Patient requesting a repeat prescription for an ongoing, stable condition."
  - Medical certificate example: "Patient requesting a medical certificate; reports symptoms over the stated period."
- historyOfPresentIllness: the relevant objective facts from intake in one sentence
  (duration, severity, prior treatment, and key safety-screen results).
  - For consults note the safety screen, e.g. "No nitrate use; no recent cardiac event reported."
- relevantInformation: a brief, NON-diagnostic suitability impression in one short sentence,
  e.g. "Appears suitable for telehealth assessment; no contraindications flagged on intake."
  or "As per intake." Use "appears suitable for" / "as per intake" language — never diagnose.
- certificateDetails: what is being requested/issued for THIS service, generic and
  with NO specific drug names.
  - ED: "ED treatment assessment."
  - Hair loss: "Hair-loss treatment assessment."
  - Women's health: "Women's health assessment (as requested)."
  - Repeat prescription: "Repeat prescription as requested."
  - Medical certificate: "Medical certificate [X] days [dates]."

IMPORTANT RULES:
- This is a DRAFT note for doctor review only.
- Use professional medical terminology appropriate for Australian healthcare.
- Be factual — only include information from the intake.
- Do not make clinical diagnoses — that's for the reviewing doctor.
- Do not mention specific disease names (covid, influenza, etc.) — use general terms.
- Do not recommend or mention any medications (no S4/S8 drug names).
- Keep the TOTAL note brief: each field is ONE concise, factual sentence —
  essential clinical info only. No filler, no hedging, no preamble, no restating
  the question, no reassurance or marketing language. If the intake has nothing
  substantive for a field, use a short neutral phrase ("As per intake."), not padding.

FLAGGING POLICY (requiresReview):
- Set requiresReview=true ONLY when the clinical content itself raises a concern
  (e.g. red-flag symptoms, mental-health distress, contradictions between fields,
  a reported safety contraindication, or content outside the scope of telehealth).
- Do NOT set requiresReview=true based on language quality, spelling, grammar,
  brevity, typos, or "atypical" phrasing of free-text fields. Patients describe
  things in their own words — that is normal.
- When structured fields are present, treat them as the primary clinical signal;
  unclear or non-substantive free text is supplementary context only — ignore it
  for flagging purposes.
- If you cannot draft a field from the structured intake alone, use a neutral
  summary (e.g. "Patient reports [concern] for [duration].") rather than flagging.

OUTPUT: Return ONLY valid JSON (no markdown, no explanation) matching this exact structure.
Do NOT include "Subjective:", "Objective:", "Assessment:", "Plan:" or any field
labels inside the values — write plain sentences only.
{
  "presentingComplaint": "[Patient's request/concern in one sentence]",
  "historyOfPresentIllness": "[Relevant objective facts + safety screen in one sentence]",
  "relevantInformation": "[Brief non-diagnostic suitability impression]",
  "certificateDetails": "[What is requested/issued for THIS service]",
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
