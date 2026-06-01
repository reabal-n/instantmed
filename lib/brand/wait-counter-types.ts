export type WaitVariant = "live" | "reviewing" | "queued" | "standby" | "hidden"

export interface WaitState {
  variant: WaitVariant
  /** Median minutes from paid request to outcome. Present on `live`. */
  medianMinutes?: number
  /** Recent completed med-cert sample size behind the median. */
  sampleSize?: number
  /** Age in minutes of the newest completed sample behind the median. */
  newestSampleAgeMinutes?: number
  /** Current active queue p95 wait in minutes. */
  queueP95Minutes?: number
  /** Number of requests ahead of the patient. Capped at 6. Present on `queued`. */
  queueLength?: number
  /** Hours-of-operation copy for the off-hours fallback. Present on `standby`. */
  resumeAt?: string
  /** Service the median refers to. Defaults to medical certificates (24/7). */
  service?: "med-cert" | "rx" | "consult"
}

/** Hard cap on displayed queue length per the brand spec. */
export const QUEUE_DISPLAY_CAP = 6
