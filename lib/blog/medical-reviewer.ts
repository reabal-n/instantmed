/**
 * Reviewer attribution for health guides + condition/symptom pages.
 *
 * DEFAULT is the corporate "InstantMed Clinical Team" — no individual doctor is
 * named and no AHPRA number is shown on the page. This is the compliant default:
 * it avoids attributing a single named doctor to pages they have not personally
 * reviewed (an AHPRA "rubber-stamping" liability) and respects the CLAUDE.md rule
 * that public surfaces must not disclose individual doctor names.
 *
 * The named Medical Director is used ONLY on pillar pages they have personally
 * reviewed and signed off — add those slugs to `pillarReviewedSlugs`. Empty until
 * pages are individually reviewed; do not add a slug without a real review on file.
 *
 * Rationale: 3-LLM brain review 2026-06-03
 * (docs/audits/2026-06-03-3llm-brain-review.md). Replaced the earlier approach of
 * stamping one named MD across every page, which itself replaced retired fictional
 * author personas.
 */
export const clinicalTeamReviewer = {
  kind: "team" as const,
  name: "InstantMed Clinical Team",
}

export const medicalDirector = {
  kind: "person" as const,
  name: "Dr Reabal Najjar",
  ahpraNumber: "MED0002576546",
  title: "Medical Director",
  /** Public AHPRA register search — lets readers independently verify registration. */
  registerUrl: "https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx",
}

export type ArticleReviewer = typeof clinicalTeamReviewer | typeof medicalDirector

/** Slugs the Medical Director has personally reviewed and signed off. */
export const pillarReviewedSlugs = new Set<string>([])

export function getReviewer(slug: string): ArticleReviewer {
  return pillarReviewedSlugs.has(slug) ? medicalDirector : clinicalTeamReviewer
}

const ORG_NODE = {
  "@type": "MedicalOrganization",
  "@id": "https://instantmed.com.au/#organization",
  name: "InstantMed",
}

/** schema.org `reviewedBy` node for a slug: a credentialed Person for reviewed
 *  pillar pages, otherwise the InstantMed medical organisation. */
export function reviewedBySchema(slug: string) {
  const reviewer = getReviewer(slug)
  if (reviewer.kind === "person") {
    return {
      "@type": "Person",
      name: reviewer.name,
      jobTitle: reviewer.title,
      identifier: { "@type": "PropertyValue", propertyID: "AHPRA", value: reviewer.ahpraNumber },
      affiliation: ORG_NODE,
    }
  }
  return ORG_NODE
}
