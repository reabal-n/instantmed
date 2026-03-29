"use server"

import { generateText } from "ai"
import { getModelWithConfig } from "@/lib/ai/provider"
import { upsertDraft } from "@/lib/ai/drafts"
import { getPostHogClient } from "@/lib/posthog-server"
import { safeParseConsultDraftOutput } from "@/lib/ai/schemas"
import { CLINICAL_SAFETY_PREAMBLE } from "@/lib/ai/prompts"
import * as Sentry from "@sentry/nextjs"
import { log, getUsage } from "./shared"

// Prompt for consultation draft generation (JSON output)
const CONSULT_JSON_PROMPT = `You are a medical documentation assistant helping Australian GPs prepare for telehealth consultations.

${CLINICAL_SAFETY_PREAMBLE}

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
 * Generate consultation draft
 */
export async function generateConsultDraft(
  intakeId: string,
  intakeContext: string,
  _answers: Record<string, unknown>
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const startTime = Date.now()

  try {
    const result = await generateText({
      model: getModelWithConfig('clinical').model,
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
