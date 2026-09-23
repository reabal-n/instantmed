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
  // ── Platform Credentials ──
  ahpraVerifiedPercent: 100,
  operatingDays: 7,
  // operatingHoursStart/End were removed 2026-07-10: the service is 24/7
  // (operator decision 2026-07-03) and the computed "8am–10pm" display string
  // they fed was invisible to the hours-copy contract test. Never reintroduce
  // an operating-hours window here.
  // averageRating / employerAcceptancePercent / doctorCount / the outcome
  // stats (sameDayDelivery/certApproval/scriptFulfillment/patientReturn) were
  // deleted 2026-07-16: unverifiable outcome and identity claims that the
  // advertising rules ban from ever rendering. Pinned deleted by
  // social-proof-banned-metrics.test.ts — do not reintroduce.

  // ── Guarantees ──
  refundPercent: 100,
  adminFee: 4.95,

  // ── GP Comparison (for context, not exact) ──
  gpPriceStandard: "~$72",
  gpPriceComplex: "~$100",
} as const

// ─── ProductReview ────────────────────────────────────────────────

/**
 * Operator-approved logo + stars badge, verified against the public listing
 * on 2026-09-23. This is a dated snapshot, not a live rating feed. Recheck the
 * listing before changing the rating. No review counts, excerpts or schema.
 */
export const PRODUCT_REVIEWS = {
  enabled: true,
  reviewsUrl: "https://www.productreview.com.au/listings/instantmed",
  rating: 5.0,
  verifiedAt: "2026-09-23",
} as const
