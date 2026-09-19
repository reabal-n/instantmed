/**
 * Codeine combination repeat window.
 *
 * Operator decision 2026-09-19: codeine combination medicines (Panadeine
 * Forte and friends) may be prescribed, but at most once every 7 days. This is
 * pure date arithmetic on Sydney calendar days so the checkout gate, the unit
 * tests, and any doctor-facing copy agree on the same boundary.
 */

export const CODEINE_REPEAT_WINDOW_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export interface CodeineRepeatWindowResult {
  withinWindow: boolean
  latestIssuedDate: string | null
  daysSince: number | null
  /** ISO calendar date (YYYY-MM-DD) from which a new request is accepted. */
  requestAgainOn: string | null
}

/** Sydney calendar date (YYYY-MM-DD) for an instant. */
export function toSydneyCalendarDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Australia/Sydney",
    year: "numeric",
  }).format(instant)
}

function calendarDateToUtcMs(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function utcMsToCalendarDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function evaluateCodeineRepeatWindow(args: {
  issuedDates: ReadonlyArray<string>
  now: Date
}): CodeineRepeatWindowResult {
  const todayMs = calendarDateToUtcMs(toSydneyCalendarDate(args.now))
  let latestMs: number | null = null
  let latestIssuedDate: string | null = null
  for (const issued of args.issuedDates) {
    const ms = calendarDateToUtcMs(issued)
    if (ms == null) continue
    if (latestMs == null || ms > latestMs) {
      latestMs = ms
      latestIssuedDate = utcMsToCalendarDate(ms)
    }
  }
  if (latestMs == null || todayMs == null || latestIssuedDate == null) {
    return { withinWindow: false, latestIssuedDate: null, daysSince: null, requestAgainOn: null }
  }
  const daysSince = Math.floor((todayMs - latestMs) / DAY_MS)
  return {
    withinWindow: daysSince < CODEINE_REPEAT_WINDOW_DAYS,
    latestIssuedDate,
    daysSince,
    requestAgainOn: utcMsToCalendarDate(latestMs + CODEINE_REPEAT_WINDOW_DAYS * DAY_MS),
  }
}

/** Patient-facing date, e.g. "24 September 2026". */
export function formatRequestAgainDate(date: string): string {
  const ms = calendarDateToUtcMs(date)
  if (ms == null) return date
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(ms))
}
