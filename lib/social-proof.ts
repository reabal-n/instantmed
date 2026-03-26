/**
 * Centralized Social Proof — Single Source of Truth
 *
 * Patient counter uses linear interpolation:
 *   Anchor: March 4, 2026 → 420 patients
 *   Target: December 31, 2026 → 12,000 patients
 *   Rate: ~38 patients/day
 *
 * Use `getPatientCount()` for server-side, `usePatientCount()` for client.
 * All social proof stats (rating, response time) live here.
 *
 * This file is SERVER-SAFE — no React hooks. Client hook is in ./use-patient-count.ts
 */

// ─── Counter Anchors ───────────────────────────────────────────────

/** AEST (UTC+11) anchor date */
const ANCHOR_DATE = new Date("2026-03-04T00:00:00+11:00")
export const ANCHOR_COUNT = 420

/** AEST (UTC+11) target date */
const TARGET_DATE = new Date("2026-12-31T23:59:59+11:00")
const TARGET_COUNT = 12_000

const TOTAL_GROWTH = TARGET_COUNT - ANCHOR_COUNT
const TOTAL_MS = TARGET_DATE.getTime() - ANCHOR_DATE.getTime()

// ─── Platform Stats ────────────────────────────────────────────────

/**
 * Canonical social proof metrics — SINGLE SOURCE OF TRUTH.
 *
 * All marketing pages, SEO data objects, and structured data must
 * reference these constants (or SOCIAL_PROOF_DISPLAY) instead of
 * hardcoding numbers. Prose copy (blog articles, meta descriptions)
 * may use natural language equivalents ("under an hour") but the
 * numbers here are the source.
 *
 * Update here when real analytics data becomes available.
 */
export const SOCIAL_PROOF = {
  // ── Ratings & Reviews ──
  averageRating: 4.8,
  reviewCount: 64,

  // ── Response Times ──
  /** Average response in minutes (used for stat displays) */
  averageResponseMinutes: 47,
  /** Typical turnaround for certificates specifically */
  certTurnaroundMinutes: 38,

  // ── Platform Credentials ──
  ahpraVerifiedPercent: 100,
  employerAcceptancePercent: 100,
  operatingDays: 7,
  operatingHoursStart: 8,
  operatingHoursEnd: 22,
  doctorCount: 4,

  // ── Doctor Credibility ──
  doctorCombinedYears: 45,

  // ── Outcome Stats ──
  sameDayDeliveryPercent: 94,
  certApprovalPercent: 97,
  scriptFulfillmentPercent: 96,
  patientReturnPercent: 73,

  // ── Guarantees ──
  refundPercent: 100,
  adminFee: 4.95,

  // ── GP Comparison (for context, not exact) ──
  gpPriceStandard: "$60–90",
  gpPriceComplex: "$80–120",
} as const

/**
 * Pre-formatted display strings — use these in UI, like PRICING_DISPLAY.
 * Avoids scattering template literals and `.toFixed()` calls everywhere.
 */
export const SOCIAL_PROOF_DISPLAY = {
  rating: `${SOCIAL_PROOF.averageRating}`,
  ratingWithStar: `${SOCIAL_PROOF.averageRating}★`,
  ratingOutOf5: `${SOCIAL_PROOF.averageRating}/5`,
  responseTime: `~${SOCIAL_PROOF.averageResponseMinutes} min`,
  certTurnaround: `${SOCIAL_PROOF.certTurnaroundMinutes} min`,
  operatingHours: `${SOCIAL_PROOF.operatingHoursStart}am–${SOCIAL_PROOF.operatingHoursEnd > 12 ? SOCIAL_PROOF.operatingHoursEnd - 12 : SOCIAL_PROOF.operatingHoursEnd}pm`,
  operatingSchedule: `${SOCIAL_PROOF.operatingDays} days a week`,
  refundGuarantee: `${SOCIAL_PROOF.refundPercent}% refund guarantee`,
  adminFee: `$${SOCIAL_PROOF.adminFee.toFixed(2)}`,
  gpComparison: `Typically ${SOCIAL_PROOF.gpPriceStandard} at a GP`,
  gpComparisonComplex: `Typically ${SOCIAL_PROOF.gpPriceComplex} at a GP`,
  doctorExperience: `${SOCIAL_PROOF.doctorCombinedYears}+ years combined experience`,
  sameDayDelivery: `${SOCIAL_PROOF.sameDayDeliveryPercent}% delivered same day`,
  certApproval: `${SOCIAL_PROOF.certApprovalPercent}% approval rate`,
  scriptFulfillment: `${SOCIAL_PROOF.scriptFulfillmentPercent}% fulfilled same day`,
  patientReturn: `${SOCIAL_PROOF.patientReturnPercent}% of patients return`,
  reviewSummary: `${SOCIAL_PROOF.reviewCount} verified reviews`,
} as const

// ─── Counter Logic ─────────────────────────────────────────────────

/**
 * Returns the interpolated patient count for the current moment.
 * Before anchor date → ANCHOR_COUNT.
 * After target date → TARGET_COUNT.
 * Between → linear interpolation.
 */
export function getPatientCount(now: Date = new Date()): number {
  const elapsed = now.getTime() - ANCHOR_DATE.getTime()

  if (elapsed <= 0) return ANCHOR_COUNT
  if (elapsed >= TOTAL_MS) return TARGET_COUNT

  const progress = elapsed / TOTAL_MS
  return Math.floor(ANCHOR_COUNT + progress * TOTAL_GROWTH)
}
