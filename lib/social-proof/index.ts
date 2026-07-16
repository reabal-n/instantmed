/**
 * Centralized Social Proof - Single Source of Truth
 *
 * Only verified operational and trust primitives belong here. The synthetic
 * patient-count interpolation, DB-max fallback, public API, and client hook
 * were retired on 2026-07-14 after all rendered consumers were removed.
 */

// ─── Platform Stats ────────────────────────────────────────────────

/**
 * Canonical social proof metrics - SINGLE SOURCE OF TRUTH.
 *
 * All marketing pages, SEO data objects, and structured data must
 * reference these constants instead of hardcoding numbers. Prose copy (blog
 * articles, meta descriptions) must avoid fixed public review-time promises;
 * internal numbers here are the source for operational monitoring.
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
