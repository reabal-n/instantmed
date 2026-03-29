"use server"

import { generateText } from "ai"
import { getModelWithConfig } from "@/lib/ai/provider"
import { upsertDraft } from "@/lib/ai/drafts"
import { getPostHogClient } from "@/lib/posthog-server"
import { safeParseRepeatRxDraftOutput } from "@/lib/ai/schemas"
import { CLINICAL_SAFETY_PREAMBLE } from "@/lib/ai/prompts"
import * as Sentry from "@sentry/nextjs"
import { log, getUsage } from "./shared"

// Prompt for repeat prescription draft generation (JSON output)
const REPEAT_RX_JSON_PROMPT = `You are a medical documentation assistant helping Australian GPs review repeat prescription requests.

${CLINICAL_SAFETY_PREAMBLE}

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

/**
 * Generate repeat prescription draft
 */
export async function generateRepeatRxDraft(
  intakeId: string,
  intakeContext: string,
  _answers: Record<string, unknown>
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const startTime = Date.now()

  try {
    const result = await generateText({
      model: getModelWithConfig('clinical').model,
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
