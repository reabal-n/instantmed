/**
 * Deep city content -- Western Australia
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

import type { DeepCityContent } from "../deep-city-content"

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
          "For Perth's large FIFO (fly-in, fly-out) workforce - miners, oil and gas workers, construction crews - healthcare access is doubly complicated. When you're home for your R&R period, the last thing you want is to spend a day in a waiting room. And when you're on site in the Pilbara or Goldfields, getting to a doctor might mean a flight. Telehealth solves both problems.",
        ],
      },
      {
        title: "Medical Certificates for WA Workers",
        paragraphs: [
          "Western Australian workers have the same Fair Work Act entitlements as employees in other states. However, WA also retains its own state industrial relations system for some employees (those covered by the WA Industrial Relations Act). Under both systems, medical certificates from AHPRA-registered doctors are valid evidence for leave purposes.",
          "WA's mining and resources sector has its own expectations around medical documentation. Many mining companies require medical certificates for any absence, even single days, as part of their fitness-for-duty protocols. InstantMed certificates meet these requirements - they're issued by AHPRA-registered doctors and include all the details employers need.",
          "Perth's time zone (AWST, UTC+8) means WA is 2–3 hours behind the eastern states. InstantMed operates 8am–10pm AEST, which translates to approximately 6am–8pm AWST (or 5am–7pm during daylight saving in the east). For most Perth residents, this covers the entire working day and evening. If you submit a request during WA business hours, you'll typically have your certificate well before the next working day.",
        ],
      },
      {
        title: "Regional WA and Telehealth",
        paragraphs: [
          "Western Australia covers a third of the continent, and outside the Perth metropolitan area, healthcare access drops off dramatically. Towns like Geraldton, Kalgoorlie, Karratha, and Broome have limited GP availability. For residents and workers in these areas, telehealth isn't just convenient - it's often the only practical option for routine health needs.",
          "Even within the Perth metro area, the northern and southern growth corridors (Yanchep, Baldivis, Byford) are underserviced by GPs. New housing developments have outpaced medical infrastructure, leaving thousands of families without a nearby clinic. Telehealth fills this gap until local healthcare catches up with population growth.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Perth",
      paragraphs: [
        "Perth has approximately 650 community pharmacies across the metropolitan area, with good coverage in most suburbs. All major pharmacy chains - Chemist Warehouse, Priceline, TerryWhite Chemmart, Amcal, and Blooms - accept eScripts at their WA locations.",
        "eScript adoption in Western Australia has been strong, with the vast majority of pharmacies now fully electronic. When InstantMed issues a prescription, you receive a QR code via SMS. Present it at any WA pharmacy to have your medication dispensed. Extended-hours pharmacies are available in most major shopping centres, and several CBD and suburban pharmacies operate late.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Western Australia",
      paragraphs: [
        "Western Australia's telehealth framework follows national AHPRA and Medical Board of Australia guidelines. The WA Department of Health has been a proponent of telehealth expansion, recognising the state's unique geographic challenges. WA Health's digital health strategy includes telehealth as a critical component for both metropolitan and regional healthcare delivery.",
        "Prescribing via telehealth in WA follows national TGA regulations. All PBS-listed medications available via telehealth in other states are equally available in WA. The eScript system is fully operational across Western Australian pharmacies. Schedule 8 medications (controlled substances) require WA Department of Health authority and typically an in-person assessment.",
        "WA's state-based industrial relations system, which covers some WA workers not under the federal Fair Work system, also recognises medical certificates from AHPRA-registered practitioners. Whether you're covered by the Fair Work Act or the WA Industrial Relations Act, telehealth-issued certificates are legally valid.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed work on WA time?", a: "InstantMed operates 8am–10pm AEST, which is approximately 6am–8pm AWST (or 5am–7pm during eastern daylight saving). This covers standard working hours and evening for Perth residents. Requests submitted in the evening may be reviewed the following morning." },
      { q: "Can FIFO workers use InstantMed from site?", a: "Yes, as long as you have internet access. Many mine sites and remote camps have wifi or mobile coverage. If you need a medical certificate while on site, you can submit your request and receive the certificate via email. It's valid for all employers, including mining companies." },
      { q: "Are Perth GPs really that expensive?", a: "Perth has some of the lowest bulk-billing rates in Australia. Many GPs charge gap fees of $50–$100 per standard consultation. For a straightforward medical certificate, InstantMed offers a more affordable flat-fee alternative without compromising on clinical quality." },
      { q: "Can I use InstantMed in regional WA?", a: "Yes. InstantMed works anywhere in Western Australia with an internet connection - Perth, Geraldton, Kalgoorlie, Karratha, Broome, or anywhere in between. The service and pricing are the same regardless of your location." },
      { q: "Do WA mining companies accept telehealth certificates?", a: "Yes. Mining companies operating in Australia accept medical certificates from AHPRA-registered doctors. The method of consultation (in-person vs telehealth) doesn't affect the certificate's validity. Our certificates include all required details for fitness-for-duty documentation." },
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
          "For residents of Busselton, Dunsborough, Margaret River, Augusta, and the smaller Capes-region communities, Bunbury is the usual stop for GP care. A round trip from Margaret River to Bunbury is 160 kilometres and two-and-a-half hours of driving, not including the time waiting at the clinic. Telehealth collapses all of that into 20–30 minutes from home, without the fuel cost or the lost half-day.",
        ],
      },
      {
        title: "South-West Workers, Wine Region Tourism, and Students",
        paragraphs: [
          "The South-West's economy spans alumina refining and mining (Alcoa Wagerup, South32 Worsley), forestry and timber, dairy and beef, and one of Australia's most developed wine tourism regions. Each of these industries employs significant numbers of shift workers, seasonal staff, and people whose schedules simply don't align with traditional 9-to-5 GP clinic hours. Hospitality staff in Margaret River's cellar doors and restaurants, vineyard workers during vintage, and alumina refinery crews all benefit from telehealth's evening availability.",
          "Edith Cowan University's South West campus in Bunbury and South Regional TAFE serve thousands of students across the region. Both accept medical certificates from AHPRA-registered doctors for all academic support applications - special consideration, exam deferrals, and assignment extensions. The consultation method does not affect validity.",
          "For the growing remote-work population in the region - people who moved from Perth for lifestyle reasons and kept their city jobs - telehealth provides the same convenience they were used to in the metro area. There is no penalty for living in the South-West: same doctors, same pricing, same turnaround.",
        ],
      },
      {
        title: "Medical Certificates and WA Industrial Law",
        paragraphs: [
          "Western Australia has a dual industrial relations system. Most private-sector workers in Bunbury and the South-West are covered by the federal Fair Work Act, but some WA-specific employers fall under the state Industrial Relations Act. Both systems accept medical certificates from AHPRA-registered practitioners, and neither specifies that certificates must come from face-to-face consultations.",
          "Mining and resources employers - particularly those with fitness-for-duty protocols - often have stricter internal documentation requirements, but they are bound by the same legal framework. A telehealth certificate from an AHPRA-registered doctor meets these requirements and includes all the standard details: doctor's name, AHPRA registration number, consultation date, and recommended period of absence.",
          "Perth operates on Australian Western Standard Time (AWST, UTC+8), two hours behind the eastern states. InstantMed's operating window of 8am–10pm AEST translates to roughly 6am–8pm AWST. For Bunbury residents, that covers the entire working day and well into the evening - plenty of time to submit a request and receive your certificate before the next shift.",
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "Telehealth is not a substitute for your regular GP relationship. Chronic disease management, screening, immunisations, hands-on physical examinations, dressings, and injections all still require face-to-face care. What telehealth replaces is the unnecessary trip - the certificate for a flu that any doctor could clinically assess in five minutes, the repeat script for a blood pressure tablet you have taken for years, the simple prescription for a recurrent issue you already recognise.",
          "For residents of Margaret River, Augusta, and the smaller Capes communities, the practical difference is enormous. A round trip to a Bunbury GP for a routine certificate can absorb most of a working day, plus fuel and the inevitable waiting room time. Telehealth collapses that into a 20–30 minute process from home, with the same clinical standard and no compromise on the documentation. The two models work together - face-to-face for what genuinely needs it, telehealth for the routine middle.",
          "If your symptoms or situation are inappropriate for a telehealth assessment, the doctor will tell you and refer you to in-person care. You will not be charged. The clinical filter is identical regardless of whether you live in Bunbury, Margaret River, or anywhere else we serve.",
        ],
      },
      {
        title: "Practical Cost and Time Comparison for the South-West",
        paragraphs: [
          "GP economics in WA's South-West have moved in line with the broader trend. Bulk-billing has declined to one of the lowest rates in the country, gap fees of $40–$80 are common, and waiting times for non-urgent appointments stretch to a week. For households across Bunbury, the Capes, and the broader South-West, the combined cost of a routine GP visit - fuel into Bunbury from outlying towns, the gap fee, lost work time, the wait - frequently exceeds what telehealth charges flat.",
          "InstantMed's flat-fee model removes the unpredictability. You know what the certificate or script costs before you start the intake. There are no gap fees and no surprise add-ons at the end of the consultation. For families budgeting through the cost-of-living pressures that have hit regional WA particularly hard, that predictability matters as much as the time saved.",
          "Most certificates are reviewed within an hour during business hours (8am–10pm AEST, which is 6am–8pm AWST). The eScript or PDF arrives via email or SMS for collection at the nearest pharmacy or to forward directly to your employer. The full process - from starting the intake to having the documentation in hand - typically takes 30–60 minutes. For Bunbury and South-West residents, that is significantly faster than securing a same-day clinic appointment in the local catchment.",
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
        "Prescribing follows national TGA rules. Most PBS-listed medications can be prescribed via telehealth in WA, with eScripts accepted at every WA pharmacy. Schedule 8 medications - strong opioids, stimulants - require WA Department of Health authority and typically in-person assessment, and are not prescribed through InstantMed.",
        "The WA-specific Industrial Relations Act applies to some employees in the state, but it uses the same 'registered medical practitioner' language as the federal Fair Work Act when it comes to medical certificates. A telehealth certificate from an AHPRA-registered doctor is valid under both systems.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover Busselton, Margaret River, and the Capes?", a: "Yes. Busselton, Dunsborough, Yallingup, Margaret River, Augusta, and all the smaller Capes-region communities. Any location in the South-West with internet access is covered." },
      { q: "Does InstantMed operate on WA time?", a: "Our operating window is 8am–10pm AEST, which is 6am–8pm AWST - so most of the Western Australian working day is covered. Submissions made early in the WA morning are typically reviewed almost immediately." },
      { q: "Can Alcoa Wagerup and South32 workers use InstantMed?", a: "Yes. Our certificates are valid for all Australian employers under the Fair Work Act and include the AHPRA registration details needed for fitness-for-duty documentation." },
      { q: "Is InstantMed cheaper than seeing a GP in Bunbury?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Bunbury's bulk-billing rate around 62% and typical gap fees of $40–$80, InstantMed is often more affordable for straightforward certificates and scripts.` },
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
          "Fremantle's economy is built around the port, maritime services, hospitality, and the arts. Fremantle Port is one of Australia's busiest, and the logistics, stevedoring, and transport workforce operates around the clock. Shift workers who finish at 2am or start at 5am can't easily visit a GP during business hours. Telehealth removes the scheduling barrier entirely - submit your request when it suits you, and the certificate arrives via email.",
          "The suburb has also become a magnet for young professionals, creatives, and students from Murdoch University and Notre Dame University (Fremantle campus). Many are casual workers or self-employed. A doctor visit that costs $80 out of pocket and requires half a day off work is a genuine financial burden. Telehealth offers a faster, more affordable alternative for routine certificate and prescription needs.",
        ],
      },
      {
        title: "Port Workers, Hospitality, and Shift Work in Fremantle",
        paragraphs: [
          "Fremantle Port handles a significant share of Western Australia's container and general cargo trade. The logistics chain - from stevedores and truck drivers to customs brokers and warehouse staff - operates on rotating shifts with limited flexibility. When a port worker wakes up sick before a 4am shift, the priority is documentation, not a waiting room. Telehealth delivers the certificate to their inbox while they recover at home.",
          "Fremantle's hospitality strip - the Cappuccino Strip along South Terrace, the Fishing Boat Harbour, and the growing restaurant scene on High Street and Market Street - employs a large casual workforce. These workers are often young, on limited incomes, and working irregular hours across multiple venues. A medical certificate from InstantMed costs less than the gap fee at most Fremantle GPs and doesn't require giving up a shift to sit in a waiting room.",
          "The Fremantle arts community - performers, gallery staff, market stallholders at the iconic Fremantle Markets - often operates as sole traders or casual contractors. Medical documentation for these workers is about protecting relationships with venues and clients rather than formal employer requirements. Telehealth provides that documentation affordably and without disrupting already-tight schedules.",
        ],
      },
      {
        title: "Medical Certificates for WA Workers",
        paragraphs: [
          "Western Australian workers are covered by either the federal Fair Work Act or the WA Industrial Relations Act, depending on their employer. Under both systems, medical certificates from AHPRA-registered doctors are legally valid evidence for leave purposes. The consultation method - telehealth or face-to-face - is not a factor.",
          "WA's time zone (AWST, UTC+8) means Fremantle is 2-3 hours behind the eastern states. InstantMed operates 8am-10pm AEST, which translates to approximately 6am-8pm AWST. For Fremantle residents, this covers the entire working day and evening. Requests submitted in the late WA evening may be reviewed the following morning.",
          "Notre Dame University Fremantle and Murdoch University both accept telehealth-issued medical certificates from AHPRA-registered doctors for special consideration, assignment extensions, and exam deferrals. The same applies to South Metropolitan TAFE and all other educational institutions in the Fremantle area.",
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
        "Prescribing via telehealth in WA follows national TGA regulations. PBS-listed medications can be prescribed electronically, with the eScript system fully operational across all Western Australian pharmacies. Schedule 8 controlled substances require WA Department of Health authority and in-person assessment.",
        "Medical certificates issued via telehealth carry the same legal weight in Western Australia as those from in-person consultations. WA employers are legally required to accept certificates from AHPRA-registered doctors under both the Fair Work Act and the WA Industrial Relations Act.",
      ],
    },
    additionalFaqs: [
      { q: "Can Fremantle port workers use InstantMed?", a: "Yes. Port workers, logistics staff, and maritime workers can get medical certificates via telehealth. Certificates are valid for all employers, including those under maritime enterprise agreements." },
      { q: "Does InstantMed cover South Fremantle and Cockburn?", a: "Yes. InstantMed covers all of Fremantle, Cockburn, Melville, Hamilton Hill, East Fremantle, and the entire Perth metropolitan area. It works anywhere in WA with internet access." },
      { q: "Can Notre Dame Fremantle students use InstantMed?", a: "Yes. Notre Dame University accepts medical certificates from AHPRA-registered doctors for special consideration, extensions, and exam deferrals. The consultation method doesn't affect validity." },
      { q: "Is InstantMed cheaper than a Fremantle GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Fremantle bulk-billing rates around 55% and gap fees of $50–$90 at many practices, InstantMed is often the more affordable option for straightforward certificates.` },
    ],
  },
}
