/**
 * Application constants
 * Centralized place for all app-wide constants
 */

export const APP_NAME = "InstantMed"
export const APP_DESCRIPTION =
  "Get medical certificates and prescriptions online from AHPRA-registered Australian GPs."

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

// Service pricing (in AUD) - SINGLE SOURCE OF TRUTH
// All display prices MUST use PRICING_DISPLAY, never hardcoded strings
export const PRICING = {
  MED_CERT: 19.95,        // 1-day medical certificate
  MED_CERT_2DAY: 29.95,   // 2-day medical certificate
  MED_CERT_3DAY: 39.95,   // 3-day medical certificate
  REPEAT_SCRIPT: 29.95,   // Repeat prescription
  NEW_SCRIPT: 49.95,      // New prescription (same as consult)
  CONSULT: 49.95,         // General consultation
  MENS_HEALTH: 49.95,     // ED consultation
  WOMENS_HEALTH: 59.95,   // Women's health
  HAIR_LOSS: 49.95,       // Hair loss consultation
  WEIGHT_LOSS: 89.95,     // Weight loss consultation
  REFERRAL: 29.95,
  PATHOLOGY: 29.95,
  PRIORITY_FEE: 9.95,    // Express review fee
  REPEAT_RX_MONTHLY: 19.95, // Repeat Rx subscription (monthly)
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
  REPEAT_RX_MONTHLY: `$${PRICING.REPEAT_RX_MONTHLY.toFixed(2)}`,
  // Common display patterns
  FROM_MED_CERT: `From $${PRICING.MED_CERT.toFixed(2)}`,
  FROM_SCRIPT: `From $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
  FROM_CONSULT: `From $${PRICING.CONSULT.toFixed(2)}`,
  RANGE: `$${PRICING.MED_CERT.toFixed(2)} - $${PRICING.CONSULT.toFixed(2)}`,
} as const

// Review aggregate schema - used across service landing pages for structured data.
// Must reflect genuine verified reviews only (schema.org compliance).
// Sync with GOOGLE_REVIEWS.count in lib/social-proof/index.ts when reviews change.
export const REVIEW_AGGREGATE = {
  ratingValue: 5.0,
  reviewCount: 3,
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
  prices: { 1: 19.95, 2: 29.95, 3: 39.95 },
  maxDays: 3,
} as const
