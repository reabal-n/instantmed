/**
 * Deep city content -- Western Australia
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import type { DeepCityContent } from "../deep-city-content"

const MED_CERT_DOCUMENT_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")
const AVAILABILITY = getApprovedClaim("availability_24_7")
const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")
const PRESCRIPTION_IF_APPROVED = getApprovedClaim("prescription_if_approved")

export const WA_CITIES: Record<string, DeepCityContent> = {
  perth: {
    healthStats: [
      { label: "Population", value: "2.1M+", context: "Australia's most isolated capital" },
      { label: "Avg GP wait", value: "3–6 days", context: "Worse in northern and southern suburbs" },
      { label: "Bulk-billing rate", value: "~65%", context: "Among the lowest of capital cities" },
      { label: "Metro spread", value: "150km", context: "One of the world's longest urban sprawls" },
    ],
    sections: [
      {
        title: "Healthcare in Perth: Isolation and Sprawl",
        paragraphs: [
          "Perth is the most geographically isolated capital city in the world, and its urban footprint reflects this - the metropolitan area stretches roughly 150 kilometres from Two Rocks in the north to Mandurah in the south. This sprawl creates unique healthcare access challenges. A resident in Joondalup might face a 45-minute drive to a clinic with availability, while someone in Rockingham faces similar distances heading north.",
          "Perth's GP shortage is well-documented and worsening. Western Australia has one of the lowest GP-to-population ratios of any Australian state, and many suburban practices have closed or reduced hours in recent years. Bulk-billing is increasingly rare - many Perth GPs now charge gap fees of $50–$100, making a standard consultation one of the most expensive in the country.",
          "For Perth's large FIFO (fly-in, fly-out) workforce - miners, oil and gas workers, construction crews - healthcare access is doubly complicated. When you're home for your R&R period, the last thing you want is to spend a day in a waiting room. And when you're on site in the Pilbara or Goldfields, getting to a doctor might mean a flight. InstantMed lets adults aged 18+ submit a medical-certificate request or eligible repeat-prescription review for a regular medicine they already take online.",
        ],
      },
      {
        title: "Medical Certificates for WA Workers",
        paragraphs: [
          `Western Australian workers may be covered by the Fair Work Act or the WA Industrial Relations Act, depending on their employer. Leave-evidence requirements can vary, so check the current employer policy for your request. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          `WA's mining and resources sector has its own expectations around medical documentation. Many mining companies require evidence for absences, and each applies its own policy. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT} Site medicals, return-to-work clearances, and fitness-for-duty decisions need the employer's own pathway.`,
          `Perth's time zone (AWST, UTC+8) means WA is 2–3 hours behind the eastern states. ${AVAILABILITY}`,
        ],
      },
      {
        title: "Regional WA and Telehealth",
        paragraphs: [
          "Western Australia covers a third of the continent, and outside the Perth metropolitan area, healthcare access drops off dramatically. Towns like Geraldton, Kalgoorlie, Karratha, and Broome have limited GP availability. For residents and workers in these areas, an online medical-certificate request or eligible repeat-prescription review can avoid a long trip for that focused need.",
          "Even within the Perth metro area, the northern and southern growth corridors (Yanchep, Baldivis, Byford) are underserviced by GPs. New housing developments have outpaced medical infrastructure, leaving thousands of families without a nearby clinic. InstantMed provides focused online medical-certificate and repeat-prescription review pathways; it does not replace comprehensive local primary care.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Perth",
      paragraphs: [
        "Perth has approximately 650 community pharmacies across the metropolitan area, with good coverage in most suburbs. All major pharmacy chains - Chemist Warehouse, Priceline, TerryWhite Chemmart, Amcal, and Blooms - accept eScripts at their WA locations.",
        `eScript adoption in Western Australia has been strong, with the vast majority of pharmacies now fully electronic. ${PRESCRIPTION_IF_APPROVED} Extended-hours pharmacies are available in most major shopping centres, and several CBD and suburban pharmacies operate late.`,
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Western Australia",
      paragraphs: [
        "Western Australia's telehealth framework follows national AHPRA and Medical Board of Australia guidelines. The WA Department of Health has been a proponent of telehealth expansion, recognising the state's unique geographic challenges. WA Health's digital health strategy includes telehealth as a critical component for both metropolitan and regional healthcare delivery.",
        "Prescribing via telehealth in WA follows national TGA regulations. InstantMed accepts eligible prescribing requests only through repeat-prescription reviews for a regular medicine the patient already takes and its erectile dysfunction, hair loss, women's health, and weight-management assessment pathways. Every prescribing request requires an individual doctor review, and an eScript is sent only if approved. Schedule 8 controlled substances require WA Department of Health authority and typically an in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        `WA's state-based industrial relations system covers some workers who are not under the federal Fair Work system. Whether you are covered by the Fair Work Act or the WA Industrial Relations Act, check the current employer policy for leave evidence. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed work on WA time?", a: AVAILABILITY },
      { q: "Can FIFO workers use InstantMed from site?", a: `Adults aged 18+ can submit a medical-certificate request with internet access. If approved, the certificate is sent by email. Mining employers apply their own evidence policies. ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Are Perth GPs really that expensive?", a: "Perth has some of the lowest bulk-billing rates in Australia. Many GPs charge gap fees of $50–$100 per standard consultation. For a straightforward medical certificate, InstantMed offers a more affordable flat-fee alternative without compromising on clinical quality." },
      { q: "Can I use InstantMed in regional WA?", a: "Adults aged 18+ can submit a listed request with an internet connection from Perth, Geraldton, Kalgoorlie, Karratha, Broome, or elsewhere in Western Australia. Published service pricing does not change by Australian location." },
      { q: "Do WA mining companies assess telehealth certificates under their own policies?", a: `Mining companies operating in WA set their own policies for medical certificates and leave evidence. Check the current employer policy for your request. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
    ],
  },
  bunbury: {
    healthStats: [
      { label: "Population", value: "75K+", context: "Largest regional city in Western Australia" },
      { label: "Avg GP wait", value: "4–7 days", context: "Longer in the surrounding South-West" },
      { label: "Bulk-billing rate", value: "~62%", context: "Among the lowest nationally - WA trend" },
      { label: "Distance to Perth", value: "175km", context: "Roughly two hours by road" },
    ],
    sections: [
      {
        title: "Healthcare in the South-West of WA",
        paragraphs: [
          "Bunbury is Western Australia's second-largest urban area and the main service city for the South-West - a region that takes in Busselton, Margaret River, Augusta, Manjimup, and Collie. Despite being only two hours from Perth, the region operates in a genuinely different healthcare environment. Western Australia has one of the lowest GP-to-population ratios in the country, and Bunbury's bulk-billing rate sits around 62% - well below the national average. Gap fees of $40–$80 are common, and same-day appointments for non-urgent needs are rarely available.",
          "The Modified Monash Model (MMM) classifies much of the South-West as a workforce priority area, reflecting persistent difficulty attracting and retaining GPs to regional WA. Bunbury Hospital (St John of God and the public South West Health Campus) provides acute and specialist services, but primary care is the pinch point. Residents often face a choice between waiting a week for a bulk-billed appointment locally, paying a premium for a same-day private consult, or driving two hours to Perth - which, for a simple sick note, is absurd.",
          "For residents of Busselton, Dunsborough, Margaret River, Augusta, and the smaller Capes-region communities, Bunbury is the usual stop for GP care. A round trip from Margaret River to Bunbury is 160 kilometres and two-and-a-half hours of driving, not including clinic waiting time. Adults aged 18+ can submit InstantMed's listed medical-certificate and repeat-prescription review requests online without that travel.",
        ],
      },
      {
        title: "South-West Workers, Wine Region Tourism, and Students",
        paragraphs: [
          "The South-West's economy spans alumina refining and mining (Alcoa Wagerup, South32 Worsley), forestry and timber, dairy and beef, and one of Australia's most developed wine tourism regions. Each of these industries employs significant numbers of shift workers, seasonal staff, and people whose schedules simply don't align with traditional 9-to-5 GP clinic hours. Hospitality staff in Margaret River's cellar doors and restaurants, vineyard workers during vintage, and alumina refinery crews all benefit from telehealth's evening availability.",
          "Edith Cowan University's South West campus in Bunbury and South Regional TAFE serve thousands of students across the region. Each institution sets its own policy for medical certificates used for academic support, missed assessment documentation, and coursework documentation. Adults aged 18+ should check current requirements before submitting a request.",
          "For the growing remote-work population in the region - people who moved from Perth for lifestyle reasons and kept their city jobs - telehealth provides the same convenience they were used to in the metro area. There is no penalty for living in the South-West: same doctors, same pricing, same turnaround.",
        ],
      },
      {
        title: "Medical Certificates and WA Industrial Law",
        paragraphs: [
          `Western Australia has a dual industrial relations system. Most private-sector workers in Bunbury and the South-West are covered by the federal Fair Work Act, while some WA-specific employers fall under the state Industrial Relations Act. Employers under either system set their own evidence policies. ${EMPLOYER_POLICY_CAVEAT}`,
          `Mining and resources employers often have stricter internal documentation requirements. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT} Fitness-for-duty, site medical, and compensation requests need a different pathway.`,
          `Perth operates on Australian Western Standard Time (AWST, UTC+8), two hours behind the eastern states. ${AVAILABILITY}`,
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "Telehealth is not a substitute for your regular GP relationship. Chronic disease management, screening, immunisations, hands-on physical examinations, dressings, and injections all still require face-to-face care. InstantMed provides focused online pathways for medical-certificate requests and eligible repeat-prescription reviews for a regular medicine already taken.",
          "For residents of Margaret River, Augusta, and the smaller Capes communities, the practical difference can be substantial. A round trip to a Bunbury GP for a medical-certificate request or eligible repeat-prescription review can absorb most of a working day, plus fuel and waiting-room time. InstantMed lets adults aged 18+ submit those focused requests from home while leaving other care with their regular GP or an appropriate in-person service.",
          `If a listed request is not appropriate for telehealth, the doctor will refer you to in-person care. The same suitability boundary applies across the South-West. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "Practical Cost and Time Comparison for the South-West",
        paragraphs: [
          "GP economics in WA's South-West have moved in line with the broader trend. Bulk-billing has declined to one of the lowest rates in the country, gap fees of $40–$80 are common, and waiting times for non-urgent appointments stretch to a week. For households across Bunbury, the Capes, and the broader South-West, the combined cost of attending a GP for a medical-certificate request or eligible repeat-prescription review - fuel into Bunbury, the gap fee, lost work time, and the wait - can exceed InstantMed's listed fee for the corresponding service.",
          "InstantMed's flat-fee model removes the unpredictability. You know what a medical-certificate request or repeat-prescription review costs before you start the intake. There are no gap fees and no surprise add-ons at the end of the consultation. For families budgeting through the cost-of-living pressures that have hit regional WA particularly hard, that predictability matters as much as the time saved.",
          "Requests can be submitted and reviewed 24/7. After review, an approved medical certificate is sent as a PDF; an eScript is sent only if a prescribing request is approved. The process stays online from intake to delivery. For Bunbury and South-West residents, that avoids competing for a same-day clinic appointment for these focused requests.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Bunbury",
      paragraphs: [
        "Bunbury has solid pharmacy coverage across the CBD, Bunbury Forum, Eaton Fair, and Treendale. Chemist Warehouse, Priceline, TerryWhite Chemmart, and independent pharmacies all accept eScripts. In surrounding towns - Busselton, Dunsborough, Margaret River, Collie, Harvey, Australind - local pharmacies also accept the QR code from an InstantMed prescription.",
        "Extended-hours options are limited in regional WA compared with Perth, but several locations in Bunbury Forum and the CBD trade into the early evening. Standard PBS co-payments apply to telehealth-issued scripts exactly as they would to face-to-face prescriptions - no pricing difference at the counter.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Western Australia",
      paragraphs: [
        "Western Australia follows the national AHPRA and Medical Board of Australia framework for telehealth. The WA Department of Health has explicitly supported telehealth as part of its digital health strategy, recognising that the state's scale and sparse population make traditional face-to-face primary care genuinely impossible for a significant share of residents.",
        "Prescribing follows national TGA rules. InstantMed accepts eligible prescribing requests only through repeat-prescription reviews for a regular medicine the patient already takes and its named specialty assessment pathways. Every prescribing request requires an individual doctor review, and an eScript is sent only if approved. Schedule 8 medications - strong opioids and stimulants - require WA Department of Health authority and typically in-person assessment, and are not prescribed through InstantMed.",
        `The WA-specific Industrial Relations Act applies to some employees in the state, while the federal Fair Work Act applies to others. Employers set their own workplace evidence policies. ${EMPLOYER_POLICY_CAVEAT}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover Busselton, Margaret River, and the Capes?", a: "Yes. Busselton, Dunsborough, Yallingup, Margaret River, Augusta, and all the smaller Capes-region communities. Any location in the South-West with internet access is covered." },
      { q: "Does InstantMed operate on WA time?", a: AVAILABILITY },
      { q: "Can Alcoa Wagerup and South32 workers use InstantMed?", a: `Adults aged 18+ can submit a medical-certificate request online. Each employer applies its own evidence policy. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Is InstantMed cheaper than seeing a GP in Bunbury?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Bunbury's bulk-billing rate around 62% and typical gap fees of $40–$80, InstantMed is often more affordable for a straightforward medical-certificate request or eligible repeat-prescription review.` },
    ],
  },
  fremantle: {
    healthStats: [
      { label: "Population", value: "32K+", context: "Perth's historic port city" },
      { label: "Avg GP wait", value: "3–6 days", context: "Similar to wider Perth metro" },
      { label: "Bulk-billing rate", value: "~55%", context: "Among the lowest in Perth's southern corridor" },
      { label: "Port workforce", value: "Significant", context: "Shift-heavy maritime and logistics sector" },
    ],
    sections: [
      {
        title: "Healthcare in Fremantle and Perth's Southern Corridor",
        paragraphs: [
          "Fremantle and the surrounding suburbs - Cockburn, Melville, East Fremantle, Hamilton Hill, South Fremantle - sit in Perth's southern corridor, an area where GP access has been tightening for years. Bulk-billing rates in Fremantle are well below the Perth metro average, with many practices charging gap fees of $50–$90. Several clinics have closed or reduced hours in recent years, and those that remain often book a week out for non-urgent appointments.",
          "Fremantle's economy is built around the port, maritime services, hospitality, and the arts. Fremantle Port is one of Australia's busiest, and the logistics, stevedoring, and transport workforce operates around the clock. Shift workers aged 18+ can submit a medical-certificate request online when it suits them. If approved, the certificate is emailed as a PDF.",
          "The suburb has also become a magnet for young professionals, creatives, and students from Murdoch University and Notre Dame University (Fremantle campus). Many are casual workers or self-employed. A doctor visit that costs $80 out of pocket and requires half a day off work is a genuine financial burden. InstantMed offers an online pathway for medical-certificate requests and eligible repeat-prescription reviews for a regular medicine already taken.",
        ],
      },
      {
        title: "Port Workers, Hospitality, and Shift Work in Fremantle",
        paragraphs: [
          "Fremantle Port handles a significant share of Western Australia's container and general cargo trade. The logistics chain - from stevedores and truck drivers to customs brokers and warehouse staff - operates on rotating shifts with limited flexibility. Adults aged 18+ can submit a medical-certificate request online around those rosters; digital delivery occurs only if approved.",
          "Fremantle's hospitality strip - the Cappuccino Strip along South Terrace, the Fishing Boat Harbour, and the growing restaurant scene on High Street and Market Street - employs a large casual workforce. These workers are often young, on limited incomes, and working irregular hours across multiple venues. A medical certificate from InstantMed costs less than the gap fee at most Fremantle GPs and doesn't require giving up a shift to sit in a waiting room.",
          "The Fremantle arts community - performers, gallery staff, market stallholders at the iconic Fremantle Markets - often operates as sole traders or casual contractors. Adults aged 18+ can submit a medical-certificate request online, while venues and clients apply their own documentation policies.",
        ],
      },
      {
        title: "Medical Certificates for WA Workers",
        paragraphs: [
          `Western Australian workers are covered by either the federal Fair Work Act or the WA Industrial Relations Act, depending on their employer. Each employer applies its own workplace evidence policy. ${EMPLOYER_POLICY_CAVEAT}`,
          `WA's time zone (AWST, UTC+8) means Fremantle is 2-3 hours behind the eastern states. ${AVAILABILITY}`,
          "Notre Dame University Fremantle and Murdoch University both assess telehealth-issued medical certificates under their own policies from AHPRA-registered doctors for academic support, coursework documentation, and missed assessment documentation. The same applies to South Metropolitan TAFE and all other educational institutions in the Fremantle area.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Fremantle",
      paragraphs: [
        "Fremantle has good pharmacy coverage along Market Street, High Street, and in the surrounding suburbs. Chemist Warehouse Cockburn, Priceline at Fremantle, and independent pharmacies throughout the southern corridor all accept eScripts. The QR code from an InstantMed prescription works at any of them.",
        "For evening prescriptions, Cockburn Gateway and Garden City shopping centres have pharmacies with extended hours. Fremantle's central pharmacies typically trade through the weekend. An eScript issued during a Saturday afternoon telehealth consultation can be filled the same day without leaving the Fremantle area.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Western Australia",
      paragraphs: [
        "Western Australia follows national AHPRA and Medical Board of Australia guidelines for telehealth. The WA Department of Health has supported telehealth expansion as part of its digital health strategy, recognising the state's unique geographic challenges. All telehealth consultations must be provided by AHPRA-registered practitioners.",
        "Prescribing via telehealth in WA follows national TGA regulations. InstantMed accepts eligible prescribing requests only through repeat-prescription reviews for a regular medicine the patient already takes and its named specialty assessment pathways. Every prescribing request requires an individual doctor review, and an eScript is sent only if approved. Schedule 8 controlled substances require WA Department of Health authority and in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "Medical certificates issued via telehealth in Western Australia are reviewed under the same national practitioner framework as other doctor-issued certificates. WA employers set their own policies under the Fair Work Act or WA Industrial Relations Act, and high-risk clearance or compensation matters need their own assessment pathway.",
      ],
    },
    additionalFaqs: [
      { q: "Can Fremantle port workers use InstantMed?", a: `Adults aged 18+ can submit a medical-certificate request online. Port, logistics, and maritime employers apply their own evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Does InstantMed cover South Fremantle and Cockburn?", a: "Yes. InstantMed covers all of Fremantle, Cockburn, Melville, Hamilton Hill, East Fremantle, and the entire Perth metropolitan area. It works anywhere in WA with internet access." },
      { q: "Can Notre Dame Fremantle students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. Notre Dame University sets its own policy for academic support, extensions, and missed assessments, so check current requirements before submitting." },
      { q: "Is InstantMed cheaper than a Fremantle GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Fremantle bulk-billing rates around 55% and gap fees of $50–$90 at many practices, InstantMed is often the more affordable option for straightforward certificates.` },
    ],
  },
}
