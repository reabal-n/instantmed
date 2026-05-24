const DAY_MS = 24 * 60 * 60 * 1000

// Forward-dating window: patients legitimately request certs for a known
// upcoming absence (e.g. day-after-tomorrow procedure, planned recovery
// window). Default is 14 days forward. Set to 0 to block future dates
// (legacy behaviour, kept available for tests).
export const CERTIFICATE_MAX_FORWARD_DAYS_DEFAULT = 14

export const CERTIFICATE_FUTURE_START_ERROR =
  "Certificates cannot start more than 14 days in the future. Please pick an earlier date."

export const CERTIFICATE_BACKDATE_ERROR =
  "Certificates cannot be backdated more than 7 days. Please see your doctor for earlier dates."

export const CERTIFICATE_END_BEFORE_START_ERROR = "End date must be on or after start date"

export const CERTIFICATE_MAX_DURATION_ERROR = "Certificate duration cannot exceed 30 days"

export function getSydneyDateOnly(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10)
  }

  return `${year}-${month}-${day}`
}

function parseDateOnlyToUtc(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return parsed
}

export function validateCertificateStartDate(
  startDate: string,
  options: {
    maxBackdateDays?: number | null
    maxForwardDays?: number | null
    now?: Date
  } = {},
): { valid: boolean; error?: string } {
  const parsedStartDate = parseDateOnlyToUtc(startDate)
  if (!parsedStartDate) {
    return { valid: false, error: "Invalid start date format." }
  }

  const today = getSydneyDateOnly(options.now)
  const parsedToday = parseDateOnlyToUtc(today)

  // Forward-dating cap. Patients commonly book med certs for a known
  // upcoming absence (tomorrow procedure, planned recovery). Default is
  // CERTIFICATE_MAX_FORWARD_DAYS_DEFAULT (14d); pass 0 to block all
  // future dates (legacy behaviour); pass null to allow unbounded
  // future-dating (correction paths only).
  const maxForwardDays =
    options.maxForwardDays === undefined
      ? CERTIFICATE_MAX_FORWARD_DAYS_DEFAULT
      : options.maxForwardDays
  if (maxForwardDays !== null && parsedToday) {
    const forwardDiff = Math.floor(
      (parsedStartDate.getTime() - parsedToday.getTime()) / DAY_MS,
    )
    if (forwardDiff > maxForwardDays) {
      return { valid: false, error: CERTIFICATE_FUTURE_START_ERROR }
    }
  }

  const maxBackdateDays = options.maxBackdateDays === undefined ? 7 : options.maxBackdateDays
  if (maxBackdateDays !== null) {
    const daysDiff = parsedToday
      ? Math.floor((parsedToday.getTime() - parsedStartDate.getTime()) / DAY_MS)
      : 0

    if (daysDiff > maxBackdateDays) {
      return { valid: false, error: CERTIFICATE_BACKDATE_ERROR }
    }
  }

  return { valid: true }
}

export function validateCertificateDateRange(
  startDate: string,
  endDate: string,
  options: {
    maxBackdateDays?: number | null
    maxForwardDays?: number | null
    maxDurationDays?: number | null
    now?: Date
  } = {},
): { valid: true; durationDays: number } | { valid: false; error: string } {
  const startValidation = validateCertificateStartDate(startDate, options)
  if (!startValidation.valid) {
    return { valid: false, error: startValidation.error || "Invalid certificate start date" }
  }

  const parsedStartDate = parseDateOnlyToUtc(startDate)
  const parsedEndDate = parseDateOnlyToUtc(endDate)

  if (!parsedStartDate || !parsedEndDate) {
    return { valid: false, error: "Invalid date format. Use YYYY-MM-DD." }
  }

  if (parsedEndDate < parsedStartDate) {
    return { valid: false, error: CERTIFICATE_END_BEFORE_START_ERROR }
  }

  const durationDays = Math.round((parsedEndDate.getTime() - parsedStartDate.getTime()) / DAY_MS) + 1
  const maxDurationDays = options.maxDurationDays ?? 30
  if (maxDurationDays !== null && durationDays > maxDurationDays) {
    return { valid: false, error: CERTIFICATE_MAX_DURATION_ERROR }
  }

  return { valid: true, durationDays }
}
