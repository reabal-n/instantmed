/**
 * Canonical external identity profiles for the InstantMed organization entity.
 *
 * `sameAs` is the primary entity-linking signal that answer engines (ChatGPT,
 * Perplexity, Gemini) and search engines use to resolve "InstantMed" to a known
 * real-world entity — and therefore whether to cite it. Every URL here is a
 * verified, InstantMed-controlled or authoritative public profile.
 *
 * COMPLIANCE: these are IDENTITY links only. Listing a review platform here as
 * an entity anchor is allowed; rendering its ratings, review counts, star
 * scores, or testimonials on any InstantMed surface — or emitting aggregateRating
 * schema — is NOT (AHPRA/TGA regulated-health advertising). Keep this list to
 * identity anchors; never derive a rating from it.
 */
export const SAME_AS_PROFILES: readonly string[] = [
  // Australian Business Register — authoritative legal-entity record (ABN 64 694 559 334)
  "https://abr.business.gov.au/ABN/View?abn=64694559334",
  // LegitScript certified-healthcare-merchant listing
  "https://www.legitscript.com/websites/?checker_keywords=instantmed.com.au",
  // ProductReview.com.au — claimed Australian listing
  "https://www.productreview.com.au/listings/instantmed",
  // Trustpilot Australia — public profile
  "https://au.trustpilot.com/review/instantmed.com.au",
]
