/**
 * Time-of-day awareness utilities
 *
 * Provides contextual messaging based on current time in AEST.
 * Used for trust signals and availability indicators.
 */

// Reference review window. Submission is 24/7.
const BUSINESS_HOURS_START = 8
const BUSINESS_HOURS_END = 22

/**
 * Get current hour in AEST timezone
 */
export function getCurrentHourAEST(): number {
  const now = new Date()
  // Convert to AEST (UTC+10) or AEDT (UTC+11)
  const aestTime = new Date(now.toLocaleString("en-US", { timeZone: "Australia/Sydney" }))
  return aestTime.getHours()
}

/**
 * Check if currently within business hours
 */
export function isWithinBusinessHours(): boolean {
  const hour = getCurrentHourAEST()
  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END
}

/**
 * Get time-aware status message
 * @param service - Optional service type. All services accept requests 24/7.
 */
export function getAvailabilityMessage(service?: string): {
  isActive: boolean
  message: string
  subtext: string
} {
  const isMedCert = service === "med-cert" || service === "medical_certificate"

  if (isMedCert) {
    return {
      isActive: true,
      message: "Accepting requests now",
      subtext: "Medical certificates available 24/7",
    }
  }

  return {
    isActive: true,
    message: "Accepting requests now",
    subtext: "Doctor review follows when available",
  }
}

/**
 * Get estimated response time based on time of day
 * @param service - Optional service type. Med certs are always "under 30 minutes".
 */
export function getEstimatedResponseTime(service?: string): string {
  const isMedCert = service === "med-cert" || service === "medical_certificate"

  // Med certs are 24/7 auto-approved
  if (isMedCert) {
    return "under 30 minutes"
  }

  return "after doctor review"
}

/**
 * Format business hours for display
 */
export function getBusinessHoursDisplay(): string {
  return "Requests accepted 24/7; doctor review timing varies"
}
