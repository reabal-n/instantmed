/**
 * Deep city content -- South Australia
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

import type { DeepCityContent } from "../deep-city-content"

export const SA_CITIES: Record<string, DeepCityContent> = {
  adelaide: {
    healthStats: [
      { label: "Population", value: "1.4M+", context: "South Australia's capital and healthcare hub" },
      { label: "Avg GP wait", value: "2–4 days", context: "Better than Sydney/Melbourne for now" },
      { label: "Bulk-billing rate", value: "~70%", context: "Declining faster than the national average" },
      { label: "Regional access", value: "Challenging", context: "Long distances to GPs outside Adelaide" },
    ],
    sections: [
      {
        title: "Adelaide's Changing Healthcare Landscape",
        paragraphs: [
          "Adelaide has traditionally had better GP access than Sydney or Melbourne, thanks to its smaller size and more manageable population density. However, this advantage is eroding. South Australia's bulk-billing rate has been declining faster than the national average, with many Adelaide GPs now charging gap fees of $40–$80 per consultation. For many residents, what was once a free doctor visit now costs more than an InstantMed certificate.",
          "The decline is particularly noticeable in the inner suburbs and the Adelaide Hills, where bulk-billing practices are becoming rare. In northern Adelaide (Salisbury, Elizabeth, Playford), bulk-billing is more available but demand is high and wait times can stretch to 3–5 days. Southern suburbs like Morphett Vale and Noarlunga face similar access challenges.",
          "South Australia's ageing population adds another dimension. Older residents use GP services more frequently, increasing demand on an already-stretched system. Younger workers and students often find themselves competing for appointments with the retired population, leading to longer waits for routine needs. Telehealth helps rebalance this by diverting straightforward, quick-resolution needs away from the clinic queue.",
        ],
      },
      {
        title: "Medical Certificates for Adelaide Workers and Students",
        paragraphs: [
          "Adelaide's economy is diverse, with significant defence, manufacturing, healthcare, and wine industry employment. Many of these sectors involve shift work, irregular hours, or physical labour - all situations where getting to a GP clinic during business hours is impractical. A medical certificate from InstantMed means you can get the documentation you need without restructuring your day.",
          "University of Adelaide, UniSA, and Flinders University collectively serve over 80,000 students. Campus health services exist but are often oversubscribed, particularly during exam periods. For special consideration applications and assessment extensions, telehealth-issued medical certificates are accepted by all three universities. The process is faster and often more affordable than a campus clinic visit.",
          "For South Australian public sector employees (SAPS), medical certificates from AHPRA-registered doctors are accepted under all current enterprise agreements. The same applies to local government employees and workers covered by the Fair Work Act. The method of consultation - in-person or telehealth - does not affect the certificate's validity.",
        ],
      },
      {
        title: "Regional South Australia",
        paragraphs: [
          "Outside Adelaide, healthcare access in South Australia drops off significantly. Regional centres like Mount Gambier, Port Augusta, Port Lincoln, and the Riverland have limited GP availability. Some smaller towns have lost their only doctor entirely. For residents in these areas, telehealth isn't a convenience - it's essential for timely access to routine medical services.",
          "The Barossa Valley, McLaren Vale, and the Adelaide Hills - while close to Adelaide - have growing populations and limited local healthcare. Weekend GP availability is particularly scarce. For wine industry and tourism workers who fall ill on a Saturday, telehealth provides same-day access to a doctor when local clinics are closed.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Adelaide",
      paragraphs: [
        "Adelaide has approximately 450 community pharmacies across the metropolitan area, with good coverage across most suburbs. All major pharmacy chains accept eScripts - Chemist Warehouse, Priceline, TerryWhite Chemmart, and local independents. The eScript system is well-established in South Australia, with near-universal pharmacy adoption.",
        "Extended-hours pharmacies are available in Adelaide's major shopping centres (Westfield Marion, Tea Tree Plaza, Rundle Mall area), with some locations open until 9pm or later. When InstantMed issues an eScript, you receive a QR code via SMS that any SA pharmacy can scan - no paper prescription required. Prescriptions issued in the evening can often be filled the same night at an extended-hours pharmacy.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in South Australia",
      paragraphs: [
        "South Australia follows national AHPRA and Medical Board of Australia guidelines for telehealth services. SA Health has supported telehealth expansion as part of its strategy to improve healthcare access, particularly for the state's regional and remote populations. The SA Government recognises telehealth as a legitimate and important healthcare delivery method.",
        "Prescribing regulations in SA follow the national TGA framework. Most medications can be prescribed via telehealth, with eScripts accepted at all South Australian pharmacies. Controlled substances (Schedule 8) require SA Health authority and typically an in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "Medical certificates issued via telehealth in South Australia carry the same legal weight as those from in-person consultations. SA employers - government, private, and not-for-profit - are legally required to accept certificates from AHPRA-registered doctors under the Fair Work Act. There is no provision in the Act that requires certificates to come from face-to-face consultations.",
      ],
    },
    additionalFaqs: [
      { q: "Is a telehealth certificate accepted by SA government employers?", a: "Yes. South Australian government departments and agencies accept medical certificates from AHPRA-registered doctors, including those issued via telehealth. The Fair Work Act and SA public sector enterprise agreements both recognise telehealth-issued certificates." },
      { q: "Can I use InstantMed in regional SA?", a: "Yes. InstantMed works anywhere in South Australia with internet access - Adelaide, Mount Gambier, Port Augusta, Port Lincoln, the Riverland, or anywhere in between. The service and pricing are identical regardless of location." },
      { q: "Is InstantMed cheaper than a GP in Adelaide?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Adelaide's declining bulk-billing rates, many GPs now charge gap fees of $40–$80. For a straightforward medical certificate, InstantMed is often the more affordable option - with no hidden costs.` },
      { q: "Can Adelaide Uni or Flinders students use InstantMed?", a: "Yes. All South Australian universities accept medical certificates from AHPRA-registered doctors for special consideration, assignment extensions, and exam deferrals. The consultation method doesn't affect validity." },
      { q: "What if I need to see a doctor in person?", a: "If your symptoms or situation require a physical examination, our doctor will let you know and recommend an in-person GP visit. You won't be charged. We never issue a certificate if the clinical situation isn't appropriate for telehealth." },
    ],
  },
  "mount-gambier": {
    healthStats: [
      { label: "Population", value: "28K+", context: "Largest city in the Limestone Coast" },
      { label: "Avg GP wait", value: "5–10 days", context: "Severe GP shortage in the region" },
      { label: "Bulk-billing rate", value: "~50%", context: "Among the lowest in regional SA" },
      { label: "Distance to Adelaide", value: "450km", context: "Over 4 hours by road" },
    ],
    sections: [
      {
        title: "Healthcare on the Limestone Coast",
        paragraphs: [
          "Mount Gambier is the service centre for SA's Limestone Coast region - an area stretching from the Victorian border to Kingston SE, and inland to Naracoorte and Bordertown. With a population of roughly 28,000 in the city and a broader regional catchment of 65,000+, the region's GP capacity is under significant strain. Same-day appointments are rarely available, wait times of one to two weeks are common, and several practices have restricted new patient intakes entirely.",
          "The Limestone Coast has been classified as a Distribution Priority Area (DPA) with genuine, long-standing GP workforce shortages. Recruiting and retaining doctors in a regional city 450 kilometres from Adelaide has been a persistent challenge. The Mount Gambier and Districts Health Service provides hospital care, but the primary care gap is the real problem for everyday healthcare needs.",
          "For residents of smaller Limestone Coast towns - Millicent, Penola, Naracoorte, Robe, Kingston SE, Bordertown - the nearest GP is often Mount Gambier, adding a round trip of 1-2 hours. For a medical certificate or repeat prescription, this journey is disproportionate. Telehealth eliminates the travel entirely, providing same-day access to an AHPRA-registered doctor from home.",
        ],
      },
      {
        title: "Forestry, Agriculture, and Regional Workers",
        paragraphs: [
          "The Limestone Coast economy is built on forestry and timber processing (the region contains one of the largest softwood plantation estates in Australia), agriculture (dairy, beef, sheep, viticulture in Coonawarra), fishing (rock lobster industry out of Kingston and Robe), and tourism. These industries involve physical labour, irregular hours, and often remote work locations.",
          "Forestry and mill workers in the Green Triangle region operate on shift rosters that don't align with standard clinic hours. Agricultural workers during lambing, shearing, and vintage seasons face the same problem - taking half a day to get a medical certificate disrupts operations that can't easily pause. Telehealth provides the documentation without the disruption.",
          "The Limestone Coast also has a significant seasonal workforce - grape pickers in Coonawarra, shearers moving through the district, truck drivers on the Melbourne-Adelaide route. These workers are often far from their home GP and need certificates that any employer will accept. InstantMed certificates are nationally valid and accepted by all Fair Work-covered employers.",
        ],
      },
      {
        title: "Cross-Border Healthcare",
        paragraphs: [
          "Mount Gambier sits just 17 kilometres from the Victorian border, and many Limestone Coast residents regularly cross between SA and VIC for work, shopping, and healthcare. Some Mount Gambier residents see GPs in Hamilton or Portland (VIC) when local appointments aren't available, adding cross-border complexity to routine healthcare.",
          "Telehealth simplifies this entirely. AHPRA registration is national - there is no state-based restriction on where a registered doctor can consult. A certificate from an InstantMed doctor is valid in South Australia, Victoria, and every other Australian state and territory. For a cross-border community like the Limestone Coast, this national validity removes administrative friction.",
          "University of South Australia's Mount Gambier campus and TAFE SA's Mount Gambier campus serve regional students. Both accept medical certificates from AHPRA-registered doctors for special consideration applications. For students who commute from surrounding towns, telehealth avoids adding another trip to Mount Gambier on top of their regular travel.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Mount Gambier",
      paragraphs: [
        "Mount Gambier has pharmacy coverage along Commercial Street, at the Marketplace shopping centre, and through suburban pharmacies. Chemist Warehouse, TerryWhite Chemmart, and independent pharmacies all accept eScripts. Pharmacies in Millicent, Naracoorte, Penola, and Bordertown also accept the QR code from an InstantMed prescription.",
        "Extended-hours options are limited in regional SA, but Mount Gambier's Marketplace pharmacies typically trade into the early evening. Standard PBS co-payments apply to telehealth-issued eScripts - there is no pricing difference at the counter. For Limestone Coast residents who regularly cross into Victoria, the eScript also works at any Victorian pharmacy.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in South Australia",
      paragraphs: [
        "South Australia follows national AHPRA and Medical Board of Australia guidelines for telehealth. SA Health has supported telehealth expansion as part of its strategy to improve healthcare access for regional communities like the Limestone Coast, where GP shortages are persistent and severe.",
        "Prescribing follows national TGA rules. Most PBS-listed medications can be prescribed via telehealth and dispensed via eScript at any SA or VIC pharmacy. Schedule 8 controlled substances require SA Health authority and in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "Medical certificates issued via telehealth carry the same legal weight in South Australia as those from in-person consultations. All employers - SA government, private sector, not-for-profit - must accept certificates from AHPRA-registered doctors under the Fair Work Act.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover the whole Limestone Coast?", a: "Yes. Mount Gambier, Millicent, Penola, Naracoorte, Bordertown, Robe, Kingston SE, and all surrounding communities. Anywhere on the Limestone Coast with internet access." },
      { q: "Can forestry and mill workers use InstantMed?", a: "Yes. Green Triangle forestry and timber processing workers can get certificates via telehealth. Certificates are accepted by all employers including those under forestry enterprise agreements." },
      { q: "Does the certificate work in both SA and VIC?", a: "Yes. AHPRA registration is national, and certificates from InstantMed are valid in every Australian state and territory. For the cross-border Limestone Coast community, this means one certificate works everywhere." },
      { q: "Is InstantMed cheaper than a Mount Gambier GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Mount Gambier bulk-billing around 50% and typical gap fees of $40–$70, InstantMed is often more affordable for straightforward certificates and scripts.` },
    ],
  },
  "port-augusta": {
    healthStats: [
      { label: "Population", value: "14K+", context: "Crossroads of the Australian outback" },
      { label: "Avg GP wait", value: "7–14 days", context: "Severe GP shortage" },
      { label: "Bulk-billing rate", value: "~55%", context: "Limited options in the Upper Spencer Gulf" },
      { label: "Catchment", value: "30K+", context: "Serves Whyalla, the Flinders Ranges, and outback SA" },
    ],
    sections: [
      {
        title: "Healthcare at the Crossroads of Outback Australia",
        paragraphs: [
          "Port Augusta sits at the head of Spencer Gulf, at the junction of the Stuart, Barrier, and Augusta highways - literally the crossroads of outback Australia. It is the last major service centre before the long drive north to Alice Springs, west to Perth, or into the Flinders Ranges. With a population of roughly 14,000 and a broader catchment extending to Whyalla, Quorn, Hawker, and the remote pastoral stations beyond, the region's healthcare capacity is severely limited.",
          "GP availability in Port Augusta has been in crisis for years. The region is classified as a Distribution Priority Area with one of the most acute GP shortages in South Australia. Wait times of one to two weeks for non-urgent appointments are standard, and the town has struggled to recruit and retain doctors. When a GP leaves, their patient list often has nowhere to go - other practices are already at capacity.",
          "Port Augusta Hospital provides acute care for the upper Spencer Gulf region, but the primary care bottleneck is the fundamental problem. For routine needs - medical certificates, repeat prescriptions, simple prescription renewals - telehealth offers an immediate alternative that doesn't depend on local GP capacity. It works as long as the internet connection works, which it does across Port Augusta's built-up area and most of the broader region.",
        ],
      },
      {
        title: "Energy, Defence, and Outback Workers",
        paragraphs: [
          "Port Augusta has been reinventing itself as a renewable energy hub. The Augusta and Cultana solar farms, wind projects across the Spencer Gulf region, and the proposed hydrogen developments are bringing a new workforce to the area. These projects employ construction and operations workers on shift rosters, many of whom commute from Adelaide or interstate and don't have a local GP.",
          "The Australian Defence Force has a significant presence in the region, with Woomera and the Cultana Training Area located nearby. Military and defence contractor personnel stationed in or rotating through the area need healthcare access that doesn't always align with local GP availability. While defence has its own medical services, civilian contractors and support staff often rely on the local healthcare system.",
          "Pastoral stations, mining operations (Leigh Creek and surrounding areas), and road transport workers across outback SA use Port Augusta as their nearest service centre. For these workers, a trip to the doctor might mean a 200-kilometre drive each way. Telehealth is not a convenience for this community - it is often the only practical way to get routine medical documentation without losing an entire day.",
        ],
      },
      {
        title: "Aboriginal Health and Community Services",
        paragraphs: [
          "Port Augusta has a significant Aboriginal population, and the region is served by the Pika Wiya Health Service Aboriginal Corporation alongside mainstream primary care. Telehealth is recognised as a complementary pathway for routine healthcare needs in the region - it does not replace Aboriginal Community Controlled Health Services, which provide culturally safe, comprehensive primary care, but for the specific use cases of medical certificates and straightforward prescriptions, it can complement existing care relationships.",
          "TAFE SA's Port Augusta campus and the University of South Australia's regional outreach programs serve local students and trainees. Both accept medical certificates from AHPRA-registered doctors for special consideration and assessment extensions. For students juggling study with work and family commitments in a region with limited GP access, telehealth removes one more barrier.",
          "Under the Fair Work Act 2009, all Port Augusta employers - including the Port Augusta City Council, SA Water, energy companies, pastoral employers, and retail businesses - must accept certificates from AHPRA-registered doctors. South Australian industrial instruments do not distinguish between telehealth and face-to-face certificates.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Port Augusta",
      paragraphs: [
        "Port Augusta has pharmacy coverage along Commercial Road and Flinders Terrace. Chemist Warehouse and independent pharmacies accept eScripts. The Whyalla pharmacies - roughly 75 kilometres south - also provide an option for residents of the upper Spencer Gulf. All accept the QR code from an InstantMed prescription.",
        "Extended-hours options are very limited in Port Augusta compared to metropolitan areas. For urgent prescriptions, planning around pharmacy opening hours is important. Standard PBS co-payments apply to telehealth-issued eScripts - no pricing difference compared to a face-to-face prescription. For residents travelling to Adelaide for other purposes, eScripts can also be filled at any pharmacy along the route.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in South Australia",
      paragraphs: [
        "South Australia follows national AHPRA and Medical Board of Australia guidelines for telehealth. SA Health has been particularly supportive of telehealth in regional and remote areas like the upper Spencer Gulf, where GP workforce shortages are among the most severe in the state.",
        "Prescribing follows national TGA rules. Most PBS-listed medications can be prescribed via telehealth and dispensed via eScript at any SA pharmacy. Schedule 8 controlled substances require SA Health authority and in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "The SA Health and Community Services Complaints Commissioner handles complaints about health services in South Australia. InstantMed operates a formal complaints process aligned with AHPRA requirements at complaints@instantmed.com.au with a 14-day SLA.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover Whyalla and the Flinders Ranges?", a: "Yes. Port Augusta, Whyalla, Quorn, Hawker, and all surrounding communities. Anywhere in the upper Spencer Gulf and outback SA with internet access - including Starlink and NBN fixed wireless." },
      { q: "Can renewable energy workers use InstantMed?", a: "Yes. Solar farm, wind farm, and energy project workers in the Port Augusta region can get medical certificates via telehealth. Certificates are valid for all employers and labour hire companies." },
      { q: "Can pastoral station workers use InstantMed?", a: "Yes, as long as you have internet or mobile coverage. Many remote properties now have Starlink or NBN Sky Muster. The intake can be completed from the homestead without driving into town." },
      { q: "Is InstantMed cheaper than a Port Augusta GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Port Augusta's limited GP availability and typical gap fees when bulk-billing isn't available, InstantMed offers a predictable, affordable alternative.` },
    ],
  },
}
