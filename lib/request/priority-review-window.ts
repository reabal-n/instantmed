/**
 * Priority review quiet hours (operator decision 2026-08-03).
 *
 * The priority upsell is hidden between 00:00 and 08:59 Australia/Sydney.
 * Overnight is structurally the window where queue position buys nothing
 * (60d data: overnight reviews averaged 5.8× slower than daytime, and 2 of 3
 * priority breaches were overnight purchases), so selling it then is a
 * promise the platform cannot keep. Deliberately SILENT: no patient-facing
 * copy explains the window, the toggle simply does not render.
 *
 * Client + server safe (Intl only, no env access). E2E and unit tests pass an
 * explicit `now`; production callers use the default. If a patient opens the
 * page before midnight and pays after, their opt-in stands — the 3h breach
 * auto-refund (lib/stripe/priority-fee-refund.ts) backstops the promise.
 */

/** Hidden while the Sydney wall-clock hour is inside [start, end). */
const QUIET_HOURS_START = 0
const QUIET_HOURS_END = 9

/**
 * Current hour of day in Australia/Sydney (0-23), DST-correct via Intl.
 * Intentionally NOT the hardcoded +10h AEST shift used by groupByTime — this
 * is a patient-facing wall-clock decision, so AEDT must be right too.
 */
function sydneyHourOfDay(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "numeric",
    hour12: false,
  }).format(now)
  const parsed = Number.parseInt(hour, 10)
  // "24" appears in some ICU versions for midnight with hour12: false.
  if (parsed === 24) return 0
  return Number.isFinite(parsed) ? parsed : 12
}

/** Whether the priority review upsell should render right now. */
export function isPriorityReviewOffered(now: Date = new Date()): boolean {
  const hour = sydneyHourOfDay(now)
  return hour < QUIET_HOURS_START || hour >= QUIET_HOURS_END
}
