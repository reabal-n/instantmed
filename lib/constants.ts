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

// Form field design tokens - single source of truth for consistent styling
export const FORM_TOKENS = {
  // Border colors
  border: {
    default: "border-slate-200 dark:border-slate-700",
    hover: "hover:border-slate-300 dark:hover:border-slate-600",
    focus: "data-[focused=true]:border-primary focus:border-primary",
    error: "border-red-500",
    success: "border-green-500",
  },
  // Background colors
  bg: {
    default: "bg-white dark:bg-slate-900",
    glass: "bg-white/60 dark:bg-slate-900/40 backdrop-blur-lg",
  },
  // Border radius
  radius: "rounded-xl",
  // Heights
  height: {
    input: "min-h-[48px] md:min-h-0",
    textarea: "min-h-[100px]",
  },
  // Transitions
  transition: "transition-all duration-200",
} as const

// Medical certificate duration options
export const MED_CERT_DURATIONS = {
  options: [1, 2] as const,
  labels: {
    1: "1 day",
    2: "2 days",
  },
  maxDays: 2,
} as const
