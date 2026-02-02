import { getPostHogClient } from "@/lib/posthog-server"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("ab-testing")

export interface Experiment {
  key: string
  variants: string[]
  defaultVariant: string
}

/**
 * Server-side experiment evaluation using PostHog feature flags.
 * Falls back to default variant if PostHog is unavailable.
 */
export async function getExperimentVariant(
  experimentKey: string,
  distinctId: string,
  defaultVariant: string = "control"
): Promise<string> {
  try {
    const posthog = getPostHogClient()
    if (!posthog) return defaultVariant

    const variant = await posthog.getFeatureFlag(experimentKey, distinctId)

    if (typeof variant === "string") return variant
    if (typeof variant === "boolean") return variant ? "test" : "control"

    return defaultVariant
  } catch (error) {
    log.error("Experiment evaluation failed", {
      experimentKey,
      error: error instanceof Error ? error.message : "Unknown",
    })
    return defaultVariant
  }
}

/**
 * Track experiment exposure event
 */
export function trackExperimentExposure(
  experimentKey: string,
  variant: string,
  distinctId: string
) {
  try {
    const posthog = getPostHogClient()
    if (!posthog) return

    posthog.capture({
      distinctId,
      event: "$experiment_exposure",
      properties: {
        $experiment_key: experimentKey,
        $experiment_variant: variant,
      },
    })
  } catch {
    // Non-critical, don't fail
  }
}
