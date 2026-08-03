/**
 * Overnight window for patient wait-state email copy (2026-08-03).
 *
 * "Still reviewing" sends between 22:00 and 06:59 Australia/Sydney use the
 * honest overnight variant: no "nearly done", no "doctor is working through
 * the queue" — a 01:45 email promising imminent review before an 8h wait is
 * what turned a slow night into an angry support thread. Copy stays free of
 * review-hours windows (24/7 positioning, hours-copy contract); this flag only
 * selects expectation-setting language.
 *
 * DST-correct via Intl (deliberately not the hardcoded +10 AEST shift used by
 * groupByTime — this is patient-facing wall-clock behavior).
 */

const OVERNIGHT_START_HOUR = 22 // 10pm Sydney
const OVERNIGHT_END_HOUR = 7 // up to 06:59 Sydney

export function isOvernightInSydney(now: Date = new Date()): boolean {
  const hour = Number.parseInt(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "numeric",
      hour12: false,
    }).format(now),
    10,
  )
  const normalized = hour === 24 ? 0 : hour
  if (!Number.isFinite(normalized)) return false
  return normalized >= OVERNIGHT_START_HOUR || normalized < OVERNIGHT_END_HOUR
}
