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

/** Sydney calendar date (YYYY-MM-DD) `days` before the Sydney day of `now`. */
export function sydneyCalendarDateDaysAgo(now: Date, days: number): string {
  const [year, month, day] = toSydneyCalendarDate(now).split("-").map(Number)
  return utcMsToCalendarDate(Date.UTC(year, month - 1, day - days))
}

/**
 * Australia/Sydney calendar day a stored `prescriptions` row was issued on.
 *
 * `issued_date` is a bare day. Rows written before the Sydney-day sync
 * (2026-09-20) hold the UTC day of the Parchment issue instant, which for a
 * script written between midnight and 10-11am Sydney is the day BEFORE the
 * Sydney day; rows written since hold the Sydney day itself. `created_at` is
 * the instant the row was synced, and the webhook that creates almost every
 * row fires seconds after the script is written, so when a row was created
 * within a day of its stored day that instant fixes the Sydney day for both
 * generations without rewriting anything. A row created two or more days
 * after its stored day (a history refresh, a retried sync) carries no usable
 * instant, so the later of the two possible days is taken: a lenient read
 * lets a patient pay for a request the doctor must decline and refund, while
 * a strict read only delays the request by a day. A missing or unreadable
 * instant leaves the stored day untouched.
 */
export function resolveIssuedSydneyDate(args: { issuedDate: unknown; createdAt: unknown }): string | null {
  const storedMs = typeof args.issuedDate === "string" ? calendarDateToUtcMs(args.issuedDate) : null
  if (storedMs == null) return null
  const stored = utcMsToCalendarDate(storedMs)

  const createdAt = args.createdAt instanceof Date
    ? args.createdAt
    : typeof args.createdAt === "string" ? new Date(args.createdAt) : null
  if (createdAt == null || Number.isNaN(createdAt.getTime())) return stored

  const syncedMs = calendarDateToUtcMs(toSydneyCalendarDate(createdAt))
  if (syncedMs == null) return stored
  const daysAfterStored = Math.round((syncedMs - storedMs) / DAY_MS)
  if (daysAfterStored >= 2) return utcMsToCalendarDate(storedMs + DAY_MS)
  return daysAfterStored === 1 ? utcMsToCalendarDate(syncedMs) : stored
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
