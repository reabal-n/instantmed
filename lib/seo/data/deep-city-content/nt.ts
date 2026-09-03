/**
 * Deep city content -- Northern Territory
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import type { DeepCityContent } from "../deep-city-content"

const MED_CERT_DOCUMENT_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")
const PRESCRIPTION_IF_APPROVED = getApprovedClaim("prescription_if_approved")

export const NT_CITIES: Record<string, DeepCityContent> = {
  darwin: {
    healthStats: [
      { label: "Population", value: "147K", context: "Australia's most northern capital" },
      { label: "Avg GP wait", value: "2–4 days", context: "Longer during the wet season" },
      { label: "Bulk-billing rate", value: "~76%", context: "Below NT average in urban areas" },
      { label: "Telehealth uptake", value: "Growing", context: "Essential for Top End healthcare" },
    ],
    sections: [
      {
        title: "Healthcare Access in the Top End",
        paragraphs: [
          "Darwin presents unique healthcare challenges found nowhere else in Australia. The extreme tropical climate - with a distinct wet season from November to April - can make travel difficult and disrupt routine healthcare access. Cyclone season adds another layer of unpredictability for residents trying to maintain regular doctor appointments.",
          "The Northern Territory has the youngest population of any Australian state or territory, with a median age of 33. Many Darwin residents work in mining, defence, construction, and tourism - industries with shift patterns that rarely align with standard clinic hours. Adults aged 18+ can submit a medical-certificate request or an eligible repeat-prescription review for a regular medicine they already take.",
          "Royal Darwin Hospital is the Territory's major tertiary hospital, but a medical-certificate request or repeat-prescription review for a regular medicine already taken does not belong in an emergency department. Telehealth provides an online pathway for those focused requests without occupying hospital resources.",
        ],
      },
      {
        title: "Shift Workers and FIFO in the NT",
        paragraphs: [
          "The Northern Territory's economy is heavily reliant on mining, gas, defence, and government - all sectors with significant shift work and FIFO rosters. Workers at Inpex's Ichthys LNG facility, RAAF Base Darwin, Robertson Barracks, and numerous mine sites across the Top End often work 12-hour rotating rosters that make traditional clinic visits impractical.",
          "Defence personnel stationed in Darwin should check their unit's medical chain-of-command and leave-evidence requirements. Adults aged 18+ can submit a medical-certificate request for a personal, non-duty absence online.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Darwin and the NT",
      paragraphs: [
        `Darwin has major pharmacy chains including Chemist Warehouse, Priceline, and TerryWhite Chemmart across Casuarina, Palmerston, and the CBD. eScripts are accepted at Australian pharmacies. ${PRESCRIPTION_IF_APPROVED} Dispensing timing depends on pharmacy hours, stock, and pharmacy checks.`,
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in the NT",
      paragraphs: [
        "The Northern Territory follows national AHPRA standards for telehealth practice. The NT Government has been a strong supporter of telehealth, recognising its essential role in serving the Territory's dispersed population. NT Health promotes telehealth where remote assessment is clinically appropriate and a physical examination is not required.",
        "Prescribing in the NT follows the TGA national framework. The NT Medicines, Poisons and Therapeutic Goods Act aligns with national scheduling. Schedule 8 medications require NT Department of Health authority. eScripts are the national standard and work at any pharmacy in the Territory.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed work during the wet season?", a: "Adults aged 18+ can submit an InstantMed medical-certificate request or eligible repeat-prescription review for a regular medicine they already take with internet access, regardless of weather. This can be useful when flooding or storms make travel to a clinic difficult." },
      { q: "Can defence personnel use InstantMed?", a: `Adults aged 18+ can submit a medical-certificate request for a personal, non-duty absence. Defence personnel should check their unit's medical chain-of-command and evidence requirements. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Is InstantMed available in Palmerston?", a: "Yes. We serve all of Greater Darwin including Palmerston, Howard Springs, Humpty Doo, and the rural area." },
      { q: "Does InstantMed operate on NT time?", a: `Yes. The service operates 24/7, so the half-hour difference between ACST and AEST never matters. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
  "alice-springs": {
    healthStats: [
      { label: "Population", value: "28K+", context: "Heart of Central Australia" },
      { label: "Avg GP wait", value: "7–14 days", context: "One of the longest waits in Australia" },
      { label: "Bulk-billing rate", value: "~50%", context: "Very limited outside ACCHS services" },
      { label: "Nearest capital", value: "1,500km", context: "Adelaide is the closest capital city" },
    ],
    sections: [
      {
        title: "Healthcare in Central Australia",
        paragraphs: [
          "Alice Springs is the service centre for Central Australia - a region larger than most European countries, stretching from Tennant Creek in the north to the SA border in the south, and from the WA border in the west to the QLD border in the east. With a population of roughly 28,000 in the town itself and a broader regional population scattered across remote communities, cattle stations, and mining sites, the region's healthcare infrastructure faces challenges unlike anywhere else in Australia.",
          "GP access in Alice Springs has been a persistent challenge. The town's remoteness makes doctor recruitment and retention difficult, and the limited number of private practices are chronically booked out. Wait times of one to two weeks for non-urgent appointments are common. Outside Alice Springs - in communities like Yulara, Ti Tree, and the pastoral stations - there may be no GP within hundreds of kilometres.",
          "Alice Springs Hospital is the only major hospital between Adelaide and Darwin, handling everything from routine presentations to complex trauma retrievals. The primary care system, while bolstered by Aboriginal Community Controlled Health Services like Congress (Central Australian Aboriginal Congress), still cannot meet the routine demand from the town's non-Indigenous population, tourists, and the region's dispersed workforce.",
        ],
      },
      {
        title: "Tourism, Mining, and Central Australian Workers",
        paragraphs: [
          "Tourism is a major employer in Central Australia. Alice Springs is the gateway to Uluru-Kata Tjuta National Park, Kings Canyon, the West MacDonnell Ranges, and the broader Red Centre. Tour operators, hospitality workers, resort staff at Yulara, and park rangers work irregular hours in remote locations where GP access is essentially nonexistent. A tour guide who falls ill at Kings Canyon is 300 kilometres from the nearest clinic.",
          "Mining and pastoral operations across Central Australia employ workers on remote stations and sites scattered across vast distances. Many of these operations are FIFO from Alice Springs or further afield. Adults aged 18+ can submit a medical-certificate request online while on R&R, with issue depending on the clinical assessment.",
          "Defence personnel at Pine Gap and RAAF personnel based in or rotating through Alice Springs also need healthcare access. While defence has its own medical facilities, civilian support staff and contractors rely on the local system. Transport workers on the Stuart Highway - trucking between Adelaide and Darwin - pass through Alice Springs as their primary service point. Adults aged 18+ in these groups can submit InstantMed's listed medical-certificate requests or eligible repeat-prescription reviews for a regular medicine they already take online.",
        ],
      },
      {
        title: "Extreme Climate and Practical Realities",
        paragraphs: [
          "Central Australia's climate adds a layer of healthcare challenge that doesn't exist in coastal cities. Summer temperatures regularly exceed 40 degrees, making unnecessary travel unpleasant and potentially dangerous. Adults aged 18+ can submit a listed InstantMed request online when the local connection is available.",
          "The region also experiences periodic flooding that can cut roads for days. The Stuart Highway, Todd River crossings, and unsealed roads to outlying communities are all vulnerable to weather disruption. During these events, getting to a GP may be physically impossible. Telehealth continues to work as long as mobile or internet coverage is available.",
          "Charles Darwin University's Alice Springs campus and Batchelor Institute (specialising in Indigenous education) serve local and regional students. Both set their own policies for medical certificates from AHPRA-registered doctors for academic support requests. Students aged 18+ who may have travelled hundreds of kilometres from remote communities can submit a focused medical-certificate request online without first enrolling with a local GP.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Alice Springs",
      paragraphs: [
        "Alice Springs has pharmacy coverage along Todd Mall, at the Yeperenye Shopping Centre, and through suburban pharmacies in the Gap and East Side. Chemist Warehouse and independent pharmacies accept eScripts. The QR code from an InstantMed prescription works at all of them.",
        "Pharmacy hours in Alice Springs are more limited than in metropolitan areas, with most closing by 6pm on weekdays and earlier on weekends. Planning around pharmacy hours is important for same-day prescription fills. For residents travelling to Adelaide or Darwin, the eScript also works at any pharmacy along the route or at the destination. Standard PBS co-payments apply with no pricing difference compared to a face-to-face prescription.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in the Northern Territory",
      paragraphs: [
        "The Northern Territory follows national AHPRA and Medical Board of Australia guidelines for telehealth. The NT Government has been one of the strongest advocates for telehealth in Australia, recognising the Territory's vast distances and dispersed population make it essential for equitable healthcare access. NT Health's digital health strategy explicitly includes telehealth as a primary care modality for both urban and remote communities.",
        "Prescribing follows national TGA rules. InstantMed accepts eligible prescribing requests only through repeat-prescription reviews for a regular medicine the patient already takes and its erectile dysfunction, hair loss, women's health, and weight-management assessment pathways. Every prescribing request requires an individual doctor review, and an eScript is sent only if approved. Schedule 8 controlled substances require NT Health authority and in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "Medical certificates from telehealth consultations in the Northern Territory are reviewed under the same national practitioner framework as other doctor-issued certificates. NT Government employers, tourism operators, mining companies, pastoral employers, and Fair Work-covered businesses set their own policies for certificates from AHPRA-registered doctors.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed work in remote Central Australia?", a: "Yes, as long as you have internet or mobile coverage. Alice Springs town has good coverage. Remote communities and stations increasingly have Starlink, NBN Sky Muster, or mobile coverage. The intake works on any device with a browser." },
      { q: "Can Yulara resort workers use InstantMed?", a: "Adults aged 18+ working at resorts, on tours, or at Uluru-Kata Tjuta can submit medical-certificate requests or eligible repeat-prescription reviews for a regular medicine they already take. Every prescribing request requires doctor review, and an eScript is sent only if approved. Employers apply their own evidence policies." },
      { q: "Can tourists use InstantMed in Alice Springs?", a: `Adults aged 18+ can submit a listed request while visiting Alice Springs. Medical certificates do not require Medicare. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Is InstantMed cheaper than an Alice Springs GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Alice Springs' limited GP availability and typical gap fees when bulk-billing isn't available, InstantMed offers a predictable, affordable option for medical-certificate requests and eligible repeat-prescription reviews.` },
    ],
  },
}
