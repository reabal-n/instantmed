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

export function isReviewFulfilmentOldEnough(
  intake: ReviewFulfilmentFields,
  now = new Date(),
): boolean {
  const fulfilledAt = getReviewFulfilmentAt(intake)
  if (!fulfilledAt) return false

  const fulfilledAtMs = new Date(fulfilledAt).getTime()
  if (!Number.isFinite(fulfilledAtMs)) return false

  return fulfilledAtMs <= now.getTime() - REVIEW_REQUEST_DELAY_HOURS * 60 * 60 * 1000
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
