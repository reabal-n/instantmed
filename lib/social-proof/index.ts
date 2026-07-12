/**
 * Centralized Social Proof - Single Source of Truth
 *
 * Patient counter uses linear interpolation. Anchors recalibrated 2026-04-28
 * to a defensible early-stage range — previous 3,000 → 8,000 read inflated
 * against early Google Business Profile maturity. Update both anchors when real Supabase counts
 * exceed the floor; the DB query in ./server.ts returns Math.max(real, interpolated).
 *
 *   Anchor: April 11, 2026 → 500 patients (launch baseline)
 *   Target: December 31, 2026 → 2,500 patients
 *   Rate: ~7-8 patients/day (defensible for early AU telehealth growth)
 *
 *   Approx display values:
 *     April 11 launch: ~500
 *     June:            ~860
 *     September:       ~1,540
 *     December 31:     ~2,500
 *
 * To recalibrate: update ANCHOR_COUNT to actual Supabase count,
 * set ANCHOR_DATE to today, and adjust TARGET_COUNT if needed.
 *
 * Use `getPatientCount()` for server-side, `usePatientCount()` for client.
 * All public platform stats, response times, and badge state live here.
 *
 * This file is SERVER-SAFE - no React hooks. Client hook is in ./use-patient-count.ts
 */

// ─── Counter Anchors ───────────────────────────────────────────────

/** AEST (UTC+10) anchor date - recalibrated April 11 2026 */
const ANCHOR_DATE = new Date("2026-04-11T00:00:00+10:00")
export const ANCHOR_COUNT = 500

/** AEST (UTC+11) target date */
const TARGET_DATE = new Date("2026-12-31T23:59:59+11:00")
const TARGET_COUNT = 2_500

const TOTAL_GROWTH = TARGET_COUNT - ANCHOR_COUNT
const TOTAL_MS = TARGET_DATE.getTime() - ANCHOR_DATE.getTime()

// ─── Platform Stats ────────────────────────────────────────────────

/**
 * Canonical social proof metrics - SINGLE SOURCE OF TRUTH.
 *
 * All marketing pages, SEO data objects, and structured data must
 * reference these constants (or SOCIAL_PROOF_DISPLAY) instead of
 * hardcoding numbers. Prose copy (blog articles, meta descriptions)
 * must avoid fixed public review-time promises; internal
 * numbers here are the source for operational monitoring.
 *
 * Update here when real analytics data becomes available.
 */
export const SOCIAL_PROOF = {
  // ── Google star badge state ──
  // Stars are rendered visually only; do not surface review counts or testimonials.
  averageRating: 5.0,

  // ── Response Times ──
  /**
   * Average response in minutes (used for stat displays).
   * Provenance 2026-07-10 (prod, 30d): med-cert median 10.4 min paid→approved,
   * Rx median ~2.6h; overall median well under this figure, so 44 UNDER-claims
   * speed (the compliant direction). Re-verify against live data before ever
   * lowering it; replace with a live measure when wait-time wiring lands.
   */
  averageResponseMinutes: 44,
  /**
   * Typical turnaround for certificates specifically - must stay under 30 min.
   * Provenance 2026-07-10: measured med-cert median 10.4 min (21/21 auto-approved).
   */
  certTurnaroundMinutes: 20,

  // ── Platform Credentials ──
  ahpraVerifiedPercent: 100,
  employerAcceptancePercent: 98,
  operatingDays: 7,
  // operatingHoursStart/End were removed 2026-07-10: the service is 24/7
  // (operator decision 2026-07-03) and the computed "8am–10pm" display string
  // they fed was invisible to the hours-copy contract test. Never reintroduce
  // an operating-hours window here.
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
 * Pre-formatted display strings - use these in UI, like PRICING_DISPLAY.
 * Avoids scattering template literals and `.toFixed()` calls everywhere.
 */
export const SOCIAL_PROOF_DISPLAY = {
  // Drop the tilde — at the small grey font size used in the sticky bar
  // ticker, "~44 min" reads as "-44 min" to both human eyes and the video
  // review rubric. The number is already approximate (rounded median) so
  // we don't need the precision modifier. See Tier 1 review 2026-05-25
  // (/prescriptions + /medical-certificate).
  responseTime: `${SOCIAL_PROOF.averageResponseMinutes} min`,
  certTurnaround: `${SOCIAL_PROOF.certTurnaroundMinutes} min`,
  operatingSchedule: `${SOCIAL_PROOF.operatingDays} days a week`,
  refundGuarantee: `${SOCIAL_PROOF.refundPercent}% refund guarantee`,
  adminFee: `$${SOCIAL_PROOF.adminFee.toFixed(2)}`,
  gpComparison: `Typically ${SOCIAL_PROOF.gpPriceStandard} at a GP`,
  gpComparisonComplex: `Typically ${SOCIAL_PROOF.gpPriceComplex} at a GP`,
  doctorExperience: "AHPRA-registered doctors",
  sameDayDelivery: "Digital delivery after approval",
  certApproval: "Doctor-owned issue pathway",
  scriptFulfillment: "eScript after doctor approval",
  patientReturn: "Secure follow-up messages",
} as const

// ─── Google Reviews ────────────────────────────────────────────────

/**
 * Google Business Profile star-badge config.
 *
 * Set `enabled: true` once the Google Business Profile is verified. Keep
 * the visible badge to the Google mark + stars only; do not surface review
 * counts, review snippets, testimonial copy, or aggregateRating schema.
 *
 * The `GoogleReviewsBadge` component gates on `enabled` - nothing shows until
 * you flip this flag.
 */
export const GOOGLE_REVIEWS: {
  enabled: boolean
  placeId: string
  reviewsUrl: string
  rating: number
} = {
  /**
   * Flip to true once the Google Business Profile is verified.
   * Update rating from the Google Business dashboard first.
   */
  enabled: true,
  placeId: "7941901494114695128",
  /** Short link for patients to leave a review - share this directly */
  reviewsUrl: "https://g.page/r/CWqy3A7IKcX6EAE/review",
  /** Real rating from Google dashboard */
  rating: 5.0,
}

// ─── Counter Logic ─────────────────────────────────────────────────

/**
 * Returns the interpolated patient count for the current moment.
 * Used as a fallback when the DB count is unavailable.
 * Before anchor date → ANCHOR_COUNT.
 * After target date → TARGET_COUNT.
 * Between → linear interpolation.
 *
 * ⛔ COMPLIANCE (2026-07-10): DO NOT render this figure on any public surface,
 * email, or schema. On 2026-07-10 the interpolation displayed ~1,179 against
 * 112 ever-paying patients (~10x) and diverges further daily — a misleading-
 * representation exposure (ACL s18 / AHPRA advertising). All public renders
 * were removed on 2026-07-10 and `synthetic-patient-count-contract.test.ts`
 * pins that. Re-anchor to a real, verifiable count before any future use.
 */
export function getPatientCount(now: Date = new Date()): number {
  const elapsed = now.getTime() - ANCHOR_DATE.getTime()

  if (elapsed <= 0) return ANCHOR_COUNT
  if (elapsed >= TOTAL_MS) return TARGET_COUNT

  const progress = elapsed / TOTAL_MS
  return Math.floor(ANCHOR_COUNT + progress * TOTAL_GROWTH)
}

// getPatientCountFromDB has moved to @/lib/social-proof/server (server-only).
// Import it from there in API routes and Server Components.
// Client components should use /api/patient-count via usePatientCount().
