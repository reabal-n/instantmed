/**
 * Deep city content -- Northern Territory
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

import type { DeepCityContent } from "../deep-city-content"

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
          "The Northern Territory has the youngest population of any Australian state or territory, with a median age of 33. This means a large working-age population needing workplace medical certificates and routine prescriptions. Many Darwin residents work in mining, defence, construction, and tourism - industries with shift patterns that rarely align with standard clinic hours.",
          "Royal Darwin Hospital is the Territory's major tertiary hospital, but for non-emergency needs like medical certificates and repeat prescriptions, the emergency department is not the appropriate pathway. Telehealth fills the gap between emergency care and routine GP access - providing timely doctor assessment for straightforward health needs without occupying hospital resources.",
        ],
      },
      {
        title: "Shift Workers and FIFO in the NT",
        paragraphs: [
          "The Northern Territory's economy is heavily reliant on mining, gas, defence, and government - all sectors with significant shift work and FIFO rosters. Workers at Inpex's Ichthys LNG facility, RAAF Base Darwin, Robertson Barracks, and numerous mine sites across the Top End often work 12-hour rotating rosters that make traditional clinic visits impractical.",
          "For defence personnel stationed in Darwin, sick leave requires a medical certificate from a registered practitioner. Telehealth provides a practical pathway that doesn't require leaving the barracks during duty hours or navigating busy on-base medical centres.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Darwin and the NT",
      paragraphs: [
        "Darwin has major pharmacy chains including Chemist Warehouse, Priceline, and TerryWhite Chemmart across Casuarina, Palmerston, and the CBD. eScripts are accepted at all Australian pharmacies - simply show the QR code on your phone. After-hours options are more limited in Darwin than capital cities further south, making eScript after doctor approval dispatch from telehealth particularly valuable.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in the NT",
      paragraphs: [
        "The Northern Territory follows national AHPRA standards for telehealth practice. The NT Government has been a strong supporter of telehealth, recognising its essential role in serving the Territory's dispersed population. NT Health actively promotes telehealth for routine healthcare needs where physical examination is not required.",
        "Prescribing in the NT follows the TGA national framework. The NT Medicines, Poisons and Therapeutic Goods Act aligns with national scheduling. Schedule 8 medications require NT Department of Health authority. eScripts are the national standard and work at any pharmacy in the Territory.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed work during the wet season?", a: "Yes. As long as you have internet access, InstantMed works regardless of weather. It's especially useful when flooding or storms make travel to a clinic difficult." },
      { q: "Can defence personnel use InstantMed?", a: "Yes. AHPRA-registered doctor certificates can support sick leave documentation, but defence personnel should check their unit's specific medical chain of command requirements." },
      { q: "Is InstantMed available in Palmerston?", a: "Yes. We serve all of Greater Darwin including Palmerston, Howard Springs, Humpty Doo, and the rural area." },
      { q: "Does InstantMed operate on NT time?", a: `Yes. Our operating hours are 8am–10pm AEST, which is 7:30am–9:30pm ACST. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
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
          "Mining and pastoral operations across Central Australia employ workers on remote stations and sites scattered across vast distances. Many of these operations are FIFO from Alice Springs or further afield. When a worker on R&R in Alice Springs needs a medical certificate, telehealth provides it without competing for one of the limited GP appointments.",
          "Defence personnel at Pine Gap and RAAF personnel based in or rotating through Alice Springs also need healthcare access. While defence has its own medical facilities, civilian support staff and contractors rely on the local system. Transport workers on the Stuart Highway - trucking between Adelaide and Darwin - pass through Alice Springs as their primary service point. Telehealth works for all of these groups regardless of their employer or reason for being in Central Australia.",
        ],
      },
      {
        title: "Extreme Climate and Practical Realities",
        paragraphs: [
          "Central Australia's climate adds a layer of healthcare challenge that doesn't exist in coastal cities. Summer temperatures regularly exceed 40 degrees, making any unnecessary travel genuinely unpleasant and potentially dangerous. Walking to a GP clinic in 42-degree heat when you're already unwell is not a reasonable expectation. Telehealth eliminates the need to leave air conditioning.",
          "The region also experiences periodic flooding that can cut roads for days. The Stuart Highway, Todd River crossings, and unsealed roads to outlying communities are all vulnerable to weather disruption. During these events, getting to a GP may be physically impossible. Telehealth continues to work as long as mobile or internet coverage is available.",
          "Charles Darwin University's Alice Springs campus and Batchelor Institute (specialising in Indigenous education) serve local and regional students. Both set their own policies for medical certificates from AHPRA-registered doctors for academic support requests. For students who may have travelled hundreds of kilometres from remote communities to study in Alice Springs, telehealth provides healthcare access without the overhead of finding and enrolling with a local GP.",
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
        "Prescribing follows national TGA rules. Most PBS-listed medications can be prescribed via telehealth and dispensed via eScript at any NT pharmacy. Schedule 8 controlled substances require NT Health authority and in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "Medical certificates from telehealth consultations carry the same legal weight in the Northern Territory as those from in-person consultations. NT Government employers, tourism operators, mining companies, pastoral employers, and all Fair Work-covered businesses set their own policies for certificates from AHPRA-registered doctors.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed work in remote Central Australia?", a: "Yes, as long as you have internet or mobile coverage. Alice Springs town has good coverage. Remote communities and stations increasingly have Starlink, NBN Sky Muster, or mobile coverage. The intake works on any device with a browser." },
      { q: "Can Yulara resort workers use InstantMed?", a: "Yes. Resort staff, tour operators, and workers at Uluru-Kata Tjuta can use InstantMed for medical certificates and prescriptions. The certificate is issued by an AHPRA-registered doctor and employer policies may vary." },
      { q: "Can tourists use InstantMed in Alice Springs?", a: "Yes. You don't need to be an Alice Springs resident. If you're visiting for tourism or work and need a medical certificate, our doctors can help. International visitors can use the service - no Medicare card is required for medical certificates." },
      { q: "Is InstantMed cheaper than an Alice Springs GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Alice Springs' limited GP availability and typical gap fees when bulk-billing isn't available, InstantMed offers a predictable, affordable option for routine certificates and scripts.` },
    ],
  },
}
