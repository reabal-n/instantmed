/**
 * Deep city content -- Australian Capital Territory
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import type { DeepCityContent } from "../deep-city-content"

const MED_CERT_DOCUMENT_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")

export const ACT_CITIES: Record<string, DeepCityContent> = {
  canberra: {
    healthStats: [
      { label: "Population", value: "470K+", context: "Australia's capital city" },
      { label: "Avg GP wait", value: "5–10 days", context: "One of the longest waits nationally" },
      { label: "Bulk-billing rate", value: "~47%", context: "Lowest in Australia" },
      { label: "GP shortage", value: "Severe", context: "ACT has the fewest GPs per capita of any jurisdiction" },
    ],
    sections: [
      {
        title: "Canberra's GP Access Crisis",
        paragraphs: [
          "Canberra has a well-documented GP shortage. The ACT consistently has the lowest bulk-billing rate in Australia - around 47% compared to the national average of 78%. For many Canberrans, seeing a GP means either waiting 5–10 days for a bulk-billed appointment or paying gap fees of $50–$100 for a same-day consultation. When you're unwell and just need a medical certificate, neither option is ideal.",
          "The problem is structural. Canberra's population has grown rapidly - from 350,000 to 470,000 in two decades - but GP numbers haven't kept pace. New suburbs in Gungahlin, Molonglo Valley, and Coombs have limited medical infrastructure. Residents often travel 20–30 minutes to see a GP in Woden, Belconnen, or Civic, even for routine matters.",
          "For the tens of thousands of Australian Public Service (APS) employees in Canberra, taking sick leave often involves the bureaucratic requirement of providing a medical certificate. When it takes a week to see your GP, getting a certificate for a two-day illness becomes absurd. Telehealth addresses this mismatch directly - a request submitted online, with digital delivery if approved.",
        ],
      },
      {
        title: "Who Benefits Most in Canberra",
        paragraphs: [
          `Canberra's workforce is dominated by the Australian Public Service. APS leave-evidence requirements can vary by agency, including at Parliament House, the ATO in Symonston, Defence in Russell, and other Commonwealth agencies. Check your agency's current policy for the request. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          "University students at ANU, University of Canberra, ACU, and UNSW Canberra face similar access challenges. The ANU Health Service handles high volumes, particularly during exam periods. UC's Bruce campus has limited on-site medical facilities. For academic support requests and coursework documentation, telehealth certificates are handled according to each institution's policy.",
          "Canberra's diplomatic community - embassy staff, international organisations, and their families - often lack established GP relationships. Telehealth provides a focused medical-certificate or repeat-prescription request without needing an established local GP. This is also relevant for temporary residents working in Canberra on secondment.",
        ],
      },
      {
        title: "Medical Certificates in the ACT",
        paragraphs: [
          `For employment-related absences, ACT employers assess medical certificates under their own policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          `APS-specific requirements can vary by agency. If your agency's HR team has questions about medical documentation, check its current leave-evidence policy. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          `For parliamentary staff, including ministerial advisers and APH employees, leave-evidence requirements are set by the relevant employer. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Canberra",
      paragraphs: [
        "Canberra has approximately 120 community pharmacies across the territory, well-distributed across town centres. Every major suburb centre - Civic, Belconnen, Woden, Tuggeranong, Gungahlin - has multiple pharmacy options, all accepting eScripts. When InstantMed issues a prescription, you receive an SMS with a QR code that any ACT pharmacy can scan.",
        "Several Canberra pharmacies offer extended hours, including Chemist Warehouse locations at Belconnen and Tuggeranong, and pharmacies within the Canberra Centre. An eScript issued in the evening can often be filled the same night. For medications dispensed under the PBS, you'll pay the standard PBS co-payment regardless of whether the script came from telehealth or in-person.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in the ACT",
      paragraphs: [
        "The ACT follows national AHPRA and Medical Board of Australia standards for telehealth. The ACT Government has actively promoted telehealth as part of its strategy to address the territory's GP shortage. ACT Health recognises telehealth as a legitimate healthcare delivery method for appropriate clinical scenarios.",
        "Prescribing in the ACT follows the TGA national framework. Most medications can be prescribed via telehealth and dispensed at any ACT pharmacy via eScript. Schedule 8 controlled substances require ACT Health authority. InstantMed does not prescribe Schedule 8 medications.",
        `The ACT's health complaints process operates through the ACT Human Rights Commission, which handles complaints about health services including telehealth. InstantMed maintains a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Do APS agencies assess telehealth certificates under their own policies?", a: `APS agencies set their own policies for medical certificates and leave evidence. Check your agency's current policy for the request. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "How should ANU students check medical-documentation requirements?", a: "ANU, UC, ACU, and UNSW Canberra set their own academic-support and medical-documentation policies. Check the relevant institution's current process before submitting a request." },
      { q: "Is InstantMed cheaper than a GP in Canberra?", a: `With Canberra's bulk-billing rate around 47% and typical gap fees of $50–$100, InstantMed is often more affordable for straightforward needs. Medical certificates start from ${PRICING_DISPLAY.MED_CERT} with no hidden costs.` },
      { q: "Can I use InstantMed in Queanbeyan?", a: "Yes. While Queanbeyan is technically in NSW, InstantMed works anywhere in Australia. Same service, same pricing, same certificates." },
      { q: "What about ACT public servants specifically?", a: `ACT Government employees should check the current ACT Public Sector leave-evidence process. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
    ],
  },
}
