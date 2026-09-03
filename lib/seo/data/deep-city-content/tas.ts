/**
 * Deep city content -- Tasmania
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import type { DeepCityContent } from "../deep-city-content"

const MED_CERT_DOCUMENT_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")
const PRESCRIPTION_IF_APPROVED = getApprovedClaim("prescription_if_approved")

export const TAS_CITIES: Record<string, DeepCityContent> = {
  hobart: {
    healthStats: [
      { label: "Population", value: "240K+", context: "Greater Hobart area" },
      { label: "Avg GP wait", value: "4–8 days", context: "Tasmania has significant GP shortages" },
      { label: "Bulk-billing rate", value: "~55%", context: "Well below national average" },
      { label: "GP shortage", value: "Critical", context: "Tasmania has the oldest GP workforce in Australia" },
    ],
    sections: [
      {
        title: "Healthcare Access in Tasmania",
        paragraphs: [
          "Tasmania faces some of Australia's most acute healthcare challenges. The state has the oldest population and the oldest GP workforce of any Australian state or territory. As GPs retire and practices close, Tasmanians are finding it increasingly difficult to access primary care. Hobart's bulk-billing rate hovers around 55%, and in some suburbs, finding a GP accepting new patients is nearly impossible.",
          "Greater Hobart stretches from Bridgewater in the north to Kingston in the south, with the CBD, Sandy Bay, and the Eastern Shore making up the core. Traffic across the Tasman Bridge can add significant time to any cross-city GP visit. For residents of the Northern Suburbs (Glenorchy, Moonah, New Town), GP options are better, but wait times remain long.",
          "Tasmania's healthcare workforce shortage extends beyond GPs. The Royal Hobart Hospital's emergency department - the state's largest - regularly reports long wait times for non-urgent presentations. InstantMed's online pathway is limited to medical-certificate requests, eligible repeat-prescription reviews for a regular medicine already taken, and its named specialty assessments; other primary-care needs require appropriate local care.",
        ],
      },
      {
        title: "Who Benefits in Hobart",
        paragraphs: [
          "Hobart's growing tourism and hospitality sector - fuelled by MONA, the city's restaurant scene, and Tasmania's broader appeal - employs thousands of workers with irregular schedules. When an adult hospitality worker in Salamanca or the waterfront calls in sick, getting a same-day GP appointment can be difficult. They can submit a medical-certificate request online, with issue depending on the clinical assessment.",
          "University of Tasmania (UTAS) students at the Sandy Bay and Inveresk campuses need certificates for academic support during exam periods. The UTAS medical service is stretched, and external GP availability near campus is limited. TasTAFE students face similar challenges across their Hobart and Launceston campuses.",
          `Tasmania's public service is the state's largest employer, and workers may need medical documentation for sick leave. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
        ],
      },
      {
        title: "Medical Certificates in Tasmania",
        paragraphs: [
          `Tasmanian employers apply their own workplace evidence policies under the Fair Work Act 2009 or relevant state industrial instruments. ${EMPLOYER_POLICY_CAVEAT}`,
          "Hospitality, tourism, aquaculture, forestry, and agriculture employers may require medical documentation for absences. Workers should check the current evidence policy that applies to their workplace.",
          "UTAS sets its own policy for medical certificates used for academic support. Adults aged 18+ should check current institution requirements before submitting a request.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Hobart",
      paragraphs: [
        `Hobart and Greater Hobart have approximately 60 community pharmacies, with the majority concentrated in the CBD (Elizabeth Street, Liverpool Street), Sandy Bay, Glenorchy, and Kingston. All pharmacies accept eScripts. ${PRESCRIPTION_IF_APPROVED}`,
        "Extended-hours pharmacy options are more limited in Hobart than in mainland capitals, but several locations in the CBD and at Eastlands Shopping Centre (Rosny) operate until 8–9pm. For urgent medication needs, the Royal Hobart Hospital pharmacy provides 24-hour dispensing for emergency prescriptions.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Tasmania",
      paragraphs: [
        "Tasmania follows national AHPRA standards for telehealth. The Tasmanian Government has been a strong advocate for telehealth, recognising its critical role in addressing the state's GP shortage and geographic challenges. Tasmania's Digital Health Strategy includes telehealth as a priority area for healthcare access improvement.",
        "Prescribing in Tasmania follows the TGA national framework. InstantMed accepts eligible prescribing requests only through repeat-prescription reviews for a regular medicine the patient already takes and its erectile dysfunction, hair loss, women's health, and weight-management assessment pathways. Every prescribing request requires an individual doctor review, and an eScript is sent only if approved. The Tasmanian Poisons Act aligns with national scheduling for controlled substances, and Schedule 8 medications require Tasmanian Department of Health authority. InstantMed does not prescribe Schedule 8 medications.",
        `The Health Complaints Commissioner Tasmania oversees complaints about health services including telehealth. InstantMed maintains a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Can UTAS students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. The University of Tasmania sets its own policy for academic support, missed assessment documentation, and coursework documentation, so check current requirements before submitting." },
      { q: "Is telehealth available across all of Tasmania?", a: "Yes. InstantMed works anywhere in Tasmania with internet access - Hobart, Launceston, Devonport, Burnie, the East Coast, or the West Coast. Pricing is identical statewide." },
      { q: "How do Tasmanian state government employers assess telehealth certificates?", a: `Each employer applies its own workplace evidence policy. ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Can I use InstantMed in Launceston or the North-West?", a: "Adults aged 18+ can submit a listed request with internet access from Launceston, Devonport, Burnie, or elsewhere in Tasmania." },
      { q: "Is InstantMed cheaper than a GP in Hobart?", a: `With Hobart's bulk-billing rate around 55% and gap fees of $40–$80 common, InstantMed is often more affordable for a straightforward medical-certificate request. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
  launceston: {
    healthStats: [
      { label: "Population", value: "90K+", context: "Tasmania's second largest city" },
      { label: "Avg GP wait", value: "4–7 days", context: "Among the longest in Tasmania" },
      { label: "Bulk-billing rate", value: "~55%", context: "Lowest of any major Tasmanian centre" },
      { label: "GP shortfall", value: "Significant", context: "Tasmania has the worst GP-to-population ratio nationally" },
    ],
    sections: [
      {
        title: "Tasmania's GP Crisis",
        paragraphs: [
          "Tasmania has the worst GP-to-population ratio of any Australian state, and Launceston sits at the sharp end of this crisis. Northern Tasmania has experienced multiple clinic closures in recent years, leaving thousands of residents unable to find a regular GP. Walk-in appointments are often unavailable, and new patient registrations have waiting lists that stretch for months.",
          "The problem is structural: Tasmania's ageing population requires more GP services, but the state struggles to attract and retain doctors. Junior doctors trained in Tasmania often leave for better-paying positions on the mainland. The result is a shrinking GP workforce serving a population with growing healthcare needs.",
          "For residents of Northern Tasmania - from Launceston to Devonport, Burnie, and the North-East - getting a straightforward medical certificate can mean a multi-day wait or a drive to the nearest clinic with availability. Telehealth doesn't replace the ongoing GP relationship, but it provides an online pathway for that medical-certificate request.",
        ],
      },
      {
        title: "Students and Workers in Northern Tasmania",
        paragraphs: [
          "The University of Tasmania's Launceston campus (Newnham and Inveresk) serves thousands of students. UTAS sets its own policy for medical certificates used for academic support. Adults aged 18+ should check current requirements before submitting a request.",
          "Launceston's economy is anchored by healthcare (Launceston General Hospital), education, agriculture, and tourism. The growing wine and food tourism sector in the Tamar Valley adds seasonal employment demand. Workers across all these sectors benefit from telehealth access when GP appointments are scarce.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Launceston",
      paragraphs: [
        "Launceston has pharmacy coverage in the CBD, Prospect, Kings Meadows, and Mowbray. All major chains and independent pharmacies accept eScripts. Devonport and Burnie pharmacies also accept eScripts from telehealth consultations.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in Tasmania",
      paragraphs: [
        "Tasmania follows national AHPRA telehealth standards. The Tasmanian Government has identified telehealth as a critical tool for addressing the state's GP shortage, particularly in Northern Tasmania.",
        "Prescribing follows TGA national regulations. eScripts work across all Tasmanian pharmacies. The Tasmanian health system has been among the most supportive of telehealth adoption nationally.",
      ],
    },
    additionalFaqs: [
      { q: "Can I use InstantMed if I can't find a GP in Launceston?", a: "Adults aged 18+ can submit medical-certificate requests and eligible repeat-prescription reviews for a regular medicine they already take. InstantMed does not offer general consultations, so new or ongoing concerns outside its listed specialty pathways need a regular GP or other appropriate care. Every prescribing request requires doctor review, and an eScript is sent only if approved." },
      { q: "Does InstantMed serve Devonport and Burnie?", a: "Yes. We serve all of Tasmania - Launceston, Devonport, Burnie, the North-East, and the North-West Coast." },
      { q: "How do Tasmanian employers assess certificates?", a: `Each employer, including Tasmanian government agencies, applies its own workplace evidence policy. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
    ],
  },
}
