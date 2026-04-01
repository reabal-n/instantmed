/**
 * Time-of-day awareness utilities
 * 
 * Provides contextual messaging based on current time in AEST.
 * Used for trust signals and availability indicators.
 */

// Business hours: 8am - 10pm AEST
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
 * @param service - Optional service type. Med certs are 24/7 (auto-approved).
 */
export function getAvailabilityMessage(service?: string): {
  isActive: boolean
  message: string
  subtext: string
} {
  const hour = getCurrentHourAEST()
  const isActive = isWithinBusinessHours()
  const isMedCert = service === "med-cert" || service === "medical_certificate"

  // Med certs are always active (24/7 auto-approved)
  if (isMedCert) {
    return {
      isActive: true,
      message: "Accepting requests now",
      subtext: "Medical certificates available 24/7",
    }
  }

  if (isActive) {
    // During business hours - show active status
    if (hour >= 8 && hour < 12) {
      return {
        isActive: true,
        message: "Doctors reviewing now",
        subtext: "Morning team available",
      }
    } else if (hour >= 12 && hour < 17) {
      return {
        isActive: true,
        message: "Doctors reviewing now",
        subtext: "Afternoon team available",
      }
    } else {
      return {
        isActive: true,
        message: "Doctors reviewing now",
        subtext: "Evening team available until 10pm",
      }
    }
  } else {
    // Outside business hours
    if (hour >= 22 || hour < 6) {
      return {
        isActive: false,
        message: "Medical certificates available 24/7",
        subtext: "Other services resume at 8am AEST",
      }
    } else {
      // 6am - 8am
      return {
        isActive: false,
        message: "Medical certificates available 24/7",
        subtext: "Other services begin at 8am AEST",
      }
    }
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

  const hour = getCurrentHourAEST()

  if (!isWithinBusinessHours()) {
    // Outside hours - estimate when they'll get a response
    if (hour >= 22) {
      return "by 9am tomorrow"
    } else if (hour < 8) {
      return "by 9am today"
    }
  }

  // During business hours
  if (hour >= 8 && hour < 10) {
    return "within 30-45 mins"
  } else if (hour >= 10 && hour < 17) {
    return "within 45 mins"
  } else {
    // Evening - slightly longer
    return "within an hour"
  }
}

/**
 * Format business hours for display
 */
export function getBusinessHoursDisplay(): string {
  return "8am–10pm AEST, 7 days"
}
