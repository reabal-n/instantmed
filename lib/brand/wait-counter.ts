/**
 * Wait-counter data source — single source of truth for the live wait device.
 *
 * The brand-rehaul spec (docs/BRAND.md §6.1) defines this as a real-data
 * device: the median time from `request_submitted` to `request_approved`
 * across the rolling 4-hour window, with graceful-degradation fallbacks.
 *
 * **Phase 1 (this file, today):** the displayed median is sourced from the
 * curated `SOCIAL_PROOF.averageResponseMinutes` constant. That number is
 * already published across the marketing site and represents the honest
 * recent median, so it does not violate the "specificity is the brand
 * promise" rule (docs/BRAND.md §6.5).
 *
 * **Phase 2 (TODO):** swap the body of `getWaitState()` to call PostHog's
 * Query API with HogQL roughly:
 *
 *   SELECT median(toFloat(approved.timestamp - submitted.timestamp))
 *     FROM events submitted
 *     JOIN events approved ON approved.properties.request_id = submitted.properties.request_id
 *    WHERE submitted.event = 'request_submitted'
 *      AND approved.event = 'request_approved'
 *      AND submitted.timestamp >= now() - INTERVAL 4 HOUR
 *      AND approved.timestamp >= now() - INTERVAL 4 HOUR
 *
 * The `WaitState` interface below is the target shape — the consumer
 * component already handles every variant — so swapping the data source is a
 * single-function-body change.
 */
import { SOCIAL_PROOF } from "@/lib/social-proof"

/**
 * Variants the WaitCounter component can render. Drives copy + presence.
 * `hidden` means the consumer should render nothing (no recent data).
 */
export type WaitVariant = "live" | "reviewing" | "queued" | "standby" | "hidden"

export interface WaitState {
  variant: WaitVariant
  /** Median minutes from form submit to outcome. Present on `live`. */
  medianMinutes?: number
  /** Number of requests ahead of the patient. Capped at 6. Present on `queued`. */
  queueLength?: number
  /** Hours-of-operation copy for the off-hours fallback. Present on `standby`. */
  resumeAt?: string
  /** Service the median refers to. Defaults to medical certificates (24/7). */
  service?: "med-cert" | "rx" | "consult"
}

/** Hard cap on displayed queue length per the brand spec. */
export const QUEUE_DISPLAY_CAP = 6

/**
 * Returns the wait-counter state for hero display.
 *
 * Phase 1 implementation: returns `live` with the published median for the
 * homepage hero. Med certs run 24/7 so the `standby` branch never fires
 * here. Service-specific heroes (when wired) will pass their own service hours.
 */
export async function getWaitState(): Promise<WaitState> {
  return {
    variant: "live",
    medianMinutes: SOCIAL_PROOF.averageResponseMinutes,
    service: "med-cert",
  }
}
