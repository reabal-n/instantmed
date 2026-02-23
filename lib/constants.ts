/**
 * Application constants
 * Centralized place for all app-wide constants
 */

export const APP_NAME = "InstantMed"
export const APP_DESCRIPTION =
  "Get medical certificates and prescriptions online from AHPRA-registered Australian GPs."

// Contact info — use these constants instead of hardcoded strings
export const CONTACT_EMAIL = "support@instantmed.com.au"
export const CONTACT_EMAIL_HELLO = "hello@instantmed.com.au"
export const CONTACT_EMAIL_NOREPLY = "noreply@instantmed.com.au"
export const CONTACT_EMAIL_ADMIN = "admin@instantmed.com.au"
export const CONTACT_PHONE = "1800 INSTANT"
export const CONTACT_PHONE_NUMBER = "1800467826"

// Service pricing (in AUD) — SINGLE SOURCE OF TRUTH
// All display prices MUST use PRICING_DISPLAY, never hardcoded strings
export const PRICING = {
  MED_CERT: 19.95,        // 1-day medical certificate
  MED_CERT_2DAY: 29.95,   // 2-day medical certificate
  MED_CERT_3DAY: 39.95,   // 3-day medical certificate
  REPEAT_SCRIPT: 29.95,   // Repeat prescription
  NEW_SCRIPT: 49.95,      // New prescription (same as consult)
  CONSULT: 49.95,         // General consultation
  MENS_HEALTH: 39.95,     // ED consultation
  WOMENS_HEALTH: 59.95,   // Women's health
  HAIR_LOSS: 39.95,       // Hair loss consultation
  WEIGHT_LOSS: 79.95,     // Weight loss consultation
  REFERRAL: 29.95,
  PATHOLOGY: 29.95,
} as const

// Formatted pricing strings for display — use these everywhere in UI/SEO/marketing
export const PRICING_DISPLAY = {
  MED_CERT: `$${PRICING.MED_CERT.toFixed(2)}`,
  MED_CERT_2DAY: `$${PRICING.MED_CERT_2DAY.toFixed(2)}`,
  MED_CERT_3DAY: `$${PRICING.MED_CERT_3DAY.toFixed(2)}`,
  REPEAT_SCRIPT: `$${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
  NEW_SCRIPT: `$${PRICING.NEW_SCRIPT.toFixed(2)}`,
  CONSULT: `$${PRICING.CONSULT.toFixed(2)}`,
  MENS_HEALTH: `$${PRICING.MENS_HEALTH.toFixed(2)}`,
  WOMENS_HEALTH: `$${PRICING.WOMENS_HEALTH.toFixed(2)}`,
  HAIR_LOSS: `$${PRICING.HAIR_LOSS.toFixed(2)}`,
  WEIGHT_LOSS: `$${PRICING.WEIGHT_LOSS.toFixed(2)}`,
  REFERRAL: `$${PRICING.REFERRAL.toFixed(2)}`,
  PATHOLOGY: `$${PRICING.PATHOLOGY.toFixed(2)}`,
  // Common display patterns
  FROM_MED_CERT: `From $${PRICING.MED_CERT.toFixed(2)}`,
  FROM_SCRIPT: `From $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
  FROM_CONSULT: `From $${PRICING.CONSULT.toFixed(2)}`,
  RANGE: `$${PRICING.MED_CERT.toFixed(2)} - $${PRICING.CONSULT.toFixed(2)}`,
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
  STUDY: "study",
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
    default: "bg-white dark:bg-white/5",
    glass: "bg-white/60 dark:bg-white/5 backdrop-blur-lg",
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
  options: [1, 2, 3] as const,
  labels: { 1: '1 day', 2: '2 days', 3: '3 days' },
  prices: { 1: 19.95, 2: 29.95, 3: 39.95 },
  maxDays: 3,
} as const
