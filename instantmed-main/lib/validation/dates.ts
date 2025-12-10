/**
 * Date validation utilities for medical certificates and other forms
 */

export interface DateValidationResult {
  valid: boolean
  error?: string
  warning?: string
}

/**
 * Validate a date range for medical certificates
 * - From date can be up to 3 days in the past
 * - To date must not be in the past
 * - To date must be after or equal to from date
 * - Range should not exceed 14 days for standard certificates
 */
export function validateMedCertDateRange(dateFrom: string, dateTo: string, maxDays = 14): DateValidationResult {
  if (!dateFrom || !dateTo) {
    return { valid: false, error: "Both dates are required" }
  }

  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // From date can be up to 3 days in the past (for backdated certificates)
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  if (from < threeDaysAgo) {
    return {
      valid: false,
      error: "Start date cannot be more than 3 days in the past",
    }
  }

  // To date should not be in the past
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (to < yesterday) {
    return {
      valid: false,
      error: "End date cannot be in the past",
    }
  }

  // To date must be after or equal to from date
  if (to < from) {
    return {
      valid: false,
      error: "End date must be after start date",
    }
  }

  // Calculate duration
  const diffTime = Math.abs(to.getTime() - from.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both dates

  // Warn if duration exceeds standard limit
  if (diffDays > maxDays) {
    return {
      valid: true,
      warning: `Certificate duration of ${diffDays} days is longer than typical. A doctor will review your request.`,
    }
  }

  return { valid: true }
}

/**
 * Get today's date in YYYY-MM-DD format for date input defaults
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]
}

/**
 * Get a date X days from today in YYYY-MM-DD format
 */
export function getDateFromToday(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split("T")[0]
}

/**
 * Format a date string for display
 */
export function formatDateForDisplay(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
