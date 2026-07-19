export const REVIEW_REQUEST_DELAY_HOURS = 48
export const REVIEW_REQUEST_CATCH_UP_DAYS = 120
export const REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS = 30
export const REVIEW_REQUEST_BATCH_SIZE = 50

const REVIEW_REQUEST_TIME_ZONE = "Australia/Sydney"

export interface ReviewFulfilmentFields {
  category: string | null
  document_sent_at: string | null
  script_sent_at: string | null
}

/**
 * Fulfilment is the patient-visible delivery event, not the clinical approval.
 * Medical certificates are fulfilled when the document email is confirmed;
 * prescribing pathways are fulfilled when the eScript handoff is recorded.
 */
export function getReviewFulfilmentAt(
  intake: ReviewFulfilmentFields,
): string | null {
  if (intake.category === "medical_certificate") {
    return intake.document_sent_at
  }

  if (intake.category === "prescription" || intake.category === "consult") {
    return intake.script_sent_at
  }

  return null
}

/**
 * A review request is retryable from 48 hours after fulfilment through the
 * inclusive 120-day catch-up boundary.
 */
export function isReviewFulfilmentWithinCatchUpWindow(
  intake: ReviewFulfilmentFields,
  now = new Date(),
): boolean {
  const fulfilledAt = getReviewFulfilmentAt(intake)
  if (!fulfilledAt) return false

  const fulfilledAtMs = new Date(fulfilledAt).getTime()
  const nowMs = now.getTime()
  if (!Number.isFinite(fulfilledAtMs) || !Number.isFinite(nowMs)) return false

  const ageMs = nowMs - fulfilledAtMs
  const hourMs = 60 * 60 * 1000
  return (
    ageMs >= REVIEW_REQUEST_DELAY_HOURS * hourMs &&
    ageMs <= REVIEW_REQUEST_CATCH_UP_DAYS * 24 * hourMs
  )
}

/**
 * Vercel cron schedules are UTC. The route is invoked at both possible UTC
 * equivalents and this guard selects 10:00 in Sydney across AEST and AEDT.
 */
export function isSydneyReviewRequestHour(now = new Date()): boolean {
  const hour = new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: REVIEW_REQUEST_TIME_ZONE,
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")
    ?.value

  return hour === "10"
}

/**
 * Return the next exact UTC hour that represents 10:00 in Sydney. Scanning UTC
 * hours keeps the calculation correct across AEST/AEDT transitions.
 */
export function getNextSydneyReviewRequestRetryAt(now = new Date()): string {
  const nowMs = now.getTime()
  if (!Number.isFinite(nowMs)) {
    throw new Error("Cannot schedule a review request retry from an invalid date")
  }

  const hourMs = 60 * 60 * 1000
  const firstCandidateMs = (Math.floor(nowMs / hourMs) + 1) * hourMs

  for (let offsetHours = 0; offsetHours < 48; offsetHours += 1) {
    const candidate = new Date(firstCandidateMs + offsetHours * hourMs)
    if (isSydneyReviewRequestHour(candidate)) {
      return candidate.toISOString()
    }
  }

  throw new Error("Could not find the next Sydney review request hour")
}
