import {
  type CanonicalServiceId,
  getActiveServices,
} from "@/lib/services/service-catalog"

/**
 * Answer-engine-facing schema copy for each live service line.
 *
 * WHY THIS EXISTS: the entity graph (OrganizationSchema.hasOfferCatalog +
 * MedicalBusinessSchema.availableService) is what LLMs / AI Overviews parse to
 * learn "what does InstantMed do". It had drifted behind the real catalog —
 * women's health (live 2026-06-15) and the specialty pathways were missing, so
 * answer engines believed InstantMed only issued med certs + repeat scripts.
 *
 * SOURCE OF TRUTH SPLIT:
 *   - `SERVICE_CATALOG` (lib/services/service-catalog.ts) owns which services
 *     are live, their price, and their marketing slug. We derive from it, so a
 *     future service (or flipping `comingSoon`) updates the schema automatically.
 *   - This map owns the compliance-reviewed, answer-engine-facing name /
 *     serviceType / description.
 *
 * COMPLIANCE (instantmed-marketing-compliance-review, 2026-07-09): mirrors
 * llms.txt phrasing. No drug names, no outcome guarantees, no doctor-count /
 * FRACGP claims, and "no call" framing ONLY on the medical certificate line
 * (never on a prescribing pathway). No rating/review markup anywhere — the
 * entity uses `sameAs` identity links only (see ./same-as).
 */
const SERVICE_SCHEMA_COPY: Record<
  CanonicalServiceId,
  { name: string; serviceType: string; description: string }
> = {
  "med-cert": {
    name: "Medical Certificate",
    serviceType: "Medical certificate request",
    description:
      "Request a routine one-to-three-day work, carer's, or study medical certificate through a Medical Director-approved clinical pathway. Concerning or uncertain requests go to a doctor.",
  },
  "repeat-rx": {
    name: "Repeat Prescription",
    serviceType: "Repeat prescription request",
    description:
      "Request a repeat prescription for a stable, ongoing medication. An AHPRA-registered doctor reviews the request and may contact you if clinically needed.",
  },
  ed: {
    name: "Erectile Dysfunction",
    serviceType: "Erectile dysfunction assessment",
    description:
      "Structured form-first assessment for erectile dysfunction, reviewed by an AHPRA-registered doctor. Some cardiac, medication, or safety factors can make telehealth prescribing unsuitable.",
  },
  "hair-loss": {
    name: "Hair Loss",
    serviceType: "Hair loss assessment",
    description:
      "Structured form-first assessment for hair loss, reviewed by an AHPRA-registered doctor who contacts you if more information is clinically needed.",
  },
  "womens-health": {
    name: "Women's Health",
    serviceType: "Women's health assessment",
    description:
      "Structured form-first assessment for uncomplicated urinary tract infection (UTI), and for starting or switching the contraceptive pill, reviewed by an AHPRA-registered doctor.",
  },
  "weight-loss": {
    name: "Weight Management",
    serviceType: "Weight management assessment",
    description:
      "One-off weight-management assessment for eligible adults after structured eligibility and safety screening, reviewed by an AHPRA-registered doctor. Treatment and prescribing are not guaranteed.",
  },
}

/**
 * OfferCatalog `itemListElement` for OrganizationSchema.
 * price + priceCurrency are required for a valid Offer; url links each offer to
 * its marketing landing page to strengthen entity association.
 */
export function getServiceOffers(baseUrl: string) {
  return getActiveServices().map((service) => {
    const copy = SERVICE_SCHEMA_COPY[service.id]
    return {
      "@type": "Offer",
      price: service.priceFrom.toFixed(2),
      priceCurrency: "AUD",
      url: `${baseUrl}/${service.slug}`,
      itemOffered: {
        "@type": "Service",
        name: copy.name,
        serviceType: copy.serviceType,
        description: copy.description,
      },
    }
  })
}

/**
 * `availableService` MedicalProcedure entries for MedicalBusinessSchema.
 * Shares the same compliance-reviewed descriptions so the two nodes of the
 * shared `/#organization` entity never disagree about the service catalog.
 */
export function getAvailableServices() {
  return getActiveServices().map((service) => {
    const copy = SERVICE_SCHEMA_COPY[service.id]
    return {
      "@type": "MedicalProcedure",
      name: copy.name,
      description: copy.description,
    }
  })
}
