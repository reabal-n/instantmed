"use server"

import { generateText } from "ai"
import { getModelWithConfig } from "@/lib/ai/provider"
import { upsertDraft } from "@/lib/ai/drafts"
import { getPostHogClient } from "@/lib/posthog-server"
import { safeParseMedCertDraftOutput } from "@/lib/ai/schemas"
import { validateMedCertAgainstIntake } from "@/lib/ai/validation"
import { CLINICAL_SAFETY_PREAMBLE } from "@/lib/ai/prompts"
import * as Sentry from "@sentry/nextjs"
import { log, getUsage } from "./shared"

// Prompt for med cert draft generation (JSON output)
const MED_CERT_JSON_PROMPT = `You are a medical documentation assistant helping Australian GPs draft medical certificates.

${CLINICAL_SAFETY_PREAMBLE}

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
 * Generate med cert draft
 */
export async function generateMedCertDraft(
  intakeId: string,
  intakeContext: string,
  answers: Record<string, unknown>,
  patientName: string
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const startTime = Date.now()

  try {
    const prompt = `${intakeContext}\n\nPatient Name: ${patientName}`

    const result = await generateText({
      model: getModelWithConfig('clinical').model,
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
