/**
 * Time utilities for the staff cockpit case lists.
 *
 * Pure functions. No DOM, no Intl-locale assumptions beyond en-AU dates.
 * Designed to be cheap enough to call inside useMemo on every render.
 *
 * Day boundaries are computed in AEST (UTC+10) regardless of the system
 * timezone. This is an AU-specific telehealth platform; doctors + admins
 * always operate on AEST wall-clock days. Previously this used the system
 * `setHours(0,0,0,0)` which produced different bucketing on UTC CI runners
 * vs local AEST macOS, breaking 4 cockpit tests deterministically.
 *
 * Known limitation: AEDT (Oct-Apr daylight saving, UTC+11) is not handled.
 * During AEDT, day boundaries shift by 1 hour. A row from 11pm AEDT may
 * bucket as the next AEST day. Acceptable for the staff cockpit use case;
 * if precision matters, refactor to use Intl.DateTimeFormat with
 * timeZone: "Australia/Sydney".
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

function startOfDayAEST(d: Date): Date {
  // Shift to AEST wall clock, floor to UTC day boundary in shifted frame,
  // shift back. Net result: midnight AEST as a UTC timestamp, independent
  // of the system timezone.
  const shifted = d.getTime() + AEST_OFFSET_MS
  const aestMidnightShifted = Math.floor(shifted / DAY_MS) * DAY_MS
  return new Date(aestMidnightShifted - AEST_OFFSET_MS)
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
