/**
 * Wait-counter data source — single source of truth for the live review device.
 *
 * The production-safe fallback is a non-SLA review-state message. Do not show
 * median minutes here until the value is sourced from real request telemetry.
 */

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
 * Current implementation: returns a non-SLA review state. Service-specific
 * live queue metrics can be wired later when backed by request telemetry.
 */
export async function getWaitState(): Promise<WaitState> {
  return {
    variant: "reviewing",
    service: "med-cert",
  }
}
