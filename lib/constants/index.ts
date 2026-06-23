/**
 * Application constants
 * Centralized place for all app-wide constants
 */

export const APP_NAME = "InstantMed"
export const APP_DESCRIPTION =
  "Get medical certificates and prescriptions online from AHPRA-registered Australian doctors."

// Company identity
export const COMPANY_NAME = "InstantMed Pty Ltd"
export const ABN = "64 694 559 334"
export const COMPANY_ADDRESS = "Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010"
export const COMPANY_ADDRESS_SHORT = "Level 1/457-459 Elizabeth St, Surry Hills NSW 2010"

// System actor for auto-approval pipeline
// This UUID must match the profile row seeded in the DB migration.
// Used as claimed_by and actor_id so FK constraints are satisfied.
export const SYSTEM_AUTO_APPROVE_ID = "00000000-0000-0000-0000-000000000000"

// Contact info - use these constants instead of hardcoded strings
export const CONTACT_EMAIL = "support@instantmed.com.au"
export const CONTACT_EMAIL_HELLO = "hello@instantmed.com.au"
export const CONTACT_EMAIL_NOREPLY = "noreply@instantmed.com.au"
export const CONTACT_EMAIL_ADMIN = "admin@instantmed.com.au"
export const CONTACT_EMAIL_COMPLAINTS = "complaints@instantmed.com.au"
export const CONTACT_EMAIL_PRIVACY = "privacy@instantmed.com.au"
export const CONTACT_EMAIL_LEGAL = "legal@instantmed.com.au"
export const CONTACT_PHONE = "0450 722 549"

// Google Business Profile review link - SINGLE SOURCE OF TRUTH
// Used in all email templates, dashboard, and post-delivery flows
export const GOOGLE_REVIEW_URL = "https://g.page/r/CWqy3A7IKcX6EAE/review"

/**
 * Off-site review destination (GEO keystone). Every review CTA — the day-2
 * review email AND the inline approval-email CTA — routes through
 * /api/review-redirect to ProductReview.com.au, the AU surface answer-engines
 * (ChatGPT/Perplexity) cite and which we already entity-link from `sameAs`.
 *
 * Prod sets PRODUCTREVIEW_REVIEW_URL in Vercel (the operator's param'd
 * write-review link; ProductReview-first since 2026-06-22, with a 30-email
 * backfill already sent). This baked default MIRRORS that value so the redirect
 * can never silently fall back to Google if the env is ever cleared — the
 * failure mode the old `|| ""` fallback allowed. Trustpilot's arm is
 * intentionally empty, so getRotatingReviewUrl resolves to ProductReview every
 * month (the `tp || pr` branch falls through to pr), concentrating volume on
 * the keystone. The query params are ProductReview's non-PHI brand-solicitation
 * attribution, not secrets.
 *
 * Compliance: soliciting off-site reviews is permitted (AHPRA). We NEVER
 * display, count, rate, quote, or schema-mark any review on our own surfaces —
 * the s133 line (ADVERTISING_COMPLIANCE.md §6).
 */
export const PRODUCTREVIEW_REVIEW_URL =
  process.env.PRODUCTREVIEW_REVIEW_URL ||
  "https://www.productreview.com.au/listings/instantmed/write-review?collectionMethod[internalGroupIdentifier]=write_review_link&collectionMethod[solicitorType]=brand"
export const TRUSTPILOT_REVIEW_URL = process.env.TRUSTPILOT_REVIEW_URL || ""

/** Pick the day-2 review destination. monthIndex = new Date().getUTCMonth(). */
export function getRotatingReviewUrl(monthIndex: number): string {
  const pr = PRODUCTREVIEW_REVIEW_URL
  const tp = TRUSTPILOT_REVIEW_URL
  if (!pr && !tp) return GOOGLE_REVIEW_URL
  const preferProductReview = monthIndex % 2 === 0
  return (preferProductReview ? pr || tp : tp || pr) || GOOGLE_REVIEW_URL
}

// Service pricing (in AUD) - SINGLE SOURCE OF TRUTH
// All display prices MUST use PRICING_DISPLAY, never hardcoded strings
export const PRICING = {
  MED_CERT: 24.95,        // 1-day medical certificate (floor price test 2026-06-09, was 19.95)
  MED_CERT_2DAY: 29.95,   // 2-day medical certificate
  MED_CERT_3DAY: 39.95,   // 3-day medical certificate
  REPEAT_SCRIPT: 29.95,   // Repeat prescription
  NEW_SCRIPT: 49.95,      // Reserved historical new-script price; not publicly routed
  CONSULT: 49.95,         // Consult tier (ED, hair loss; parent consult price)
  MENS_HEALTH: 49.95,     // ED consultation
  WOMENS_HEALTH: 49.95,   // Women's health (UTI + new/switch pill) - matches the consult tier
  HAIR_LOSS: 49.95,       // Hair loss consultation
  WEIGHT_LOSS: 89.95,     // Weight loss consultation
  REFERRAL: 29.95,
  PATHOLOGY: 29.95,
  PRIORITY_FEE: 9.95,    // Express review fee
} as const

// Formatted pricing strings for display - use these everywhere in UI/SEO/marketing
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
  PRIORITY_FEE: `$${PRICING.PRIORITY_FEE.toFixed(2)}`,
  // Common display patterns
  FROM_MED_CERT: `From $${PRICING.MED_CERT.toFixed(2)}`,
  FROM_SCRIPT: `From $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
  FROM_CONSULT: `From $${PRICING.CONSULT.toFixed(2)}`,
  RANGE: `$${PRICING.MED_CERT.toFixed(2)} - $${PRICING.CONSULT.toFixed(2)}`,
} as const

// Consent/terms version for compliance audit (align with Terms page "Last updated")
export const TERMS_VERSION = "2026-02"
export const TELEHEALTH_CONSENT_VERSION = "2026-02"

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
export type { AustralianState } from "@/types/db"

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

// Regex patterns
export const PATTERNS = {
  MEDICARE: /^\d{10,11}$/,
  PHONE: /^(?:\+61|0)[2-478](?:[ -]?\d){8}$/,
  POSTCODE: /^\d{4}$/,
} as const

// Medical certificate duration options
export const MED_CERT_DURATIONS = {
  options: [1, 2, 3] as const,
  labels: { 1: '1 day', 2: '2 days', 3: '3 days' },
  prices: { 1: 24.95, 2: 29.95, 3: 39.95 },
  maxDays: 3,
} as const
