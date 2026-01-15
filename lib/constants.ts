/**
 * Application constants
 * Centralized place for all app-wide constants
 */

export const APP_NAME = "InstantMed"
export const APP_DESCRIPTION =
  "Get medical certificates and prescriptions online from AHPRA-registered Australian GPs."

// Contact info
export const CONTACT_EMAIL = "support@instantmed.com.au"
export const CONTACT_PHONE = "1800 INSTANT"
export const CONTACT_PHONE_NUMBER = "1800467826"

// Service pricing (in AUD)
export const PRICING = {
  MED_CERT: 19.95,
  REPEAT_SCRIPT: 29.95,
  NEW_SCRIPT: 49.95,
  CONSULT: 49.95,
  PRIORITY_ADDON: 10.0,
} as const

// Formatted pricing strings for display
export const PRICING_DISPLAY = {
  MED_CERT: `$${PRICING.MED_CERT.toFixed(2)}`,
  REPEAT_SCRIPT: `$${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
  NEW_SCRIPT: `$${PRICING.NEW_SCRIPT.toFixed(2)}`,
  CONSULT: `$${PRICING.CONSULT.toFixed(2)}`,
  PRIORITY_ADDON: `$${PRICING.PRIORITY_ADDON.toFixed(0)}`,
} as const

// GP comparison pricing (for context, not exact)
export const GP_COMPARISON = {
  STANDARD: "$60–90",
  COMPLEX: "$80–120",
} as const

// Response time guarantees
export const RESPONSE_TIMES = {
  AVERAGE: "2-4 hours",
  GUARANTEE: "24 hours",
} as const

// Service types
export const REQUEST_TYPES = {
  MEDICAL_CERTIFICATE: "medical_certificate",
  PRESCRIPTION: "prescription",
} as const

// Medical certificate categories
export const MEDCERT_CATEGORIES = {
  WORK: "work",
  UNI: "uni",
  CARER: "carer",
} as const

// Australian states
export const AUSTRALIAN_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const
export type AustralianState = (typeof AUSTRALIAN_STATES)[number]

// Status values
export const REQUEST_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  DECLINED: "declined",
  NEEDS_FOLLOW_UP: "needs_follow_up",
} as const

export const PAYMENT_STATUSES = {
  PENDING: "pending_payment",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const

// Animation delays (for consistent staggered animations)
export const ANIMATION_DELAYS = {
  FAST: "0.1s",
  MEDIUM: "0.2s",
  SLOW: "0.3s",
} as const

// Regex patterns
export const PATTERNS = {
  MEDICARE: /^\d{10,11}$/,
  PHONE: /^(?:\+61|0)[2-478](?:[ -]?\d){8}$/,
  POSTCODE: /^\d{4}$/,
} as const
