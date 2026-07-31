/**
 * Time utilities for the staff cockpit case lists.
 *
 * Pure functions. No DOM, no Intl-locale assumptions beyond en-AU dates.
 * Designed to be cheap enough to call inside useMemo on every render.
 *
 * The legacy `startOfDayAEST` and `groupByTime` helpers use a fixed UTC+10
 * boundary so their historical buckets stay independent of the host timezone.
 * They do not adjust for AEDT. `startOfDaySydney` is the DST-aware path and
 * resolves the actual Australia/Sydney midnight through `Intl.DateTimeFormat`.
 */

export type TimeGroupLabel = "TODAY" | "YESTERDAY" | "THIS WEEK" | "EARLIER"

export type TimeGroup<T> = {
  label: TimeGroupLabel
  items: T[]
}

const TIME_GROUP_ORDER: TimeGroupLabel[] = [
  "TODAY",
  "YESTERDAY",
  "THIS WEEK",
  "EARLIER",
]

const AEST_OFFSET_MS = 10 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const SYDNEY_TIME_ZONE = "Australia/Sydney"
const sydneyDateTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: SYDNEY_TIME_ZONE,
  year: "numeric",
})

export function startOfDayAEST(d: Date): Date {
  // Shift to AEST wall clock, floor to UTC day boundary in shifted frame,
  // shift back. Net result: midnight AEST as a UTC timestamp, independent
  // of the system timezone.
  const shifted = d.getTime() + AEST_OFFSET_MS
  const aestMidnightShifted = Math.floor(shifted / DAY_MS) * DAY_MS
  return new Date(aestMidnightShifted - AEST_OFFSET_MS)
}

function getSydneyParts(date: Date) {
  const values = new Map(
    sydneyDateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  )

  const parts = {
    year: values.get("year"),
    month: values.get("month"),
    day: values.get("day"),
    hour: values.get("hour"),
    minute: values.get("minute"),
    second: values.get("second"),
  }

  if (Object.values(parts).some((value) => !Number.isInteger(value))) {
    throw new Error("Could not resolve Australia/Sydney date parts")
  }

  return parts as {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
  }
}

function getSydneyOffsetMs(date: Date): number {
  const parts = getSydneyParts(date)
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  const sourceTimeAtWholeSecond = Math.trunc(date.getTime() / 1000) * 1000
  return representedAsUtc - sourceTimeAtWholeSecond
}

/** Resolve midnight for the date currently shown in Australia/Sydney. */
export function startOfDaySydney(date: Date): Date {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Could not resolve Australia/Sydney midnight for an invalid date")
  }

  const local = getSydneyParts(date)
  const localMidnightAsUtc = Date.UTC(local.year, local.month - 1, local.day)
  let candidateMs = localMidnightAsUtc

  // The first candidate may fall on the other side of a DST transition.
  // Re-resolving its actual Sydney offset converges to local midnight.
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offsetMs = getSydneyOffsetMs(new Date(candidateMs))
    const nextCandidateMs = localMidnightAsUtc - offsetMs
    if (nextCandidateMs === candidateMs) break
    candidateMs = nextCandidateMs
  }

  const candidate = new Date(candidateMs)
  const resolved = getSydneyParts(candidate)
  if (
    resolved.year !== local.year ||
    resolved.month !== local.month ||
    resolved.day !== local.day ||
    resolved.hour !== 0 ||
    resolved.minute !== 0 ||
    resolved.second !== 0
  ) {
    throw new Error("Could not resolve Australia/Sydney midnight")
  }

  return candidate
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value !== "string" || value.length === 0) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Bucket rows into time groups relative to `now`. Empty groups are omitted
 * so the UI never has to skip a zero-count header.
 *
 * Input order is preserved within each group, which means the caller is
 * responsible for sorting *before* grouping (typically created_at DESC).
 */
export function groupByTime<T>(
  rows: T[],
  dateField: keyof T,
  now: Date = new Date(),
): TimeGroup<T>[] {
  const today = startOfDayAEST(now)
  const yesterday = new Date(today.getTime() - DAY_MS)
  const weekStart = new Date(today.getTime() - 7 * DAY_MS)

  const buckets: Record<TimeGroupLabel, T[]> = {
    TODAY: [],
    YESTERDAY: [],
    "THIS WEEK": [],
    EARLIER: [],
  }

  for (const row of rows) {
    const date = toValidDate(row[dateField])
    if (!date) continue
    if (date >= today) buckets.TODAY.push(row)
    else if (date >= yesterday) buckets.YESTERDAY.push(row)
    else if (date >= weekStart) buckets["THIS WEEK"].push(row)
    else buckets.EARLIER.push(row)
  }

  return TIME_GROUP_ORDER.filter((label) => buckets[label].length > 0).map(
    (label) => ({ label, items: buckets[label] }),
  )
}

/**
 * Compact human relative time for case rows.
 *
 * - under 60s    -> "just now"
 * - under 60m    -> "Nm ago"
 * - under 24h    -> "Nh ago"
 * - under 7 days -> "Nd ago"
 * - older        -> "5 Apr 2026"
 *
 * Returns "" on invalid input so the caller can pair with a tooltip
 * containing the full date.
 */
export function formatRelativeTime(
  input: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const d = toValidDate(input)
  if (!d) return ""

  const diffSeconds = Math.round((now.getTime() - d.getTime()) / 1000)
  if (diffSeconds < 0) return "just now"
  if (diffSeconds < 60) return "just now"
  if (diffSeconds < 60 * 60) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 24 * 60 * 60) {
    return `${Math.floor(diffSeconds / (60 * 60))}h ago`
  }
  if (diffSeconds < 7 * 24 * 60 * 60) {
    return `${Math.floor(diffSeconds / (24 * 60 * 60))}d ago`
  }
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
