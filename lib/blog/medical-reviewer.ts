/**
 * Single source of truth for the named medical reviewer shown on health guides.
 *
 * Real, AHPRA-registered Medical Director — used for E-E-A-T reviewer attribution
 * in the article footer byline (small/footnote style) and the `reviewedBy` JSON-LD
 * on /blog/[slug]. This replaced the retired fictional author personas (2026-06-03).
 *
 * Do NOT add unverified post-nominals (e.g. FRACGP, MBBS) — see the doctor-model
 * rules in CLAUDE.md. Name + AHPRA number + role is the verified, compliant set.
 */
export const medicalReviewer = {
  name: "Dr Reabal Najjar",
  ahpraNumber: "MED0002576546",
  title: "Medical Director",
  organization: "InstantMed",
  /** Public AHPRA register search — lets readers independently verify registration. */
  registerUrl: "https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx",
} as const
