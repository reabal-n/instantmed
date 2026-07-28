const SYDNEY_TIME_ZONE = "Australia/Sydney"
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

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

interface DateKeyParts {
  day: number
  month: number
  year: number
}

interface ZonedDateTimeParts extends DateKeyParts {
  hour: number
  minute: number
  second: number
}

export interface SydneyClosedDay {
  endUtcExclusive: string
  reportDate: string
  startUtc: string
}

export interface SydneyDateWindow {
  endDate: string
  endUtcExclusive: string
  startDate: string
  startUtc: string
}

function parseDateKey(dateKey: string): DateKeyParts {
  const match = DATE_KEY_PATTERN.exec(dateKey)
  if (!match) {
    throw new Error(`Invalid Sydney date key: ${dateKey}`)
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
  const roundTrip = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  )

  if (
    roundTrip.getUTCFullYear() !== parts.year ||
    roundTrip.getUTCMonth() !== parts.month - 1 ||
    roundTrip.getUTCDate() !== parts.day
  ) {
    throw new Error(`Invalid Sydney date key: ${dateKey}`)
  }

  return parts
}

function formatDateKey(parts: DateKeyParts): string {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-")
}

function getSydneyParts(date: Date): ZonedDateTimeParts {
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

  return parts as ZonedDateTimeParts
}

function shiftDateKey(dateKey: string, days: number): string {
  const parts = parseDateKey(dateKey)
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  )

  return formatDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  })
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

function resolveSydneyMidnight(dateKey: string): Date {
  const parts = parseDateKey(dateKey)
  const localMidnightAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
  )
  let candidateMs = localMidnightAsUtc

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offsetMs = getSydneyOffsetMs(new Date(candidateMs))
    const nextCandidateMs = localMidnightAsUtc - offsetMs
    if (nextCandidateMs === candidateMs) break
    candidateMs = nextCandidateMs
  }

  const candidate = new Date(candidateMs)
  const resolved = getSydneyParts(candidate)
  if (
    formatDateKey(resolved) !== dateKey ||
    resolved.hour !== 0 ||
    resolved.minute !== 0 ||
    resolved.second !== 0
  ) {
    throw new Error(`Could not resolve Australia/Sydney midnight for ${dateKey}`)
  }

  return candidate
}

function getSydneyDateKey(date: Date): string {
  return formatDateKey(getSydneyParts(date))
}

/**
 * Resolve the most recent fully closed Australia/Sydney calendar day.
 * Google Ads date segments use the account-local date key while Supabase
 * reconciliation uses the returned end-exclusive UTC boundaries.
 */
export function resolveSydneyClosedDay(now = new Date()): SydneyClosedDay {
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Cannot resolve a Sydney Ads window from an invalid date")
  }

  const reportDate = shiftDateKey(getSydneyDateKey(now), -1)
  const window = resolveSydneyDateWindow(reportDate, 1)

  return {
    reportDate,
    startUtc: window.startUtc,
    endUtcExclusive: window.endUtcExclusive,
  }
}

/**
 * Build an inclusive Sydney-date range and matching end-exclusive UTC range.
 * Date-key arithmetic, rather than millisecond subtraction, preserves 30
 * complete local days when the range crosses an AEST/AEDT transition.
 */
export function resolveSydneyDateWindow(
  endDate: string,
  days: number,
): SydneyDateWindow {
  parseDateKey(endDate)
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("Sydney Ads window days must be a positive integer")
  }

  const startDate = shiftDateKey(endDate, -(days - 1))
  const endDateExclusive = shiftDateKey(endDate, 1)

  return {
    startDate,
    endDate,
    startUtc: resolveSydneyMidnight(startDate).toISOString(),
    endUtcExclusive: resolveSydneyMidnight(endDateExclusive).toISOString(),
  }
}
