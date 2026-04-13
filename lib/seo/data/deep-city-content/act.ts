/**
 * Deep city content -- Australian Capital Territory
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

import type { DeepCityContent } from "../deep-city-content"

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
          "For the tens of thousands of Australian Public Service (APS) employees in Canberra, taking sick leave often involves the bureaucratic requirement of providing a medical certificate. When it takes a week to see your GP, getting a certificate for a two-day illness becomes absurd. Telehealth addresses this mismatch directly - a certificate issued in under 30 minutes, available 24/7.",
        ],
      },
      {
        title: "Who Benefits Most in Canberra",
        paragraphs: [
          "Canberra's workforce is dominated by the Australian Public Service. APS enterprise agreements recognise medical certificates from AHPRA-registered doctors, including those issued via telehealth. Whether you work at Parliament House, the ATO in Symonston, Defence in Russell, or any of the dozens of Commonwealth agencies across Canberra - a telehealth certificate meets your leave requirements.",
          "University students at ANU, University of Canberra, ACU, and UNSW Canberra face similar access challenges. The ANU Health Service handles high volumes, particularly during exam periods. UC's Bruce campus has limited on-site medical facilities. For special consideration applications and assignment extensions, telehealth certificates are accepted by all four institutions.",
          "Canberra's diplomatic community - embassy staff, international organisations, and their families - often lack established GP relationships. Telehealth provides immediate access to an Australian doctor without needing a referral or existing patient relationship. This is also relevant for temporary residents working in Canberra on secondment.",
        ],
      },
      {
        title: "Medical Certificates in the ACT",
        paragraphs: [
          "The ACT follows the Fair Work Act 2009 for employment-related medical certificates. Employers cannot refuse a certificate simply because it was issued via telehealth - the Act requires a certificate from a 'registered health practitioner' without specifying consultation method. This applies to both public and private sector employers in the ACT.",
          "APS-specific requirements vary by agency, but the standard APS Enterprise Agreement accepts certificates from registered medical practitioners. If your agency's HR team queries a telehealth certificate, the Fair Work Act and the APS Enterprise Agreement both support its validity. We've never had a certificate rejected by any Commonwealth employer.",
          "For parliamentary staff, including ministerial advisers and APH employees - the same rules apply. The Parliamentary Service Act references the same medical certificate requirements as the Fair Work Act. A certificate from an AHPRA-registered doctor via telehealth is fully valid.",
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
        "The ACT's health complaints process operates through the ACT Human Rights Commission, which handles complaints about all health services including telehealth. InstantMed maintains a formal complaints process aligned with AHPRA requirements - complaints@instantmed.com.au with a 14-day response SLA.",
      ],
    },
    additionalFaqs: [
      { q: "Do APS agencies accept telehealth certificates?", a: "Yes. All APS enterprise agreements accept medical certificates from AHPRA-registered doctors. The consultation method is not relevant - what matters is that the doctor holds current registration. We've never had a certificate rejected by a Commonwealth employer." },
      { q: "Can ANU students use InstantMed?", a: "Yes. ANU accepts medical certificates from any AHPRA-registered doctor for special consideration applications. The same applies to UC, ACU, and UNSW Canberra." },
      { q: "Is InstantMed cheaper than a GP in Canberra?", a: `With Canberra's bulk-billing rate around 47% and typical gap fees of $50–$100, InstantMed is often more affordable for straightforward needs. Medical certificates start from ${PRICING_DISPLAY.MED_CERT} with no hidden costs.` },
      { q: "Can I use InstantMed in Queanbeyan?", a: "Yes. While Queanbeyan is technically in NSW, InstantMed works anywhere in Australia. Same service, same pricing, same certificates." },
      { q: "What about ACT public servants specifically?", a: "ACT Government employees follow the ACT Public Sector Enterprise Agreement, which accepts certificates from registered medical practitioners. Telehealth certificates meet this requirement." },
    ],
  },
}
