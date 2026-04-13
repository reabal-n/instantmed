/**
 * Deep city content -- Tasmania
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

import type { DeepCityContent } from "../deep-city-content"

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
          "Tasmania's healthcare workforce shortage extends beyond GPs. The Royal Hobart Hospital's emergency department - the state's largest - regularly reports long wait times for non-urgent presentations. Many of these ED visits are for conditions that could be managed in primary care, if primary care were accessible. Telehealth reduces this pressure by providing an alternative pathway for low-acuity needs.",
        ],
      },
      {
        title: "Who Benefits in Hobart",
        paragraphs: [
          "Hobart's growing tourism and hospitality sector - fuelled by MONA, the city's restaurant scene, and Tasmania's broader appeal - employs thousands of workers with irregular schedules. When a hospitality worker in Salamanca or the waterfront calls in sick, getting a same-day GP appointment can be difficult. Telehealth provides documentation without the wait.",
          "University of Tasmania (UTAS) students at the Sandy Bay and Inveresk campuses need certificates for special consideration during exam periods. The UTAS medical service is stretched, and external GP availability near campus is limited. TasTAFE students face similar challenges across their Hobart and Launceston campuses.",
          "Tasmania's public service - the state's largest employer - requires medical certificates for sick leave in line with the Tasmanian State Service Award. Telehealth certificates from AHPRA-registered doctors meet these requirements. The same applies to federal public servants working in Tasmania's Commonwealth agencies.",
        ],
      },
      {
        title: "Medical Certificates in Tasmania",
        paragraphs: [
          "Tasmanian employers follow the Fair Work Act 2009 for medical certificate requirements. There is no Tasmanian legislation that differentiates between telehealth and in-person certificates. The Tasmanian State Service Award accepts certificates from registered medical practitioners without specifying consultation method.",
          "For hospitality and tourism workers under the Hospitality Industry General Award, medical certificates are commonly required for absences of more than one day. Telehealth certificates meet this requirement. For workers in aquaculture, forestry, and agriculture - key Tasmanian industries - the same Fair Work protections apply.",
          "UTAS accepts certificates from any AHPRA-registered doctor for special consideration. This includes telehealth consultations. The university's policy focuses on the legitimacy of the practitioner, not the consultation format.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Hobart",
      paragraphs: [
        "Hobart and Greater Hobart have approximately 60 community pharmacies, with the majority concentrated in the CBD (Elizabeth Street, Liverpool Street), Sandy Bay, Glenorchy, and Kingston. All pharmacies accept eScripts. When InstantMed issues a prescription, the QR code works at any Tasmanian pharmacy - from the CBD to Bruny Island.",
        "Extended-hours pharmacy options are more limited in Hobart than in mainland capitals, but several locations in the CBD and at Eastlands Shopping Centre (Rosny) operate until 8–9pm. For urgent medication needs, the Royal Hobart Hospital pharmacy provides 24-hour dispensing for emergency prescriptions.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Tasmania",
      paragraphs: [
        "Tasmania follows national AHPRA standards for telehealth. The Tasmanian Government has been a strong advocate for telehealth, recognising its critical role in addressing the state's GP shortage and geographic challenges. Tasmania's Digital Health Strategy includes telehealth as a priority area for healthcare access improvement.",
        "Prescribing in Tasmania follows the TGA national framework. The Tasmanian Poisons Act aligns with national scheduling for controlled substances. Most medications can be prescribed via telehealth, with eScripts accepted at all Tasmanian pharmacies. Schedule 8 medications require Tasmanian Department of Health authority.",
        "The Health Complaints Commissioner Tasmania oversees complaints about health services including telehealth. InstantMed maintains a formal complaints process - complaints@instantmed.com.au - with a 14-day response commitment.",
      ],
    },
    additionalFaqs: [
      { q: "Can UTAS students use InstantMed?", a: "Yes. The University of Tasmania accepts medical certificates from AHPRA-registered doctors for special consideration, exam deferrals, and assignment extensions." },
      { q: "Is telehealth available across all of Tasmania?", a: "Yes. InstantMed works anywhere in Tasmania with internet access - Hobart, Launceston, Devonport, Burnie, the East Coast, or the West Coast. Pricing is identical statewide." },
      { q: "Do Tasmanian state government employers accept telehealth certificates?", a: "Yes. The Tasmanian State Service Award requires certificates from registered medical practitioners. Telehealth doctors with AHPRA registration meet this requirement." },
      { q: "Can I use InstantMed in Launceston or the North-West?", a: "Yes. While this page focuses on Hobart, InstantMed serves all of Tasmania. Launceston, Devonport, Burnie, and everywhere in between." },
      { q: "Is InstantMed cheaper than a GP in Hobart?", a: `With Hobart's bulk-billing rate around 55% and gap fees of $40–$80 common, InstantMed is often more affordable for straightforward needs. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
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
          "For residents of Northern Tasmania - from Launceston to Devonport, Burnie, and the North-East - getting a straightforward medical certificate can mean a multi-day wait or a drive to the nearest clinic with availability. Telehealth doesn't replace the ongoing GP relationship, but it handles routine needs immediately.",
        ],
      },
      {
        title: "Students and Workers in Northern Tasmania",
        paragraphs: [
          "The University of Tasmania's Launceston campus (Newnham and Inveresk) serves thousands of students. UTAS accepts telehealth medical certificates for all academic support applications. Given the difficulty of finding a GP in Launceston, telehealth is increasingly the practical choice for students needing timely documentation.",
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
      { q: "Can I use InstantMed if I can't find a GP in Launceston?", a: "Yes. InstantMed is ideal for routine healthcare needs when GP availability is limited. For ongoing conditions, we still recommend establishing a GP relationship - but for medical certificates and straightforward prescriptions, we can help right now." },
      { q: "Does InstantMed serve Devonport and Burnie?", a: "Yes. We serve all of Tasmania - Launceston, Devonport, Burnie, the North-East, and the North-West Coast." },
      { q: "Are certificates accepted by Tasmanian employers?", a: "Yes. All Australian employers, including Tasmanian government agencies, accept certificates from AHPRA-registered doctors regardless of consultation method." },
    ],
  },
}
