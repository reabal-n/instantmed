/**
 * Deep city content -- Cross-border regions
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import type { DeepCityContent } from "../deep-city-content"

const MED_CERT_DOCUMENT_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")

export const crossBorderCities: Record<string, DeepCityContent> = {
  "albury-wodonga": {
    healthStats: [
      { label: "Population", value: "95K+", context: "Cross-border twin cities" },
      { label: "Avg GP wait", value: "3–5 days", context: "Consistent across both sides" },
      { label: "Bulk-billing rate", value: "~62%", context: "Below both state averages" },
      { label: "Cross-border", value: "NSW/VIC", context: "Healthcare systems straddle state line" },
    ],
    sections: [
      {
        title: "Cross-Border Healthcare Challenges",
        paragraphs: [
          "Albury-Wodonga sits on the Murray River, straddling the NSW-Victoria border. This geographic quirk creates unique healthcare complications. Residents on the Albury (NSW) side may find it easier to see a GP in Wodonga (VIC), or vice versa. Hospital catchments, health district boundaries, and some state-specific health programs don't neatly align with where people actually live and work.",
          "Despite being a combined population of 95,000+, the twin cities face GP access challenges common to regional Australia. Several practices have restricted new patient intakes, and same-day appointments are rarely available for non-urgent needs. The nearest major tertiary hospitals are in Melbourne (3+ hours) and Canberra (3.5 hours).",
          `AHPRA registration is national, and InstantMed's listed services are available to eligible adults aged 18+ on both sides of the border. ${EMPLOYER_POLICY_CAVEAT} eScripts can be presented at participating pharmacies in either state if a prescribing request is approved.`,
        ],
      },
      {
        title: "Workers and Students in the Region",
        paragraphs: [
          "Charles Sturt University's Albury-Wodonga campus and TAFE NSW/GOTAFE serve the region's student population. Both assess telehealth medical certificates under their own policies for academic support applications.",
          "The region's economy spans agriculture, manufacturing, defence (Bandiana and Bonegilla), and a significant healthcare sector (Albury Wodonga Health). Workers across these industries face the usual regional challenges with GP access. An online medical-certificate request or eligible repeat-prescription review can be practical for shift workers and those in time-sensitive situations.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Albury-Wodonga",
      paragraphs: [
        "Both Albury and Wodonga have strong pharmacy networks. The Albury CBD, Wodonga Plaza, and suburban centres all have Chemist Warehouse, Priceline, and independent pharmacy options. All accept eScripts from telehealth consultations, regardless of which side of the border you're on.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Across State Borders",
      paragraphs: [
        "AHPRA registration is national. InstantMed's listed services are available to eligible adults aged 18+ in NSW and Victoria, while employers and institutions apply their own evidence policies.",
        "Prescribing follows national TGA regulations. eScripts work identically in both states. PBS pricing applies at all pharmacies regardless of state.",
      ],
    },
    additionalFaqs: [
      { q: "Does it matter which side of the border I live on?", a: "InstantMed's listed services are available to eligible adults aged 18+ in both NSW and Victoria. Employer policies can vary in either state." },
      { q: "Can I fill my eScript on either side of the border?", a: "Yes. eScripts work at any Australian pharmacy - Albury, Wodonga, or anywhere else." },
      { q: "Can certificates support Albury Wodonga Health documentation?", a: `${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
    ],
  },
}
