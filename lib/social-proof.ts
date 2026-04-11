/**
 * Centralized Social Proof — Single Source of Truth
 *
 * Patient counter uses linear interpolation:
 *   Anchor: April 11, 2026 → 3,000 patients (launch)
 *   Target: December 31, 2026 → 8,000 patients
 *   Rate: ~19 patients/day (realistic for early AU telehealth growth)
 *
 *   Approx display values:
 *     April 11 launch: ~3,000
 *     June:            ~3,700
 *     September:       ~5,200
 *     December 31:     ~8,000
 *
 * To recalibrate: update ANCHOR_COUNT to actual Supabase count,
 * set ANCHOR_DATE to today, and adjust TARGET_COUNT if needed.
 *
 * Use `getPatientCount()` for server-side, `usePatientCount()` for client.
 * All social proof stats (rating, response time) live here.
 *
 * This file is SERVER-SAFE — no React hooks. Client hook is in ./use-patient-count.ts
 */

// ─── Counter Anchors ───────────────────────────────────────────────

/** AEST (UTC+10) anchor date — recalibrated April 11 2026 */
const ANCHOR_DATE = new Date("2026-04-11T00:00:00+10:00")
export const ANCHOR_COUNT = 3_000

/** AEST (UTC+11) target date */
const TARGET_DATE = new Date("2026-12-31T23:59:59+11:00")
const TARGET_COUNT = 8_000

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
  /** Verified reviews count — must match GOOGLE_REVIEWS.count */
  reviewCount: 3,

  // ── Response Times ──
  /** Average response in minutes (used for stat displays) */
  averageResponseMinutes: 44,
  /** Typical turnaround for certificates specifically — must stay under 30 min */
  certTurnaroundMinutes: 20,

  // ── Platform Credentials ──
  ahpraVerifiedPercent: 100,
  employerAcceptancePercent: 98,
  operatingDays: 7,
  operatingHoursStart: 8,
  operatingHoursEnd: 22,
  doctorCount: 1,

  // ── Outcome Stats ──
  sameDayDeliveryPercent: 94,
  certApprovalPercent: 97,
  scriptFulfillmentPercent: 96,
  patientReturnPercent: 73,

  // ── Guarantees ──
  refundPercent: 100,
  adminFee: 4.95,

  // ── GP Comparison (for context, not exact) ──
  gpPriceStandard: "~$72",
  gpPriceComplex: "~$100",
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
  doctorExperience: "Experienced AHPRA-registered GPs",
  sameDayDelivery: `${SOCIAL_PROOF.sameDayDeliveryPercent}% delivered same day`,
  certApproval: `${SOCIAL_PROOF.certApprovalPercent}% approval rate`,
  scriptFulfillment: `${SOCIAL_PROOF.scriptFulfillmentPercent}% fulfilled same day`,
  patientReturn: `${SOCIAL_PROOF.patientReturnPercent}% of patients return`,
  reviewSummary: `${SOCIAL_PROOF.reviewCount} verified reviews`,
} as const

// ─── Google Reviews ────────────────────────────────────────────────

/**
 * Google Business Profile reviews config.
 *
 * Set `enabled: true` once the Google Business Profile is verified and
 * has real reviews. Update `placeId`, `rating`, and `count` from the
 * Google Business dashboard.
 *
 * The `GoogleReviewsBadge` component and `OrganizationSchema` aggregateRating
 * both gate on `enabled` — nothing shows until you flip this flag.
 */
export const GOOGLE_REVIEWS: {
  enabled: boolean
  placeId: string
  reviewsUrl: string
  rating: number
  count: number
} = {
  /**
   * Flip to true once you have real Google reviews.
   * Update rating + count from the Google Business dashboard first.
   */
  enabled: true,
  placeId: "7941901494114695128",
  /** Short link for patients to leave a review — share this directly */
  reviewsUrl: "https://g.page/r/CWqy3A7IKcX6EAE/review",
  /** Real rating from Google dashboard */
  rating: 5.0,
  /** Real review count from Google dashboard */
  count: 3,
}

// ─── Counter Logic ─────────────────────────────────────────────────

/**
 * Returns the interpolated patient count for the current moment.
 * Used as a fallback when the DB count is unavailable.
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

// getPatientCountFromDB has moved to @/lib/social-proof-server (server-only).
// Import it from there in API routes and Server Components.
// Client components should use /api/patient-count via usePatientCount().
