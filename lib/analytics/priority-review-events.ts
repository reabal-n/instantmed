import type { PostHogCaptureLike } from "@/lib/analytics/intake-events"

export const PRIORITY_REVIEW_EVENTS = {
  optedIn: "priority_review_opted_in",
  optedOut: "priority_review_opted_out",
} as const

export const LEGACY_EXPRESS_REVIEW_EVENTS = {
  optedIn: "express_review_opted_in",
  optedOut: "express_review_opted_out",
} as const

type PriorityReviewEventKey = keyof typeof PRIORITY_REVIEW_EVENTS

export type PriorityReviewAnalyticsProperties = {
  service_type: string
  consult_subtype?: string
  surface?: "checkout" | "review"
}

function capturePriorityReviewEvent(
  posthog: PostHogCaptureLike | null | undefined,
  key: PriorityReviewEventKey,
  properties: PriorityReviewAnalyticsProperties,
) {
  const currentEvent = PRIORITY_REVIEW_EVENTS[key]
  const legacyEvent = LEGACY_EXPRESS_REVIEW_EVENTS[key]

  posthog?.capture(currentEvent, properties)
  posthog?.capture(legacyEvent, {
    ...properties,
    legacy_alias_for: currentEvent,
  })
}

export function capturePriorityReviewOptedIn(
  posthog: PostHogCaptureLike | null | undefined,
  properties: PriorityReviewAnalyticsProperties,
) {
  capturePriorityReviewEvent(posthog, "optedIn", properties)
}

export function capturePriorityReviewOptedOut(
  posthog: PostHogCaptureLike | null | undefined,
  properties: PriorityReviewAnalyticsProperties,
) {
  capturePriorityReviewEvent(posthog, "optedOut", properties)
}
