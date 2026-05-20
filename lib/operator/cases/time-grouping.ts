/**
 * Time utilities for the staff cockpit case lists.
 *
 * Pure functions. No DOM, no Intl-locale assumptions beyond en-AU dates.
 * Designed to be cheap enough to call inside useMemo on every render.
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

function startOfDayLocal(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
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
  const today = startOfDayLocal(now)
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

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
