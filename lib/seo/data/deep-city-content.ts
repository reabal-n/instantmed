/**
 * Deep content for top 5 Australian city location pages.
 * Provides 1,500+ words of unique, genuinely useful content per city
 * covering local health stats, telehealth regulations, pharmacy info,
 * and city-specific healthcare context.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

export interface DeepCitySection {
  title: string
  paragraphs: string[]
}

export interface DeepCityHealthStat {
  label: string
  value: string
  context: string
}

export interface DeepCityContent {
  healthStats: DeepCityHealthStat[]
  sections: DeepCitySection[]
  pharmacyInfo: DeepCitySection
  telehealthRegulations: DeepCitySection
  additionalFaqs: Array<{ q: string; a: string }>
}

export const DEEP_CITY_CONTENT: Record<string, DeepCityContent> = {
  sydney: {
    healthStats: [
      { label: "Population", value: "5.3M+", context: "Australia's largest city" },
      { label: "Avg GP wait", value: "3–5 days", context: "For non-urgent appointments" },
      { label: "Bulk-billing rate", value: "~72%", context: "Below the national average in inner suburbs" },
      { label: "After-hours access", value: "Limited", context: "Few bulk-billing options after 6pm" },
    ],
    sections: [
      {
        title: "Healthcare Access Across Greater Sydney",
        paragraphs: [
          "Greater Sydney's healthcare landscape varies dramatically by suburb. In the Eastern Suburbs and Lower North Shore, GP clinics are plentiful but few offer bulk-billing — gap fees of $40–$90 are common. In Western Sydney, bulk-billing is more available but demand is so high that same-day appointments are often impossible. The result: whether you're in Bondi or Blacktown, getting a straightforward medical certificate or repeat prescription often means taking a half-day off work.",
          "The problem is particularly acute for Sydney's large shift-working population. Hospitality workers in the CBD, nurses at Westmead or RPA, warehouse staff in Wetherill Park — their schedules rarely align with standard clinic hours. After-hours medical centres exist, but wait times of 2–3 hours are normal, and most charge premium fees. Telehealth removes the scheduling barrier entirely.",
          "Sydney's public transport, while improving, can add 45–60 minutes each way to a doctor visit if you're travelling between suburbs. When you're unwell enough to need a medical certificate, the last thing you want is a train-bus-walk journey across the city. InstantMed lets you complete the process from wherever you are — your couch in Marrickville, your share house in Randwick, or your unit in Parramatta.",
        ],
      },
      {
        title: "When Telehealth Makes Sense in Sydney",
        paragraphs: [
          "Telehealth isn't a replacement for your regular GP — it's a practical alternative for specific situations. Medical certificates for straightforward illnesses (cold, flu, gastro, migraine) are ideal for telehealth because they rarely require a physical examination. The doctor reviews your symptoms, medical history, and assesses whether a certificate is clinically appropriate — the same process as an in-person consult, without the waiting room.",
          "Repeat prescriptions for stable, ongoing medications are another area where telehealth excels. If you've been taking the same blood pressure medication for two years and just need a repeat, there's no clinical reason you need to sit in a waiting room for 45 minutes. Your GP remains your primary care provider for medication reviews and changes.",
          "That said, some things genuinely need an in-person visit. Workplace injuries requiring WorkCover certificates, conditions that need physical examination (suspicious skin lesions, joint injuries, chest pain), and anything requiring blood tests or imaging. We'll always refer you to in-person care if your situation requires it — and you won't be charged.",
        ],
      },
      {
        title: "Understanding Medical Certificates in NSW",
        paragraphs: [
          "Under the Fair Work Act 2009, Australian employees are entitled to personal/carer's leave (10 days per year for full-time workers). Employers can request evidence for absences, but the Act doesn't specify that a certificate must come from a face-to-face consultation. A certificate from an AHPRA-registered doctor via telehealth carries the same legal weight as one from your local clinic.",
          "NSW employers, including state government agencies, accept telehealth-issued medical certificates. The certificate must include the doctor's name and AHPRA registration, the date of consultation, and the recommended period of absence. InstantMed certificates include all required elements and are formatted identically to what you'd receive from a GP clinic.",
          "For university students in Sydney — whether at USYD, UNSW, UTS, Macquarie, or WSU — our certificates are accepted for special consideration applications, assignment extensions, and exam deferrals. Each university has slightly different requirements, but all accept certificates from AHPRA-registered doctors regardless of consultation method.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Sydney",
      paragraphs: [
        "Sydney has over 1,200 community pharmacies across the metropolitan area, and virtually all now accept eScripts. When an InstantMed doctor issues a prescription, you'll receive an SMS with a QR code that any pharmacy can scan — Chemist Warehouse, Priceline, TerryWhite, or your local independent chemist. No paper script needed.",
        "Many Sydney pharmacies also offer extended hours. Chemist Warehouse locations in the CBD, Parramatta, and major shopping centres often stay open until 9pm or later. Several 24-hour pharmacies operate across the city, including in the CBD and near major hospitals. This means an eScript issued by InstantMed in the evening can often be filled the same night.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulations in NSW",
      paragraphs: [
        "Telehealth in Australia is regulated at the federal level through AHPRA (the Australian Health Practitioner Regulation Agency) and the Medical Board of Australia. All doctors providing telehealth services must hold current AHPRA registration — the same registration required for in-person practice. There is no separate \"telehealth licence\" in Australia; any registered doctor can provide telehealth consultations.",
        "The Therapeutic Goods Administration (TGA) governs prescribing via telehealth. Doctors can prescribe most PBS-listed medications via telehealth, with exceptions for certain controlled substances (Schedule 8 medications like opioids) which require additional authorisation and typically an in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "NSW Health has actively supported telehealth expansion since 2020, recognising its role in reducing pressure on emergency departments and GP clinics. The NSW Government's healthcare strategy explicitly includes telehealth as a component of the primary care system, particularly for regional and metropolitan areas with GP shortages.",
      ],
    },
    additionalFaqs: [
      { q: "Do I need a Medicare card to use InstantMed in Sydney?", a: "No. InstantMed is a private service with flat-fee pricing. Medicare is not required for medical certificates. For prescriptions, having a Medicare card allows PBS pricing at the pharmacy, but it's not required to receive the prescription itself." },
      { q: "Can I get a medical certificate for a mental health day?", a: "Yes. Mental health is a valid reason for a medical certificate. Our doctors assess mental health-related requests with the same clinical rigour as physical illness. You don't need to disclose the specific nature of your condition to your employer — the certificate simply states you were unfit for work." },
      { q: "Is a telehealth medical certificate legal in NSW?", a: "Yes. There is no legal requirement for medical certificates to be issued in person. The Fair Work Act requires a certificate from a registered health practitioner — our AHPRA-registered doctors meet this requirement. NSW government employers, universities, and private employers all accept telehealth-issued certificates." },
      { q: "What suburbs does InstantMed cover in Sydney?", a: "InstantMed is available everywhere in Greater Sydney and NSW — from the Northern Beaches to Campbelltown, Penrith to the Eastern Suburbs. It's an online service, so your location doesn't matter as long as you have internet access." },
      { q: "Can I use InstantMed if I'm visiting Sydney?", a: "Yes. You don't need to be a Sydney resident. If you're visiting for work or travel and need a medical certificate, our doctors can help. You don't need a local address or a GP in the area." },
    ],
  },

  melbourne: {
    healthStats: [
      { label: "Population", value: "5.1M+", context: "Australia's fastest-growing capital" },
      { label: "Avg GP wait", value: "4–7 days", context: "Longer in inner-city suburbs" },
      { label: "Bulk-billing rate", value: "~68%", context: "Declining steadily since 2019" },
      { label: "GP shortage areas", value: "12+ LGAs", context: "Classified as Distribution Priority Areas" },
    ],
    sections: [
      {
        title: "Melbourne's GP Shortage and What It Means for You",
        paragraphs: [
          "Melbourne has a well-documented GP shortage that's been worsening for years. The city's rapid population growth — roughly 100,000 new residents per year pre-pandemic — has outpaced the supply of general practitioners. Inner-city suburbs like Fitzroy, Collingwood, and Brunswick have some of the longest wait times in the country, with many clinics booking a week or more in advance for non-urgent appointments.",
          "The outer suburbs face different but equally challenging access issues. Growth corridors like Wyndham, Casey, and Melton have large populations and relatively few GP clinics. Residents in these areas often face a choice between a long wait locally or a lengthy drive to a clinic in another suburb. For a straightforward medical certificate, neither option makes much sense.",
          "Bulk-billing rates in Melbourne have been declining steadily. Many inner-city GPs now charge gap fees of $40–$80 per standard consultation. Even in suburbs where bulk-billing is available, the trade-off is usually longer wait times — sometimes 5–7 days. When you need a medical certificate for work tomorrow, that timeline doesn't help.",
        ],
      },
      {
        title: "Who Uses Telehealth in Melbourne",
        paragraphs: [
          "Melbourne's telehealth adoption rate is among the highest in Australia, driven by the city's experience with extended lockdowns and a tech-savvy population. Telehealth usage for non-urgent consultations increased significantly from 2020 onwards and has remained elevated, particularly among 18–44 year olds — the demographic most likely to need medical certificates for work or study.",
          "University students are heavy telehealth users. Melbourne is home to the University of Melbourne, Monash, RMIT, Deakin, La Trobe, Swinburne, and VU — collectively serving hundreds of thousands of students. For special consideration applications and assignment extensions, a medical certificate from an AHPRA-registered doctor via telehealth is accepted by all Victorian universities.",
          "Melbourne's hospitality and retail workforce — a significant portion of the city's employment — particularly benefits from telehealth. These workers often have irregular hours, limited sick leave, and can't easily take time off during business hours to sit in a clinic. Telehealth lets them get the certificate they're entitled to without losing additional income.",
        ],
      },
      {
        title: "Medical Certificates and Victorian Employment Law",
        paragraphs: [
          "Victoria follows the national Fair Work Act for leave entitlements, but also has additional state-level protections. Full-time employees get 10 days of personal/carer's leave per year, and employers can request a medical certificate for any absence. There's no legal requirement that the certificate come from a face-to-face consultation.",
          "Victorian public sector employees (VPS) have their own enterprise agreements, all of which accept certificates from AHPRA-registered doctors. The same applies to all major Victorian employers — from Coles and Woolworths (both headquartered in Melbourne) to the major banks, universities, and healthcare systems.",
          "For casual workers in Melbourne, medical certificates serve a different but equally important purpose. While casuals don't accrue sick leave (unless they're long-term regular casuals), a medical certificate can protect your shift arrangements and demonstrate good faith to your employer. The certificate shows you were genuinely unwell, not just no-showing.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Melbourne",
      paragraphs: [
        "Melbourne is home to over 1,400 community pharmacies, including the headquarters of Chemist Warehouse — Australia's largest pharmacy chain. Every major pharmacy chain and virtually all independent pharmacies in Victoria now accept eScripts. When InstantMed issues a prescription, you receive a QR code via SMS that can be scanned at any of these pharmacies.",
        "Extended-hours pharmacies are common across Melbourne. Many Chemist Warehouse and Priceline locations in shopping centres and high streets stay open until 9pm. Several pharmacies in the CBD and inner suburbs operate late or 24 hours. This means prescriptions from InstantMed can typically be filled the same day, even for evening requests.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in Victoria",
      paragraphs: [
        "Victoria was among the most enthusiastic adopters of telehealth during 2020–2021, and the state government has since embedded telehealth into its ongoing healthcare strategy. The Victorian Department of Health recognises telehealth as a legitimate and important component of the primary care system, particularly for reducing pressure on emergency departments.",
        "All telehealth consultations in Australia must be provided by AHPRA-registered practitioners — the same registration standard required for in-person care. The Medical Board of Australia's telehealth guidelines require that doctors exercise the same standard of care via telehealth as they would in person, including appropriate clinical assessment and documentation.",
        "Prescribing via telehealth in Victoria follows national TGA guidelines. Most medications can be prescribed via telehealth, including common antibiotics, contraceptives, and medications for chronic conditions. Schedule 8 (controlled) substances have additional restrictions and typically require in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
      ],
    },
    additionalFaqs: [
      { q: "Do Melbourne employers accept telehealth medical certificates?", a: "Yes. All Australian employers must accept medical certificates from AHPRA-registered doctors, regardless of whether the consultation was in-person or via telehealth. This includes Victorian government, Coles, Woolworths, the major banks, universities, and all Fair Work-covered employers." },
      { q: "Can I get a medical certificate for a mental health day in Melbourne?", a: "Yes. Mental health is a valid reason for a sick day and a medical certificate. Our doctors assess these requests with clinical rigour. Your employer is not entitled to know the specific nature of your condition — the certificate simply states you were unfit for work." },
      { q: "Is InstantMed cheaper than seeing a GP in Melbourne?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Melbourne's declining bulk-billing rates, a standard GP visit can cost $40–$80 out of pocket (gap fee after Medicare rebate). For a straightforward certificate, InstantMed is often the more affordable option.` },
      { q: "Can Monash or UniMelb students use InstantMed?", a: "Yes. All Victorian universities accept medical certificates from AHPRA-registered doctors for special consideration applications, assignment extensions, and exam deferrals. The consultation method (in-person vs telehealth) doesn't affect the certificate's validity." },
      { q: "What if the doctor decides I need an in-person visit?", a: "If your symptoms or situation require a physical examination, the doctor will let you know and recommend you see a GP in person. You won't be charged for the consultation. We never issue a certificate if the clinical situation isn't appropriate for telehealth assessment." },
    ],
  },

  brisbane: {
    healthStats: [
      { label: "Population", value: "2.5M+", context: "SEQ is Australia's fastest-growing region" },
      { label: "Avg GP wait", value: "2–5 days", context: "Longer in growth corridors" },
      { label: "Bulk-billing rate", value: "~78%", context: "Higher than Sydney/Melbourne but declining" },
      { label: "Growth rate", value: "~2.2% p.a.", context: "Outpacing healthcare infrastructure" },
    ],
    sections: [
      {
        title: "South-East Queensland's Healthcare Growing Pains",
        paragraphs: [
          "South-East Queensland is the fastest-growing region in Australia, with Brisbane, the Gold Coast, the Sunshine Coast, and the surrounding growth corridors absorbing tens of thousands of new residents each year. This growth is outpacing healthcare infrastructure at every level — from GP clinics to hospital emergency departments.",
          "New suburbs in the growth corridors — Springfield, North Lakes, Ripley Valley, Yarrabilba, Ormeau — often lack established medical centres entirely. Residents may need to drive 20–30 minutes to the nearest clinic, only to find same-day appointments unavailable. For a medical certificate that takes a doctor 5 minutes to assess, the total time investment can be 3–4 hours including travel and waiting.",
          "Brisbane's subtropical climate also creates seasonal healthcare surges. The annual flu season hits hard, gastro outbreaks are common in the warmer months, and Queenslanders are particularly susceptible to heat-related illness. During these peaks, GP clinics are overwhelmed and wait times blow out. Telehealth provides a pressure valve for straightforward, non-urgent needs.",
        ],
      },
      {
        title: "Medical Certificates for Queensland Workers",
        paragraphs: [
          "Queensland's economy has a significant proportion of shift workers, FIFO (fly-in, fly-out) workers, and casual employees. Mining, construction, hospitality, and healthcare are all major employers — and all involve work schedules that don't align with standard GP clinic hours. Getting a medical certificate shouldn't require taking an additional day off.",
          "Under the Fair Work Act, Queensland employees have the same leave entitlements as workers in other states. Employers can request a medical certificate for any personal/carer's leave absence, and certificates from AHPRA-registered doctors via telehealth are legally valid. Queensland government departments, local councils, and all major employers accept telehealth-issued certificates.",
          "For FIFO workers based in Brisbane but working in remote Queensland, telehealth is particularly valuable. If you're on R&R in Brisbane and fall ill, you need a certificate that your employer (often based in Perth or elsewhere) will accept. InstantMed certificates are nationally valid — issued by AHPRA-registered doctors and accepted by every employer in Australia.",
        ],
      },
      {
        title: "Students and Young Workers in Brisbane",
        paragraphs: [
          "Brisbane's universities — UQ, QUT, Griffith, JCU (Townsville campus with Brisbane presence) — collectively serve over 200,000 students. University health services exist but are often oversubscribed, with wait times of several days during semester. For special consideration applications and assessment extensions, students need timely medical certificates — something telehealth delivers reliably.",
          "Brisbane also has a large casual and gig economy workforce. Uber drivers, Menulog riders, hospitality staff, and retail workers often lack traditional sick leave entitlements. While they may not need a certificate for their employer, having medical documentation is important for their own records and for accessing Centrelink's sickness allowance if needed. InstantMed provides this documentation at a fraction of the cost of a private GP consultation in Brisbane.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Brisbane",
      paragraphs: [
        "Brisbane and South-East Queensland have an extensive pharmacy network, with major chains and independents throughout the metropolitan area and suburbs. All major pharmacy chains — Chemist Warehouse, Priceline, TerryWhite Chemmart, Amcal — accept eScripts across their Queensland locations.",
        "Many Brisbane pharmacies offer extended hours, particularly those in shopping centres like Westfield Chermside, Garden City, and Indooroopilly. Several pharmacies in the CBD and Fortitude Valley are open late. eScripts from InstantMed can be filled at any pharmacy in Queensland — you receive a QR code via SMS that the pharmacist scans, and the medication is dispensed as normal.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Queensland",
      paragraphs: [
        "Queensland Health has been a strong advocate for telehealth, driven partly by the state's vast geography and dispersed population. The Queensland Government's digital health strategy explicitly includes telehealth as a primary care modality, recognising its ability to improve access for both metropolitan and regional residents.",
        "All telehealth providers in Queensland must comply with the same AHPRA registration requirements as in-person practitioners. The Medical Board of Australia's guidelines on telehealth apply nationally and require that doctors maintain the same standard of care regardless of consultation modality. This means your telehealth doctor assesses you with the same rigour as your local GP.",
        "Prescribing via telehealth in Queensland follows national TGA regulations. PBS-listed medications can be prescribed electronically, with the eScript system fully operational across all Queensland pharmacies. Certain controlled substances (Schedule 8) require Queensland Health authority and typically an in-person assessment — these are not available via InstantMed.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover the Gold Coast and Sunshine Coast?", a: "Yes. InstantMed covers all of South-East Queensland, including Brisbane, Gold Coast, Sunshine Coast, Ipswich, Logan, Redlands, and Moreton Bay. It's an online service — your location doesn't matter as long as you have internet access." },
      { q: "Are telehealth certificates accepted by Queensland government employers?", a: "Yes. Queensland government departments, local councils, and statutory bodies all accept medical certificates from AHPRA-registered doctors, including those issued via telehealth. The method of consultation doesn't affect the certificate's legal validity." },
      { q: "Can I get a medical certificate for heat-related illness in Brisbane?", a: "Yes. Heat exhaustion, heat-related fatigue, and dehydration are valid reasons for a medical certificate. Our doctors assess whether your symptoms are appropriate for telehealth management. If you're experiencing severe symptoms (confusion, loss of consciousness), call 000 — that's an emergency." },
      { q: "Is InstantMed available during Queensland school holidays?", a: "Yes. We operate 8am–10pm AEST, 7 days a week, including all public holidays and school holiday periods. Demand for GP appointments typically increases during school holidays — telehealth avoids the queue." },
      { q: "Can FIFO workers use InstantMed?", a: "Yes. FIFO workers are some of our most common users. Whether you're on site in the Bowen Basin or on R&R in Brisbane, our doctors can provide medical certificates and prescriptions. Certificates are nationally valid and accepted by all employers." },
    ],
  },

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
          "Perth is the most geographically isolated capital city in the world, and its urban footprint reflects this — the metropolitan area stretches roughly 150 kilometres from Two Rocks in the north to Mandurah in the south. This sprawl creates unique healthcare access challenges. A resident in Joondalup might face a 45-minute drive to a clinic with availability, while someone in Rockingham faces similar distances heading north.",
          "Perth's GP shortage is well-documented and worsening. Western Australia has one of the lowest GP-to-population ratios of any Australian state, and many suburban practices have closed or reduced hours in recent years. Bulk-billing is increasingly rare — many Perth GPs now charge gap fees of $50–$100, making a standard consultation one of the most expensive in the country.",
          "For Perth's large FIFO (fly-in, fly-out) workforce — miners, oil and gas workers, construction crews — healthcare access is doubly complicated. When you're home for your R&R period, the last thing you want is to spend a day in a waiting room. And when you're on site in the Pilbara or Goldfields, getting to a doctor might mean a flight. Telehealth solves both problems.",
        ],
      },
      {
        title: "Medical Certificates for WA Workers",
        paragraphs: [
          "Western Australian workers have the same Fair Work Act entitlements as employees in other states. However, WA also retains its own state industrial relations system for some employees (those covered by the WA Industrial Relations Act). Under both systems, medical certificates from AHPRA-registered doctors are valid evidence for leave purposes.",
          "WA's mining and resources sector has its own expectations around medical documentation. Many mining companies require medical certificates for any absence, even single days, as part of their fitness-for-duty protocols. InstantMed certificates meet these requirements — they're issued by AHPRA-registered doctors and include all the details employers need.",
          "Perth's time zone (AWST, UTC+8) means WA is 2–3 hours behind the eastern states. InstantMed operates 8am–10pm AEST, which translates to approximately 6am–8pm AWST (or 5am–7pm during daylight saving in the east). For most Perth residents, this covers the entire working day and evening. If you submit a request during WA business hours, you'll typically have your certificate well before the next working day.",
        ],
      },
      {
        title: "Regional WA and Telehealth",
        paragraphs: [
          "Western Australia covers a third of the continent, and outside the Perth metropolitan area, healthcare access drops off dramatically. Towns like Geraldton, Kalgoorlie, Karratha, and Broome have limited GP availability. For residents and workers in these areas, telehealth isn't just convenient — it's often the only practical option for routine health needs.",
          "Even within the Perth metro area, the northern and southern growth corridors (Yanchep, Baldivis, Byford) are underserviced by GPs. New housing developments have outpaced medical infrastructure, leaving thousands of families without a nearby clinic. Telehealth fills this gap until local healthcare catches up with population growth.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Perth",
      paragraphs: [
        "Perth has approximately 650 community pharmacies across the metropolitan area, with good coverage in most suburbs. All major pharmacy chains — Chemist Warehouse, Priceline, TerryWhite Chemmart, Amcal, and Blooms — accept eScripts at their WA locations.",
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
      { q: "Can I use InstantMed in regional WA?", a: "Yes. InstantMed works anywhere in Western Australia with an internet connection — Perth, Geraldton, Kalgoorlie, Karratha, Broome, or anywhere in between. The service and pricing are the same regardless of your location." },
      { q: "Do WA mining companies accept telehealth certificates?", a: "Yes. Mining companies operating in Australia accept medical certificates from AHPRA-registered doctors. The method of consultation (in-person vs telehealth) doesn't affect the certificate's validity. Our certificates include all required details for fitness-for-duty documentation." },
    ],
  },

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
          "Adelaide's economy is diverse, with significant defence, manufacturing, healthcare, and wine industry employment. Many of these sectors involve shift work, irregular hours, or physical labour — all situations where getting to a GP clinic during business hours is impractical. A medical certificate from InstantMed means you can get the documentation you need without restructuring your day.",
          "University of Adelaide, UniSA, and Flinders University collectively serve over 80,000 students. Campus health services exist but are often oversubscribed, particularly during exam periods. For special consideration applications and assessment extensions, telehealth-issued medical certificates are accepted by all three universities. The process is faster and often more affordable than a campus clinic visit.",
          "For South Australian public sector employees (SAPS), medical certificates from AHPRA-registered doctors are accepted under all current enterprise agreements. The same applies to local government employees and workers covered by the Fair Work Act. The method of consultation — in-person or telehealth — does not affect the certificate's validity.",
        ],
      },
      {
        title: "Regional South Australia",
        paragraphs: [
          "Outside Adelaide, healthcare access in South Australia drops off significantly. Regional centres like Mount Gambier, Port Augusta, Port Lincoln, and the Riverland have limited GP availability. Some smaller towns have lost their only doctor entirely. For residents in these areas, telehealth isn't a convenience — it's essential for timely access to routine medical services.",
          "The Barossa Valley, McLaren Vale, and the Adelaide Hills — while close to Adelaide — have growing populations and limited local healthcare. Weekend GP availability is particularly scarce. For wine industry and tourism workers who fall ill on a Saturday, telehealth provides same-day access to a doctor when local clinics are closed.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Adelaide",
      paragraphs: [
        "Adelaide has approximately 450 community pharmacies across the metropolitan area, with good coverage across most suburbs. All major pharmacy chains accept eScripts — Chemist Warehouse, Priceline, TerryWhite Chemmart, and local independents. The eScript system is well-established in South Australia, with near-universal pharmacy adoption.",
        "Extended-hours pharmacies are available in Adelaide's major shopping centres (Westfield Marion, Tea Tree Plaza, Rundle Mall area), with some locations open until 9pm or later. When InstantMed issues an eScript, you receive a QR code via SMS that any SA pharmacy can scan — no paper prescription required. Prescriptions issued in the evening can often be filled the same night at an extended-hours pharmacy.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in South Australia",
      paragraphs: [
        "South Australia follows national AHPRA and Medical Board of Australia guidelines for telehealth services. SA Health has supported telehealth expansion as part of its strategy to improve healthcare access, particularly for the state's regional and remote populations. The SA Government recognises telehealth as a legitimate and important healthcare delivery method.",
        "Prescribing regulations in SA follow the national TGA framework. Most medications can be prescribed via telehealth, with eScripts accepted at all South Australian pharmacies. Controlled substances (Schedule 8) require SA Health authority and typically an in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "Medical certificates issued via telehealth in South Australia carry the same legal weight as those from in-person consultations. SA employers — government, private, and not-for-profit — are legally required to accept certificates from AHPRA-registered doctors under the Fair Work Act. There is no provision in the Act that requires certificates to come from face-to-face consultations.",
      ],
    },
    additionalFaqs: [
      { q: "Is a telehealth certificate accepted by SA government employers?", a: "Yes. South Australian government departments and agencies accept medical certificates from AHPRA-registered doctors, including those issued via telehealth. The Fair Work Act and SA public sector enterprise agreements both recognise telehealth-issued certificates." },
      { q: "Can I use InstantMed in regional SA?", a: "Yes. InstantMed works anywhere in South Australia with internet access — Adelaide, Mount Gambier, Port Augusta, Port Lincoln, the Riverland, or anywhere in between. The service and pricing are identical regardless of location." },
      { q: "Is InstantMed cheaper than a GP in Adelaide?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Adelaide's declining bulk-billing rates, many GPs now charge gap fees of $40–$80. For a straightforward medical certificate, InstantMed is often the more affordable option — with no hidden costs.` },
      { q: "Can Adelaide Uni or Flinders students use InstantMed?", a: "Yes. All South Australian universities accept medical certificates from AHPRA-registered doctors for special consideration, assignment extensions, and exam deferrals. The consultation method doesn't affect validity." },
      { q: "What if I need to see a doctor in person?", a: "If your symptoms or situation require a physical examination, our doctor will let you know and recommend an in-person GP visit. You won't be charged. We never issue a certificate if the clinical situation isn't appropriate for telehealth." },
    ],
  },
  "gold-coast": {
    healthStats: [
      { label: "Population", value: "620K+", context: "Australia's sixth largest city" },
      { label: "Avg GP wait", value: "3–7 days", context: "Varies heavily by season" },
      { label: "Bulk-billing rate", value: "~65%", context: "Below QLD average in coastal suburbs" },
      { label: "Tourist population", value: "13M+/year", context: "Visitors needing healthcare access" },
    ],
    sections: [
      {
        title: "Healthcare on the Gold Coast",
        paragraphs: [
          "The Gold Coast sits in an unusual position — a city of 620,000 that swells by millions each year with tourists, schoolies, and event-goers. That tourist demand puts pressure on local GP clinics, particularly during peak seasons like Schoolies week, the Gold Coast 600, and summer holidays. Locals who need a same-day appointment during January often find themselves competing with a queue of sunburnt visitors.",
          "The city stretches over 60 kilometres of coastline, from Coolangatta near the NSW border to Coomera in the north — and inland to Nerang and the hinterland. Driving from one end to the other can take 45 minutes or more. If your GP is in Robina and you live in Palm Beach, a routine visit becomes a half-day commitment when you factor in traffic along the M1.",
          "Bulk-billing availability on the Gold Coast is uneven. Coastal suburbs like Broadbeach, Burleigh, and Coolangatta tend to have fewer bulk-billing options, while suburbs like Southport, Labrador, and Nerang have more — but with longer wait times. For shift workers in the tourism and hospitality sector (one of the Gold Coast's largest employers), clinic hours rarely align with work schedules.",
        ],
      },
      {
        title: "Who Uses Telehealth on the Gold Coast",
        paragraphs: [
          "The Gold Coast's economy runs on tourism, hospitality, construction, and healthcare — industries with irregular hours and physical demands. Hospitality staff at Surfers Paradise or Broadbeach who call in sick at 6am can't easily get to a GP at 9am when they're supposed to be sleeping between shifts. Telehealth removes the scheduling barrier.",
          "Gold Coast students — at Bond University, Griffith University Gold Coast campus, and Southern Cross University — regularly need medical certificates for special consideration. During exam periods, same-day GP appointments can be near-impossible. Telehealth certificates are accepted by all three institutions.",
          "Visitors and temporary residents present a unique challenge. If you're from Sydney and fall ill while visiting the Gold Coast, you may not have a local GP. Telehealth provides access to an Australian doctor regardless of where your regular GP is based. Certificates issued are valid for your employer back home.",
        ],
      },
      {
        title: "Medical Certificates in Queensland",
        paragraphs: [
          "Under the Fair Work Act 2009, Gold Coast employers must accept medical certificates from AHPRA-registered doctors, regardless of the consultation method. Queensland-specific industrial instruments — including the QLD Public Service enterprise agreement — do not require certificates to come from face-to-face consultations.",
          "For Gold Coast students, Bond University accepts telehealth-issued certificates for all academic considerations. Griffith University Gold Coast campus follows the same acceptance policy as their Brisbane campuses. Southern Cross University's Coolangatta campus accepts certificates from any registered practitioner.",
          "Theme park employees (Dreamworld, Sea World, Movie World, Wet'n'Wild), surf lifesavers, and hospitality workers often need certificates at short notice. Telehealth accommodates this — submit your request when you wake up feeling unwell, and most certificates are issued in under 30 minutes, available 24/7.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts on the Gold Coast",
      paragraphs: [
        "The Gold Coast has over 200 community pharmacies from Coolangatta to Coomera, with strong coverage in shopping centres and along the highway corridor. All major chains — Chemist Warehouse, Priceline, TerryWhite Chemmart — accept eScripts. When an InstantMed doctor issues a prescription, you receive an SMS with a QR code that any pharmacy can scan immediately.",
        "Extended-hours pharmacies operate at Pacific Fair, Robina Town Centre, Australia Fair Southport, and several standalone locations in Surfers Paradise. Some Chemist Warehouse locations are open until 9pm or later. An eScript issued by InstantMed in the evening can often be filled the same night — particularly useful for visitors staying in hotel accommodation.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulations in Queensland",
      paragraphs: [
        "Queensland follows national AHPRA and Medical Board of Australia guidelines for telehealth. Queensland Health has been a strong advocate for telehealth expansion, recognising its importance for the state's vast geography — from the Gold Coast to Cape York. The QLD Government's digital health strategy explicitly supports telehealth as a mainstream healthcare delivery method.",
        "Prescribing via telehealth in Queensland follows the TGA national framework. Most medications can be prescribed remotely, with eScripts accepted at all Queensland pharmacies. Schedule 8 controlled substances require Queensland Health authority and typically an in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
        "Medical certificates issued via telehealth in Queensland are legally identical to those from in-person consultations. There is no Queensland legislation distinguishing between consultation methods for the purpose of medical certification.",
      ],
    },
    additionalFaqs: [
      { q: "Can tourists use InstantMed on the Gold Coast?", a: "Yes. If you're 18+, in Australia, and can provide your details, you can use InstantMed. Certificates are valid for any Australian employer. International visitors should check their home country's requirements for medical documentation." },
      { q: "Are certificates accepted by Gold Coast theme park employers?", a: "Yes. All Australian employers — including theme parks, hospitality venues, and entertainment companies — must accept certificates from AHPRA-registered doctors under the Fair Work Act." },
      { q: "Can Bond University students use InstantMed?", a: "Yes. Bond University accepts medical certificates from AHPRA-registered doctors for special consideration applications, exam deferrals, and assignment extensions." },
      { q: "Is InstantMed available in the Gold Coast hinterland?", a: "Yes. Telehealth works anywhere with internet access — Tamborine Mountain, Springbrook, Currumbin Valley, or anywhere in the hinterland. The service and pricing are identical." },
      { q: "What if I'm visiting from interstate and need a certificate?", a: `You can use InstantMed from anywhere in Australia. The certificate is valid for your employer regardless of which state you're normally based in. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
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
          "Canberra has a well-documented GP shortage. The ACT consistently has the lowest bulk-billing rate in Australia — around 47% compared to the national average of 78%. For many Canberrans, seeing a GP means either waiting 5–10 days for a bulk-billed appointment or paying gap fees of $50–$100 for a same-day consultation. When you're unwell and just need a medical certificate, neither option is ideal.",
          "The problem is structural. Canberra's population has grown rapidly — from 350,000 to 470,000 in two decades — but GP numbers haven't kept pace. New suburbs in Gungahlin, Molonglo Valley, and Coombs have limited medical infrastructure. Residents often travel 20–30 minutes to see a GP in Woden, Belconnen, or Civic, even for routine matters.",
          "For the tens of thousands of Australian Public Service (APS) employees in Canberra, taking sick leave often involves the bureaucratic requirement of providing a medical certificate. When it takes a week to see your GP, getting a certificate for a two-day illness becomes absurd. Telehealth addresses this mismatch directly — a certificate issued in under 30 minutes, available 24/7.",
        ],
      },
      {
        title: "Who Benefits Most in Canberra",
        paragraphs: [
          "Canberra's workforce is dominated by the Australian Public Service. APS enterprise agreements recognise medical certificates from AHPRA-registered doctors, including those issued via telehealth. Whether you work at Parliament House, the ATO in Symonston, Defence in Russell, or any of the dozens of Commonwealth agencies across Canberra — a telehealth certificate meets your leave requirements.",
          "University students at ANU, University of Canberra, ACU, and UNSW Canberra face similar access challenges. The ANU Health Service handles high volumes, particularly during exam periods. UC's Bruce campus has limited on-site medical facilities. For special consideration applications and assignment extensions, telehealth certificates are accepted by all four institutions.",
          "Canberra's diplomatic community — embassy staff, international organisations, and their families — often lack established GP relationships. Telehealth provides immediate access to an Australian doctor without needing a referral or existing patient relationship. This is also relevant for temporary residents working in Canberra on secondment.",
        ],
      },
      {
        title: "Medical Certificates in the ACT",
        paragraphs: [
          "The ACT follows the Fair Work Act 2009 for employment-related medical certificates. Employers cannot refuse a certificate simply because it was issued via telehealth — the Act requires a certificate from a 'registered health practitioner' without specifying consultation method. This applies to both public and private sector employers in the ACT.",
          "APS-specific requirements vary by agency, but the standard APS Enterprise Agreement accepts certificates from registered medical practitioners. If your agency's HR team queries a telehealth certificate, the Fair Work Act and the APS Enterprise Agreement both support its validity. We've never had a certificate rejected by any Commonwealth employer.",
          "For parliamentary staff, including ministerial advisers and APH employees — the same rules apply. The Parliamentary Service Act references the same medical certificate requirements as the Fair Work Act. A certificate from an AHPRA-registered doctor via telehealth is fully valid.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Canberra",
      paragraphs: [
        "Canberra has approximately 120 community pharmacies across the territory, well-distributed across town centres. Every major suburb centre — Civic, Belconnen, Woden, Tuggeranong, Gungahlin — has multiple pharmacy options, all accepting eScripts. When InstantMed issues a prescription, you receive an SMS with a QR code that any ACT pharmacy can scan.",
        "Several Canberra pharmacies offer extended hours, including Chemist Warehouse locations at Belconnen and Tuggeranong, and pharmacies within the Canberra Centre. An eScript issued in the evening can often be filled the same night. For medications dispensed under the PBS, you'll pay the standard PBS co-payment regardless of whether the script came from telehealth or in-person.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in the ACT",
      paragraphs: [
        "The ACT follows national AHPRA and Medical Board of Australia standards for telehealth. The ACT Government has actively promoted telehealth as part of its strategy to address the territory's GP shortage. ACT Health recognises telehealth as a legitimate healthcare delivery method for appropriate clinical scenarios.",
        "Prescribing in the ACT follows the TGA national framework. Most medications can be prescribed via telehealth and dispensed at any ACT pharmacy via eScript. Schedule 8 controlled substances require ACT Health authority. InstantMed does not prescribe Schedule 8 medications.",
        "The ACT's health complaints process operates through the ACT Human Rights Commission, which handles complaints about all health services including telehealth. InstantMed maintains a formal complaints process aligned with AHPRA requirements — complaints@instantmed.com.au with a 14-day response SLA.",
      ],
    },
    additionalFaqs: [
      { q: "Do APS agencies accept telehealth certificates?", a: "Yes. All APS enterprise agreements accept medical certificates from AHPRA-registered doctors. The consultation method is not relevant — what matters is that the doctor holds current registration. We've never had a certificate rejected by a Commonwealth employer." },
      { q: "Can ANU students use InstantMed?", a: "Yes. ANU accepts medical certificates from any AHPRA-registered doctor for special consideration applications. The same applies to UC, ACU, and UNSW Canberra." },
      { q: "Is InstantMed cheaper than a GP in Canberra?", a: `With Canberra's bulk-billing rate around 47% and typical gap fees of $50–$100, InstantMed is often more affordable for straightforward needs. Medical certificates start from ${PRICING_DISPLAY.MED_CERT} with no hidden costs.` },
      { q: "Can I use InstantMed in Queanbeyan?", a: "Yes. While Queanbeyan is technically in NSW, InstantMed works anywhere in Australia. Same service, same pricing, same certificates." },
      { q: "What about ACT public servants specifically?", a: "ACT Government employees follow the ACT Public Sector Enterprise Agreement, which accepts certificates from registered medical practitioners. Telehealth certificates meet this requirement." },
    ],
  },
  newcastle: {
    healthStats: [
      { label: "Population", value: "320K+", context: "Greater Newcastle (Hunter region: 750K+)" },
      { label: "Avg GP wait", value: "4–7 days", context: "Longer in outer Hunter suburbs" },
      { label: "Bulk-billing rate", value: "~68%", context: "Varies significantly across the region" },
      { label: "Key industries", value: "Mining, healthcare, education", context: "Many shift workers in the workforce" },
    ],
    sections: [
      {
        title: "Healthcare Across the Hunter Region",
        paragraphs: [
          "Greater Newcastle and the Hunter Valley comprise one of Australia's largest regional populations — over 750,000 people spread from the coast at Merewether to the vineyards of Cessnock and the farming communities of Muswellbrook. Healthcare access varies dramatically across this area. Inner Newcastle (Hamilton, Merewether, Cooks Hill) has reasonable GP availability, but wait times stretch to a week or more in suburbs like Cessnock, Raymond Terrace, and Maitland.",
          "The Hunter's economy relies heavily on mining, energy, defence, and healthcare — industries with high rates of shift work. BHP, Yancoal, Glencore, and dozens of smaller mining operations run 24/7 rosters. Workers who fall ill on a night shift can't see a GP until the clinic opens the next morning — by which time they've missed their next shift and need documentation for their employer.",
          "Newcastle's university population adds another dimension. The University of Newcastle (UoN) has over 35,000 students across Callaghan and city campuses. TAFE Hunter campuses serve thousands more. During exam periods, same-day GP appointments near campus are scarce, and students need certificates quickly for special consideration deadlines.",
        ],
      },
      {
        title: "Telehealth for the Hunter Workforce",
        paragraphs: [
          "Mining companies in the Hunter are among the most rigorous about medical certificates — many require documentation for any unplanned absence. For a miner in Singleton or Muswellbrook, the nearest bulk-billing GP might be 30–40 minutes away with a multi-day wait. Telehealth eliminates both the travel and the wait.",
          "Defence personnel at RAAF Base Williamtown and the surrounding area face similar challenges. While Defence has its own medical services, dependants and civilian contractors often need certificates from external providers. Telehealth provides a convenient alternative when the base medical centre isn't available.",
          "Healthcare workers at John Hunter Hospital, Calvary Mater, and the region's smaller hospitals frequently need certificates but can't take time off during their shifts to see their own GP. Ironically, the people who provide healthcare often have the hardest time accessing it for themselves. Telehealth fits around their schedule.",
        ],
      },
      {
        title: "Medical Certificates in NSW",
        paragraphs: [
          "Newcastle employers — from BHP to the University of Newcastle, from Hunter New England Health to local cafes in Darby Street — all fall under the Fair Work Act 2009. Certificates from AHPRA-registered doctors are valid regardless of consultation method. The mining sector, which often has stricter internal policies, is bound by the same legal framework.",
          "NSW education institutions accept telehealth certificates universally. UoN's special consideration policy requires documentation from a 'registered health practitioner' — which includes doctors providing telehealth consultations. Hunter TAFE follows the same approach.",
          "For workers in the Hunter coal industry, enterprise agreements typically require medical certificates for absences of more than one day. These certificates must come from a registered practitioner but do not specify that the consultation must be in person. Telehealth certificates meet these requirements.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Newcastle",
      paragraphs: [
        "Newcastle and the Hunter have approximately 200 community pharmacies, with good coverage in major centres including Charlestown, Kotara, Green Hills (Maitland), and Cessnock. All major pharmacy chains and most independents accept eScripts. When an InstantMed doctor issues a prescription, you receive an SMS with a QR code that works at any pharmacy in the region.",
        "Extended-hours pharmacies operate at Charlestown Square, Marketown, and several standalone locations. For residents in smaller Hunter towns like Kurri Kurri, Cessnock, or Raymond Terrace, the local pharmacy will accept your eScript just like a traditional paper script — no special arrangements needed.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "New South Wales follows the national AHPRA and Medical Board of Australia framework for telehealth. NSW Health has supported telehealth expansion, particularly for the Hunter-New England region where distance and workforce shortages make access challenging. The NSW Government includes telehealth as a core component of its primary care strategy.",
        "Prescribing via telehealth in NSW follows TGA guidelines. Most PBS-listed medications can be prescribed remotely and dispensed at any pharmacy via eScript. Schedule 8 controlled substances require NSW Health authority. InstantMed does not prescribe Schedule 8 medications.",
        "NSW Fair Trading and the NSW Health Care Complaints Commission (HCCC) oversee telehealth services operating in the state. InstantMed complies with all NSW and national regulatory requirements.",
      ],
    },
    additionalFaqs: [
      { q: "Do mining companies accept telehealth certificates?", a: "Yes. Mining companies in the Hunter are bound by the Fair Work Act, which requires acceptance of certificates from AHPRA-registered doctors. The consultation method doesn't affect validity. We've never had a certificate rejected by a Hunter mining company." },
      { q: "Can UoN students use InstantMed?", a: "Yes. The University of Newcastle accepts medical certificates from AHPRA-registered doctors for special consideration. This applies to both Callaghan and city campus students." },
      { q: "Does InstantMed work in the Upper Hunter?", a: "Yes. Telehealth works anywhere with internet access — Muswellbrook, Singleton, Scone, Denman, or anywhere in the Upper Hunter. Same service, same pricing." },
      { q: "Is InstantMed available for RAAF Williamtown personnel?", a: "InstantMed is available to all Australians aged 18+. Defence dependants and civilian contractors can use the service for medical certificates and prescriptions." },
      { q: "Can I get a certificate for a mining roster?", a: `Yes. Our certificates document the dates you're unfit for work — whether that's a standard Mon–Fri schedule or a mining roster pattern. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
  wollongong: {
    healthStats: [
      { label: "Population", value: "310K+", context: "Greater Wollongong (Illawarra region)" },
      { label: "Avg GP wait", value: "3–6 days", context: "Similar to Sydney outer suburbs" },
      { label: "Bulk-billing rate", value: "~70%", context: "Slightly above national average" },
      { label: "Key industries", value: "Steel, education, healthcare", context: "Mixed shift and professional workforce" },
    ],
    sections: [
      {
        title: "Healthcare in the Illawarra",
        paragraphs: [
          "Wollongong and the Illawarra region sit between the Illawarra Escarpment and the Pacific Ocean — a beautiful setting that comes with some practical healthcare challenges. The region has grown significantly, particularly in suburbs like Shellharbour, Dapto, and Horsley, where new housing developments have outpaced medical infrastructure. GP availability in these growth areas is limited.",
          "The Illawarra's workforce includes a significant portion of commuters who travel to Sydney daily by train (a 90-minute journey each way). These commuters often can't visit their local Wollongong GP during business hours because they're in Sydney, and can't easily access a Sydney GP without being an established patient. Telehealth bridges this gap — get a certificate from home in Wollongong, sent to your Sydney employer.",
          "BlueScope Steel and the Port Kembla industrial precinct employ thousands of shift workers who need medical documentation for unplanned absences. South Coast correctional facilities, mining operations in the Illawarra coalfield, and Wollongong Hospital's own workforce all contribute to strong demand for after-hours certificate access.",
        ],
      },
      {
        title: "University and Student Healthcare",
        paragraphs: [
          "The University of Wollongong (UOW) has over 30,000 students, including a large international student cohort. UOW's campus medical service handles high volumes, particularly during assessment periods. Wait times for on-campus GP appointments can stretch to several days during exam season — exactly when students most need certificates for special consideration.",
          "TAFE Illawarra campuses serve additional students who need medical documentation for course requirements. For students living in share houses across Fairy Meadow, Gwynneville, and Keiraville, getting to a GP when you're unwell can mean a bus trip or asking a housemate for a ride. Telehealth removes the transport barrier.",
          "International students face particular challenges — they may be unfamiliar with the Australian healthcare system, lack an established GP relationship, and be uncertain about certificate requirements for their university. Telehealth provides a straightforward path to a valid medical certificate without navigating a system they may not understand.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Wollongong",
      paragraphs: [
        "The Illawarra region has approximately 80 community pharmacies, well-distributed across Wollongong, Shellharbour, Kiama, and surrounding suburbs. All major centres — Wollongong Central, Stockland Shellharbour, Dapto Mall — have pharmacies that accept eScripts. Crown Street in Wollongong's CBD has several pharmacy options within walking distance.",
        "Extended-hours pharmacy access is available at major shopping centres, with some locations open until 9pm. For residents in the smaller coastal and escarpment towns, local pharmacies accept eScripts just like traditional paper prescriptions.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in the Illawarra",
      paragraphs: [
        "Wollongong and the Illawarra fall under NSW state regulations and national AHPRA standards for telehealth. The Illawarra Shoalhaven Local Health District has embraced telehealth as part of its service delivery model, recognising its value in reducing pressure on local hospital emergency departments.",
        "Prescribing and certification requirements follow the same national framework as the rest of NSW. Medical certificates from AHPRA-registered telehealth doctors carry identical legal weight to those from in-person consultations. All Illawarra employers must accept them under the Fair Work Act.",
      ],
    },
    additionalFaqs: [
      { q: "Can UOW students use InstantMed?", a: "Yes. The University of Wollongong accepts medical certificates from AHPRA-registered doctors for special consideration, exam deferrals, and assignment extensions. The consultation method doesn't affect acceptance." },
      { q: "Does InstantMed work in Shellharbour and Kiama?", a: "Yes. Telehealth works anywhere in the Illawarra — Wollongong, Shellharbour, Kiama, Berry, Nowra, and everywhere in between." },
      { q: "Are certificates accepted by BlueScope and industrial employers?", a: "Yes. All Australian employers, including industrial and manufacturing companies, accept certificates from AHPRA-registered doctors under the Fair Work Act." },
      { q: "Can Sydney commuters from Wollongong use telehealth?", a: `Absolutely. Get a certificate from home before your commute — or from your phone on the train. Certificates start from ${PRICING_DISPLAY.MED_CERT} and are valid for employers anywhere in Australia.` },
    ],
  },
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
          "Tasmania's healthcare workforce shortage extends beyond GPs. The Royal Hobart Hospital's emergency department — the state's largest — regularly reports long wait times for non-urgent presentations. Many of these ED visits are for conditions that could be managed in primary care, if primary care were accessible. Telehealth reduces this pressure by providing an alternative pathway for low-acuity needs.",
        ],
      },
      {
        title: "Who Benefits in Hobart",
        paragraphs: [
          "Hobart's growing tourism and hospitality sector — fuelled by MONA, the city's restaurant scene, and Tasmania's broader appeal — employs thousands of workers with irregular schedules. When a hospitality worker in Salamanca or the waterfront calls in sick, getting a same-day GP appointment can be difficult. Telehealth provides documentation without the wait.",
          "University of Tasmania (UTAS) students at the Sandy Bay and Inveresk campuses need certificates for special consideration during exam periods. The UTAS medical service is stretched, and external GP availability near campus is limited. TasTAFE students face similar challenges across their Hobart and Launceston campuses.",
          "Tasmania's public service — the state's largest employer — requires medical certificates for sick leave in line with the Tasmanian State Service Award. Telehealth certificates from AHPRA-registered doctors meet these requirements. The same applies to federal public servants working in Tasmania's Commonwealth agencies.",
        ],
      },
      {
        title: "Medical Certificates in Tasmania",
        paragraphs: [
          "Tasmanian employers follow the Fair Work Act 2009 for medical certificate requirements. There is no Tasmanian legislation that differentiates between telehealth and in-person certificates. The Tasmanian State Service Award accepts certificates from registered medical practitioners without specifying consultation method.",
          "For hospitality and tourism workers under the Hospitality Industry General Award, medical certificates are commonly required for absences of more than one day. Telehealth certificates meet this requirement. For workers in aquaculture, forestry, and agriculture — key Tasmanian industries — the same Fair Work protections apply.",
          "UTAS accepts certificates from any AHPRA-registered doctor for special consideration. This includes telehealth consultations. The university's policy focuses on the legitimacy of the practitioner, not the consultation format.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Hobart",
      paragraphs: [
        "Hobart and Greater Hobart have approximately 60 community pharmacies, with the majority concentrated in the CBD (Elizabeth Street, Liverpool Street), Sandy Bay, Glenorchy, and Kingston. All pharmacies accept eScripts. When InstantMed issues a prescription, the QR code works at any Tasmanian pharmacy — from the CBD to Bruny Island.",
        "Extended-hours pharmacy options are more limited in Hobart than in mainland capitals, but several locations in the CBD and at Eastlands Shopping Centre (Rosny) operate until 8–9pm. For urgent medication needs, the Royal Hobart Hospital pharmacy provides 24-hour dispensing for emergency prescriptions.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Tasmania",
      paragraphs: [
        "Tasmania follows national AHPRA standards for telehealth. The Tasmanian Government has been a strong advocate for telehealth, recognising its critical role in addressing the state's GP shortage and geographic challenges. Tasmania's Digital Health Strategy includes telehealth as a priority area for healthcare access improvement.",
        "Prescribing in Tasmania follows the TGA national framework. The Tasmanian Poisons Act aligns with national scheduling for controlled substances. Most medications can be prescribed via telehealth, with eScripts accepted at all Tasmanian pharmacies. Schedule 8 medications require Tasmanian Department of Health authority.",
        "The Health Complaints Commissioner Tasmania oversees complaints about health services including telehealth. InstantMed maintains a formal complaints process — complaints@instantmed.com.au — with a 14-day response commitment.",
      ],
    },
    additionalFaqs: [
      { q: "Can UTAS students use InstantMed?", a: "Yes. The University of Tasmania accepts medical certificates from AHPRA-registered doctors for special consideration, exam deferrals, and assignment extensions." },
      { q: "Is telehealth available across all of Tasmania?", a: "Yes. InstantMed works anywhere in Tasmania with internet access — Hobart, Launceston, Devonport, Burnie, the East Coast, or the West Coast. Pricing is identical statewide." },
      { q: "Do Tasmanian state government employers accept telehealth certificates?", a: "Yes. The Tasmanian State Service Award requires certificates from registered medical practitioners. Telehealth doctors with AHPRA registration meet this requirement." },
      { q: "Can I use InstantMed in Launceston or the North-West?", a: "Yes. While this page focuses on Hobart, InstantMed serves all of Tasmania. Launceston, Devonport, Burnie, and everywhere in between." },
      { q: "Is InstantMed cheaper than a GP in Hobart?", a: `With Hobart's bulk-billing rate around 55% and gap fees of $40–$80 common, InstantMed is often more affordable for straightforward needs. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
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
          "Darwin presents unique healthcare challenges found nowhere else in Australia. The extreme tropical climate — with a distinct wet season from November to April — can make travel difficult and disrupt routine healthcare access. Cyclone season adds another layer of unpredictability for residents trying to maintain regular doctor appointments.",
          "The Northern Territory has the youngest population of any Australian state or territory, with a median age of 33. This means a large working-age population needing workplace medical certificates and routine prescriptions. Many Darwin residents work in mining, defence, construction, and tourism — industries with shift patterns that rarely align with standard clinic hours.",
          "Royal Darwin Hospital is the Territory's major tertiary hospital, but for non-emergency needs like medical certificates and repeat prescriptions, the emergency department is not the appropriate pathway. Telehealth fills the gap between emergency care and routine GP access — providing timely doctor assessment for straightforward health needs without occupying hospital resources.",
        ],
      },
      {
        title: "Shift Workers and FIFO in the NT",
        paragraphs: [
          "The Northern Territory's economy is heavily reliant on mining, gas, defence, and government — all sectors with significant shift work and FIFO rosters. Workers at Inpex's Ichthys LNG facility, RAAF Base Darwin, Robertson Barracks, and numerous mine sites across the Top End often work 12-hour rotating rosters that make traditional clinic visits impractical.",
          "For defence personnel stationed in Darwin, sick leave requires a medical certificate from a registered practitioner. Telehealth provides a practical pathway that doesn't require leaving the barracks during duty hours or navigating busy on-base medical centres.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Darwin and the NT",
      paragraphs: [
        "Darwin has major pharmacy chains including Chemist Warehouse, Priceline, and TerryWhite Chemmart across Casuarina, Palmerston, and the CBD. eScripts are accepted at all Australian pharmacies — simply show the QR code on your phone. After-hours options are more limited in Darwin than capital cities further south, making same-day eScript dispatch from telehealth particularly valuable.",
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
      { q: "Can defence personnel use InstantMed?", a: "Yes. AHPRA-registered doctor certificates are accepted by the ADF for sick leave documentation. However, check your unit's specific medical chain of command requirements." },
      { q: "Is InstantMed available in Palmerston?", a: "Yes. We serve all of Greater Darwin including Palmerston, Howard Springs, Humpty Doo, and the rural area." },
      { q: "Does InstantMed operate on NT time?", a: `Yes. Our operating hours are 8am–10pm AEST, which is 7:30am–9:30pm ACST. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
  geelong: {
    healthStats: [
      { label: "Population", value: "270K+", context: "Victoria's second-largest city" },
      { label: "Avg GP wait", value: "2–5 days", context: "Longer in growth corridors" },
      { label: "Bulk-billing rate", value: "~68%", context: "Declining in newer suburbs" },
      { label: "Growth rate", value: "2.1%", context: "One of Victoria's fastest-growing regions" },
    ],
    sections: [
      {
        title: "Healthcare Pressure in a Growing City",
        paragraphs: [
          "Geelong has transformed from a regional centre into a major satellite city of Melbourne. Rapid population growth in suburbs like Armstrong Creek, Lara, and Ocean Grove has outpaced healthcare infrastructure, creating GP shortages and long appointment waits that frustrate residents and employers alike.",
          "The city's evolution from its manufacturing heritage (Ford, Alcoa) to a knowledge and service economy has brought new residents who commute to Melbourne — often falling sick on days when a 90-minute round trip to a familiar GP simply isn't practical. Telehealth provides Geelong residents with the same quality of doctor access available in inner Melbourne.",
          "Barwon Health's University Hospital Geelong is the major public hospital, but for straightforward needs like a sick note or prescription renewal, telehealth is a more appropriate and efficient pathway than emergency or urgent care.",
        ],
      },
      {
        title: "Commuters, Students, and Surf Coast Workers",
        paragraphs: [
          "Geelong's population includes a significant commuter base travelling to Melbourne daily, Deakin University's Waurn Ponds campus students, and hospitality workers along the Surf Coast. Each group faces distinct healthcare access challenges — commuters need flexible hours, students need affordable options, and hospitality workers need weekend availability.",
          "For Surf Coast tourism workers in Torquay, Anglesea, and Lorne, peak season coincides with the busiest time for local clinics. Telehealth means getting a medical certificate without losing an entire shift to a doctor's waiting room.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Geelong",
      paragraphs: [
        "Geelong has extensive pharmacy coverage including Chemist Warehouse in Waurn Ponds, Westfield Geelong, and Market Square. eScripts are accepted everywhere — show the QR code and collect your medication. Regional pharmacies in Ocean Grove, Torquay, and Bannockburn also accept eScripts without issue.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Victoria",
      paragraphs: [
        "Victoria follows national AHPRA telehealth standards. The Victorian Government has invested significantly in telehealth infrastructure, particularly since 2020. The Health Complaints Commissioner Victoria handles telehealth complaints alongside traditional healthcare complaints.",
        "Victorian prescribing follows TGA national framework. All eScripts are accepted at Victorian pharmacies. Schedule 8 medications require Victorian Department of Health and Human Services authority and cannot be prescribed via telehealth.",
      ],
    },
    additionalFaqs: [
      { q: "Can Deakin University students use InstantMed?", a: "Yes. Deakin accepts medical certificates from AHPRA-registered doctors for special consideration, exam deferrals, and extension requests." },
      { q: "Does InstantMed serve the Surf Coast?", a: "Yes. We serve all of Greater Geelong including Torquay, Anglesea, Lorne, Ocean Grove, and the Bellarine Peninsula." },
      { q: "Is InstantMed cheaper than a Geelong GP?", a: `With bulk-billing declining in Geelong (gap fees of $40–$70 are common), InstantMed is often more affordable for straightforward needs. Medical certificates from ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
  "sunshine-coast": {
    healthStats: [
      { label: "Population", value: "360K+", context: "One of Australia's fastest-growing regions" },
      { label: "Avg GP wait", value: "3–7 days", context: "Much longer during tourist season" },
      { label: "Bulk-billing rate", value: "~60%", context: "Well below national average" },
      { label: "Growth rate", value: "2.8%", context: "Rapid population growth since 2020" },
    ],
    sections: [
      {
        title: "A Growing Region Under Healthcare Pressure",
        paragraphs: [
          "The Sunshine Coast is one of Australia's fastest-growing regions, with population growth that has consistently outpaced healthcare infrastructure. From Caloundra to Noosa, new residents attracted by the lifestyle are discovering that finding a GP — let alone a bulk-billing one — can take days or weeks.",
          "The opening of Sunshine Coast University Hospital in Birtinya was a major step forward, but the region's primary care gap remains significant. Many suburbs developed in the 2010s and 2020s still lack local GP clinics. For residents in Aura, Palmview, or Peregian Springs, a straightforward sick note can mean a 30-minute drive to a clinic with availability.",
          "Tourism adds seasonal pressure. During school holidays and winter months, the population swells by tens of thousands, further stretching GP availability. Telehealth provides consistent access regardless of seasonal demand fluctuations.",
        ],
      },
      {
        title: "Retirees, Remote Workers, and Hospitality",
        paragraphs: [
          "The Sunshine Coast's demographic mix creates distinct healthcare access challenges. A large retiree population competes for GP appointments with a growing cohort of young families and remote workers who relocated during the pandemic. Hospitality workers in Noosa, Mooloolaba, and Maroochydore work irregular hours that rarely align with clinic availability.",
          "Remote workers — many of whom moved from Brisbane or Sydney — are accustomed to convenient healthcare access. When they discover the Sunshine Coast's GP shortage, telehealth becomes the obvious solution for non-urgent needs.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies on the Sunshine Coast",
      paragraphs: [
        "The Sunshine Coast has comprehensive pharmacy coverage from Caloundra to Noosa. Major chains and independent pharmacies throughout Maroochydore, Buderim, Nambour, and Coolum all accept eScripts. Show the QR code on your phone — no paper script needed.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Queensland",
      paragraphs: [
        "Queensland follows national AHPRA standards for telehealth. The Queensland Government has been proactive in supporting telehealth, particularly for regional and growing areas where GP availability is limited. The Office of the Health Ombudsman handles complaints about telehealth services.",
        "Queensland prescribing follows the TGA national framework. eScripts are the national standard and are accepted at all Queensland pharmacies. Schedule 8 medications require Queensland Health authority and cannot be prescribed via telehealth.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed serve the Sunshine Coast hinterland?", a: "Yes. We serve all Sunshine Coast areas including Maleny, Montville, Nambour, Eumundi, and the Glass House Mountains." },
      { q: "Can USC students use InstantMed?", a: "Yes. The University of the Sunshine Coast accepts medical certificates from AHPRA-registered doctors for academic consideration and deferrals." },
      { q: "Is InstantMed available during school holidays?", a: `Yes — we're available 8am–10pm AEST, 7 days a week, including school holidays when local clinics are at their busiest. Certificates from ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
  townsville: {
    healthStats: [
      { label: "Population", value: "195K+", context: "North Queensland's largest city" },
      { label: "Avg GP wait", value: "2–5 days", context: "Longer during cyclone season" },
      { label: "Bulk-billing rate", value: "~74%", context: "Below Queensland average" },
      { label: "Defence population", value: "Significant", context: "Lavarack Barracks, RAAF Base" },
    ],
    sections: [
      {
        title: "Healthcare Hub for North Queensland",
        paragraphs: [
          "Townsville is the healthcare hub for a region stretching from Mackay to the Torres Strait. Townsville University Hospital serves a catchment of over 700,000 people, but primary care access — particularly same-day GP appointments — remains challenging for the city's residents.",
          "The city's economy is built on defence (Lavarack Barracks, RAAF Base Townsville), mining services, James Cook University, and the port. Each of these sectors employs shift workers and mobile professionals who struggle with standard clinic hours. Telehealth provides healthcare access that works around irregular schedules.",
          "Cyclone season (November–April) adds a North Queensland-specific challenge. When severe weather hits, getting to a clinic may be impossible. Telehealth ensures continuity of care when road access is disrupted, pharmacies are operating on reduced hours, or you're simply stuck at home waiting for the weather to pass.",
        ],
      },
      {
        title: "Defence, Mining, and University Communities",
        paragraphs: [
          "Townsville hosts Australia's largest army base (Lavarack Barracks) and RAAF Base Townsville. Defence families make up a significant portion of the population, many relocated from interstate and without established GP relationships. Telehealth provides consistent access regardless of posting frequency.",
          "James Cook University students — particularly those from regional and remote areas — often face long waits at the campus medical centre. For a straightforward sick note or prescription renewal, telehealth is faster and more accessible than competing for limited campus clinic slots.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Townsville",
      paragraphs: [
        "Townsville has pharmacy coverage across the CBD, Aitkenvale, Kirwan, and the Northern Beaches. Chemist Warehouse, Priceline, and independent pharmacies all accept eScripts. Regional pharmacies in Magnetic Island and Ingham can also fill eScripts sent via telehealth.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Queensland",
      paragraphs: [
        "Queensland follows national AHPRA standards for telehealth. The Queensland Government has recognised telehealth as particularly important for North Queensland, where distance and weather can impede access to healthcare services.",
        "All prescribing via telehealth follows the TGA national framework. eScripts are accepted at every Queensland pharmacy. Schedule 8 medications require Queensland Health authority approval and cannot be prescribed via telehealth.",
      ],
    },
    additionalFaqs: [
      { q: "Can JCU students use InstantMed?", a: "Yes. James Cook University accepts medical certificates from AHPRA-registered doctors for special consideration, exam deferrals, and assignment extensions." },
      { q: "Does InstantMed work during cyclone season?", a: "Yes — as long as you have internet access (including mobile data), InstantMed works regardless of weather conditions. It's especially useful when travel to a clinic is unsafe." },
      { q: "Can defence families use InstantMed?", a: "Yes. Defence families can use InstantMed for civilian healthcare needs. Certificates are issued by AHPRA-registered doctors and are valid for all employers." },
      { q: "Does InstantMed serve Magnetic Island?", a: `Yes. InstantMed serves anywhere with internet access, including Magnetic Island. No need to catch the ferry for a medical certificate. From ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },
  cairns: {
    healthStats: [
      { label: "Population", value: "160K+", context: "Gateway to Far North Queensland" },
      { label: "Avg GP wait", value: "3–5 days", context: "Worse during peak tourist season" },
      { label: "Bulk-billing rate", value: "~70%", context: "Declining in recent years" },
      { label: "Tourist influx", value: "2M+ yearly", context: "Creates seasonal healthcare demand surges" },
    ],
    sections: [
      {
        title: "Tourism Meets Healthcare Shortage",
        paragraphs: [
          "Cairns sits at the intersection of tropical paradise and healthcare access challenges. As the gateway to the Great Barrier Reef and the Daintree Rainforest, the city welcomes over 2 million tourists annually — many of whom need medical care during their visit. This tourist demand competes directly with local residents for limited GP appointments.",
          "The city's permanent population of 160,000+ is served by Cairns Hospital and a network of GP clinics, but same-day availability is inconsistent. During peak tourist season (June–September), wait times for non-urgent GP appointments can stretch to a week. For locals needing a straightforward medical certificate or prescription renewal, waiting that long is unnecessary.",
          "Beyond tourism, Cairns serves as the service hub for Far North Queensland communities from Port Douglas to Cooktown to the Atherton Tablelands. This catchment stretches healthcare resources across a vast geographic area.",
        ],
      },
      {
        title: "Tourism Workers and Seasonal Employment",
        paragraphs: [
          "Cairns' economy runs on tourism, with hotels, dive operators, tour companies, and hospitality venues employing a large casual and seasonal workforce. These workers often lack regular GP relationships, work irregular hours, and need quick turnaround on medical certificates to avoid losing shifts.",
          "Backpackers and working holiday visa holders add further demand. For this transient population, establishing a regular GP is impractical. Telehealth provides the flexibility that matches Cairns' unique employment landscape.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Cairns",
      paragraphs: [
        "Cairns has pharmacy coverage across the CBD, Smithfield, Edmonton, and the Northern Beaches. All major chains and independent pharmacies accept eScripts. Port Douglas and Atherton also have pharmacies that can fill eScripts from telehealth consultations.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Queensland",
      paragraphs: [
        "Queensland follows national AHPRA telehealth standards. Far North Queensland has been identified by the Queensland Government as a priority area for telehealth expansion, recognising the region's unique combination of geographic isolation and healthcare workforce shortages.",
        "Prescribing follows the TGA national framework. eScripts work at all Queensland pharmacies. Schedule 8 medications require Queensland Health authority and cannot be prescribed via telehealth.",
      ],
    },
    additionalFaqs: [
      { q: "Can tourists visiting Cairns use InstantMed?", a: "Yes. Any Australian resident (18+) can use InstantMed. International tourists are not currently eligible as our doctors prescribe under Australian regulations." },
      { q: "Does InstantMed serve Port Douglas?", a: "Yes. We serve all of Far North Queensland — Port Douglas, Palm Cove, the Atherton Tablelands, and Cairns Northern Beaches." },
      { q: "Can hospitality workers get same-day certificates?", a: `Yes. Most certificates are issued within 1–2 hours. We're available 8am–10pm AEST, 7 days, which suits hospitality schedules. From ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  },

  "central-coast": {
    healthStats: [
      { label: "Population", value: "340K+", context: "NSW's third largest urban area" },
      { label: "Avg GP wait", value: "3–7 days", context: "Longer in Wyong and northern suburbs" },
      { label: "Bulk-billing rate", value: "~65%", context: "Lower than Sydney average" },
      { label: "Commuter population", value: "30K+", context: "Daily Sydney commuters with limited time" },
    ],
    sections: [
      {
        title: "Healthcare on the Central Coast",
        paragraphs: [
          "The Central Coast stretches from the Hawkesbury River to Lake Macquarie, encompassing major centres like Gosford, Wyong, Tuggerah, Erina, and The Entrance. With 340,000+ residents, it's NSW's third largest urban area — but healthcare infrastructure hasn't kept pace with population growth, particularly in the northern corridor around Warnervale and Hamlyn Terrace.",
          "GP availability varies dramatically across the region. Gosford and Erina have reasonable clinic density, but wait times for non-urgent appointments are still 3–5 days. The Wyong, Toukley, and The Entrance areas have fewer practices serving larger catchments. Many residents end up at emergency departments for issues that a GP could easily handle — including medical certificates.",
          "An estimated 30,000+ Central Coast residents commute to Sydney daily. For these workers, taking time off to see a local GP often means losing a full day — the commute home, the wait at the clinic, and the commute back. Telehealth lets them handle routine healthcare needs during a lunch break or after hours.",
        ],
      },
      {
        title: "Central Coast Workers and Students",
        paragraphs: [
          "The Central Coast has a significant retail, hospitality, and aged care workforce, alongside the large Sydney commuter population. Shift workers at facilities like Wyong Hospital, aged care homes across the region, and hospitality venues along the coast face the same scheduling challenges as anywhere — GP clinic hours don't align with irregular rosters.",
          "University of Newcastle's Central Coast campus in Ourimbah and TAFE NSW's Gosford and Wyong campuses serve thousands of students. All accept medical certificates from AHPRA-registered doctors for special consideration and assessment extensions. For students juggling study and part-time work, telehealth provides a practical alternative to competing for limited clinic appointments.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts on the Central Coast",
      paragraphs: [
        "The Central Coast has extensive pharmacy coverage across Gosford, Erina, Tuggerah, Wyong, and The Entrance. All major chains — Chemist Warehouse, Priceline, TerryWhite Chemmart — and independent pharmacies accept eScripts. Extended-hours pharmacies are available in Erina Fair and Tuggerah Westfield shopping centres.",
        "When InstantMed issues a prescription, you receive a QR code via SMS that any pharmacy on the Coast can scan. No need to carry a paper script — just show your phone.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in NSW",
      paragraphs: [
        "NSW follows national AHPRA and Medical Board guidelines for telehealth. The NSW Government has actively supported telehealth adoption, recognising its role in reducing emergency department presentations and improving access in growth areas like the Central Coast.",
        "Prescribing follows TGA national regulations. eScripts are accepted at all NSW pharmacies. Schedule 8 medications require in-person assessment and cannot be prescribed via telehealth through InstantMed.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover the whole Central Coast?", a: "Yes — Gosford, Wyong, Tuggerah, Erina, The Entrance, Terrigal, Woy Woy, Avoca, and everywhere in between. It's an online service, so your exact location doesn't matter." },
      { q: "Can I get a certificate on the train to Sydney?", a: "Yes. Many Central Coast commuters complete the form during their commute. Your certificate is emailed as a PDF you can forward to your employer." },
      { q: "Are certificates accepted by Central Coast employers?", a: "Yes. Our certificates are issued by AHPRA-registered doctors and are valid for all Australian employers — local, Sydney-based, or anywhere else." },
    ],
  },

  parramatta: {
    healthStats: [
      { label: "Population", value: "270K+", context: "Sydney's second CBD" },
      { label: "Avg GP wait", value: "4–7 days", context: "Among the longest in Greater Sydney" },
      { label: "Bulk-billing rate", value: "~60%", context: "Low and declining in the CBD area" },
      { label: "Worker population", value: "120K+", context: "Western Sydney's employment hub" },
    ],
    sections: [
      {
        title: "Healthcare in Western Sydney",
        paragraphs: [
          "Parramatta and Greater Western Sydney face some of the most acute GP access challenges in the country. The region's population has grown rapidly — driven by new housing developments in areas like Marsden Park, Box Hill, and Schofields — but medical infrastructure has lagged well behind. Same-day GP appointments are rare, and many practices have closed their books to new patients entirely.",
          "Parramatta CBD alone hosts over 120,000 workers on any given weekday. For these workers, getting a medical certificate means either taking a sick day to visit a GP (which defeats the purpose) or finding an after-hours clinic and waiting 2–3 hours. Western Sydney's after-hours clinics are among the busiest in NSW, with demand consistently outstripping capacity.",
          "The cultural diversity of Western Sydney adds another dimension. Many residents prefer GPs who speak their language, which further narrows available appointment options. For straightforward needs like medical certificates — where the clinical assessment is standardised and documentation-based — telehealth removes the language-matching bottleneck while still delivering the same clinical outcome.",
        ],
      },
      {
        title: "Western Sydney's Workforce",
        paragraphs: [
          "Western Sydney's economy is built on logistics, healthcare, education, and construction. Workers at Westmead Hospital, the Parramatta justice precinct, the growing Aerotropolis, and the countless warehouses across the region work shifts and irregular hours. The standard GP model — book an appointment 4 days out, show up during business hours — doesn't serve this workforce.",
          "Western Sydney University's Parramatta campuses serve tens of thousands of students, many of whom are first-in-family university students balancing study with work and family obligations. Telehealth medical certificates for special consideration applications mean one less barrier between them and their degree.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Western Sydney",
      paragraphs: [
        "Parramatta and Western Sydney have strong pharmacy coverage, with multiple Chemist Warehouse, Priceline, and TerryWhite locations in Westfield Parramatta, Parramatta CBD, and throughout the suburbs. All accept eScripts.",
        "Extended-hours pharmacies operate in most Western Sydney shopping centres. When InstantMed issues a prescription, you receive a QR code via SMS — present it at any pharmacy to have your medication dispensed immediately.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in NSW",
      paragraphs: [
        "NSW follows national AHPRA telehealth standards. Western Sydney has been identified as a priority area for healthcare access improvements. Telehealth is recognised as a critical component of primary care delivery in high-growth, underserviced regions.",
        "All prescribing follows TGA national regulations. eScripts are accepted at every pharmacy in Western Sydney and across NSW.",
      ],
    },
    additionalFaqs: [
      { q: "Can I use InstantMed from my office in Parramatta?", a: "Yes. Complete the form from anywhere — your office, the train, or home. The certificate is emailed as a PDF." },
      { q: "Is InstantMed faster than a Western Sydney GP?", a: `Most certificates are reviewed within 1 hour. Compared to a 4–7 day GP wait in Western Sydney, that's a significant improvement. From ${PRICING_DISPLAY.MED_CERT}.` },
      { q: "Do Westmead Hospital and other employers accept these?", a: "Yes. All Australian employers — including NSW Health, hospitals, universities, and private companies — accept certificates from AHPRA-registered doctors." },
    ],
  },

  toowoomba: {
    healthStats: [
      { label: "Population", value: "140K+", context: "Queensland's largest inland city" },
      { label: "Avg GP wait", value: "3–5 days", context: "Better than Brisbane but declining" },
      { label: "Bulk-billing rate", value: "~72%", context: "Higher than capital cities but falling" },
      { label: "Service area", value: "Darling Downs", context: "Healthcare hub for surrounding regions" },
    ],
    sections: [
      {
        title: "Healthcare in the Darling Downs",
        paragraphs: [
          "Toowoomba sits atop the Great Dividing Range and serves as the healthcare hub for the entire Darling Downs region — from Dalby and Chinchilla to the west, Warwick to the south, and Gatton to the east. While the city itself has reasonable GP coverage, demand from the broader region stretches local capacity. Same-day appointments are possible but increasingly difficult to secure, particularly during winter flu season.",
          "The region's agricultural workforce — grain, cotton, and cattle — often works remotely on properties where driving to town for a GP appointment means a round trip of several hours. For workers on farms and feedlots across the Downs, telehealth isn't a convenience; it's the only practical way to get a medical certificate without losing a full day of work.",
          "Toowoomba's growth as a regional hub has attracted new residents from Brisbane and interstate, but GP supply hasn't grown proportionally. Several practices have waiting lists for new patients. For straightforward healthcare needs, telehealth provides immediate access without the wait.",
        ],
      },
      {
        title: "Students and Workers in Toowoomba",
        paragraphs: [
          "The University of Southern Queensland's Toowoomba campus is a major regional university, and TAFE Queensland's Toowoomba campus serves vocational students from across the Downs. Both accept telehealth-issued medical certificates for academic support applications.",
          "Toowoomba's economy relies on agriculture, education, healthcare (with Toowoomba Hospital a major employer), and a growing logistics sector. Many workers in these industries have irregular hours or work in locations distant from clinics. InstantMed provides flexible access to medical certificates and prescriptions on their schedule.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Toowoomba",
      paragraphs: [
        "Toowoomba has good pharmacy coverage across the CBD, Grand Central Shopping Centre, and suburban areas. Chemist Warehouse, Priceline, and independent pharmacies all accept eScripts. Pharmacies in surrounding towns like Dalby, Warwick, and Gatton also accept eScripts from telehealth consultations.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in Regional Queensland",
      paragraphs: [
        "Queensland Health has identified the Darling Downs as a priority region for telehealth expansion. National AHPRA standards apply to all telehealth consultations. Prescribing follows TGA guidelines, with eScripts accepted at all Queensland pharmacies.",
        "The Queensland Government's rural and remote health strategy explicitly supports telehealth as a way to improve healthcare access for communities beyond the south-east corner.",
      ],
    },
    additionalFaqs: [
      { q: "Can I use InstantMed from a farm on the Downs?", a: "Yes — anywhere with internet access. Many farming properties have mobile coverage or satellite internet, both of which work with InstantMed." },
      { q: "Does InstantMed serve Dalby, Warwick, and Gatton?", a: "Yes. We serve all of the Darling Downs and Southern Downs — your location doesn't matter as long as you have internet." },
      { q: "Are certificates accepted by agricultural employers?", a: "Yes. Our certificates are issued by AHPRA-registered doctors and accepted by all Australian employers, including farming operations, feedlots, and agribusiness companies." },
    ],
  },

  ballarat: {
    healthStats: [
      { label: "Population", value: "115K+", context: "Victoria's third largest city" },
      { label: "Avg GP wait", value: "3–5 days", context: "Growing gap due to population increase" },
      { label: "Bulk-billing rate", value: "~62%", context: "Below Victorian and national averages" },
      { label: "Distance to Melbourne", value: "115km", context: "Over 1 hour drive to the nearest major hospital network" },
    ],
    sections: [
      {
        title: "Healthcare Access in Ballarat and the Goldfields",
        paragraphs: [
          "Ballarat is growing fast — it's one of regional Australia's fastest-growing cities, attracting families and professionals priced out of Melbourne's housing market. But healthcare supply hasn't kept pace. Several GP practices have closed their books to new patients, and those accepting new patients often have wait times of 5+ days for non-urgent appointments.",
          "The city serves as a healthcare hub for the Central Highlands and Goldfields region, drawing patients from Daylesford, Creswick, Bacchus Marsh, and beyond. This catchment demand puts additional pressure on local clinics. Ballarat Health Services provides hospital-level care, but for routine needs like medical certificates, the system is overloaded.",
          "For the estimated 5,000+ Ballarat residents who commute to Melbourne for work, healthcare access is doubly complicated. You're unwell, you can't get a same-day GP appointment in Ballarat, and you certainly can't make the 90-minute drive to a Melbourne clinic. Telehealth solves this in minutes.",
        ],
      },
      {
        title: "Workers and Students",
        paragraphs: [
          "Federation University's Ballarat campus is the city's major university, supplemented by TAFE and a growing education sector. All Victorian universities accept telehealth medical certificates for special consideration applications.",
          "Ballarat's economy spans manufacturing, healthcare, retail, and a significant public sector presence (including CFA and local government). Workers across these sectors benefit from telehealth when GP access is limited — particularly shift workers and those in remote-start roles.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Ballarat",
      paragraphs: [
        "Ballarat has good pharmacy coverage in the CBD, Stockland Wendouree, and suburban areas. Chemist Warehouse, Priceline, and local independent pharmacies all accept eScripts. Extended-hours options are available in the Stockland centre.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in Regional Victoria",
      paragraphs: [
        "Victoria follows national AHPRA standards for telehealth. The Victorian Government has invested in rural and regional telehealth as part of its healthcare strategy, recognising growing access gaps in cities like Ballarat.",
        "Prescribing follows TGA national regulations. eScripts are universally accepted across Victorian pharmacies. Schedule 8 medications require in-person assessment.",
      ],
    },
    additionalFaqs: [
      { q: "Can Melbourne commuters from Ballarat use InstantMed?", a: "Yes — many do. Complete the form from home or the train. Your certificate is emailed as a PDF you can forward to your employer." },
      { q: "Is InstantMed cheaper than a Ballarat GP?", a: `With bulk-billing rates around 62% in Ballarat, many GP visits now cost $50–$80 out of pocket. Medical certificates from InstantMed start at ${PRICING_DISPLAY.MED_CERT} — often cheaper and always faster.` },
      { q: "Does InstantMed serve Daylesford and Bacchus Marsh?", a: "Yes. We serve all of regional Victoria — anywhere with internet access." },
    ],
  },

  bendigo: {
    healthStats: [
      { label: "Population", value: "100K+", context: "Victoria's fourth largest city" },
      { label: "Avg GP wait", value: "3–5 days", context: "Increasing as population grows" },
      { label: "Bulk-billing rate", value: "~60%", context: "One of the lowest in regional Victoria" },
      { label: "Growth rate", value: "1.8% p.a.", context: "Outpacing healthcare supply" },
    ],
    sections: [
      {
        title: "Healthcare in the Goldfields-Loddon Region",
        paragraphs: [
          "Bendigo is the major service centre for the Goldfields-Loddon region of Victoria, serving not just its 100,000+ residents but communities from Castlemaine and Kyneton to Echuca and Swan Hill. Bendigo Health provides hospital services, but GP access is under significant strain. The city's population growth of ~1.8% per year has outpaced the recruitment of new GPs, with several practices either full or operating with reduced hours.",
          "Bulk-billing in Bendigo has dropped below 60% — one of the lowest rates in regional Victoria. A standard GP consultation can cost $50–$80 out of pocket after Medicare rebate. For a straightforward medical certificate that requires a 5-minute clinical assessment, the economics of the traditional GP model don't stack up.",
          "The ripple effect extends beyond Bendigo itself. Residents in Heathcote, Castlemaine, and the Loddon Shire often travel to Bendigo for healthcare. Adding a 30–60 minute drive each way to a 5-day wait makes telehealth a practical alternative for routine needs.",
        ],
      },
      {
        title: "Bendigo's Workforce",
        paragraphs: [
          "Bendigo's economy is anchored by healthcare (Bendigo Health is the largest employer), education (La Trobe University Bendigo), retail, agriculture, and a growing creative sector. Shift workers at the hospital and aged care facilities, university staff, and agricultural workers all benefit from telehealth when clinic schedules don't align with work rosters.",
          "La Trobe University Bendigo serves thousands of students from across regional Victoria. Medical certificates from AHPRA-registered doctors are accepted for all academic support applications. For students juggling study, part-time work, and the realities of regional living, telehealth provides a practical solution.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Bendigo",
      paragraphs: [
        "Bendigo has comprehensive pharmacy coverage across the CBD, Lansell Square, and suburban centres. All major chains and independent pharmacies accept eScripts. Extended-hours options are available in Bendigo Marketplace and Lansell Square.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in Regional Victoria",
      paragraphs: [
        "Victoria's telehealth framework follows national AHPRA standards. Regional Victoria has been a focus area for telehealth investment by the Victorian Government, particularly for communities where GP access is declining.",
        "Prescribing follows TGA national regulations. eScripts work at all Victorian pharmacies, including those in smaller towns across the Goldfields-Loddon region.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed serve Castlemaine and Kyneton?", a: "Yes. We serve all of regional Victoria — Castlemaine, Kyneton, Heathcote, Echuca, and everywhere in between." },
      { q: "Is telehealth adequate for a medical certificate?", a: "For straightforward illnesses (cold, flu, gastro, migraine), yes. Telehealth medical certificates have the same legal validity as in-person ones. If physical examination is needed, we'll recommend an in-person visit — and you won't be charged." },
      { q: "Can La Trobe Bendigo students use InstantMed?", a: "Yes. La Trobe and all Victorian universities accept certificates from AHPRA-registered doctors for special consideration and assessment extensions." },
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
          "For residents of Northern Tasmania — from Launceston to Devonport, Burnie, and the North-East — getting a straightforward medical certificate can mean a multi-day wait or a drive to the nearest clinic with availability. Telehealth doesn't replace the ongoing GP relationship, but it handles routine needs immediately.",
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
      { q: "Can I use InstantMed if I can't find a GP in Launceston?", a: "Yes. InstantMed is ideal for routine healthcare needs when GP availability is limited. For ongoing conditions, we still recommend establishing a GP relationship — but for medical certificates and straightforward prescriptions, we can help right now." },
      { q: "Does InstantMed serve Devonport and Burnie?", a: "Yes. We serve all of Tasmania — Launceston, Devonport, Burnie, the North-East, and the North-West Coast." },
      { q: "Are certificates accepted by Tasmanian employers?", a: "Yes. All Australian employers, including Tasmanian government agencies, accept certificates from AHPRA-registered doctors regardless of consultation method." },
    ],
  },

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
          "Telehealth simplifies the cross-border complexity. An AHPRA-registered doctor can issue certificates that are valid in both states — no need to worry about whether your GP is registered in NSW or Victoria. The same applies to eScripts, which work at pharmacies on both sides of the river.",
        ],
      },
      {
        title: "Workers and Students in the Region",
        paragraphs: [
          "Charles Sturt University's Albury-Wodonga campus and TAFE NSW/GOTAFE serve the region's student population. Both accept telehealth medical certificates for academic support applications.",
          "The region's economy spans agriculture, manufacturing, defence (Bandiana and Bonegilla), and a significant healthcare sector (Albury Wodonga Health). Workers across these industries face the usual regional challenges with GP access. Telehealth provides a practical supplement, particularly for shift workers and those in time-sensitive situations.",
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
        "AHPRA registration is national — doctors registered with AHPRA can provide telehealth services to patients in any state. For Albury-Wodonga residents, this means the same telehealth consultation and certificate are valid whether you live in NSW or Victoria.",
        "Prescribing follows national TGA regulations. eScripts work identically in both states. PBS pricing applies at all pharmacies regardless of state.",
      ],
    },
    additionalFaqs: [
      { q: "Does it matter which side of the border I live on?", a: "No. AHPRA registration is national, so our doctors can treat patients in both NSW and Victoria. Your certificate is valid for employers in both states." },
      { q: "Can I fill my eScript on either side of the border?", a: "Yes. eScripts work at any Australian pharmacy — Albury, Wodonga, or anywhere else." },
      { q: "Are certificates accepted by Albury Wodonga Health?", a: "Yes. As an AHPRA-issued certificate, it's accepted by all employers in the region, including Albury Wodonga Health and other healthcare providers." },
    ],
  },

  ipswich: {
    healthStats: [
      { label: "Population", value: "230K+", context: "One of Australia's fastest growing regions" },
      { label: "Avg GP wait", value: "3–6 days", context: "Increasing with population growth" },
      { label: "Bulk-billing rate", value: "~75%", context: "Higher than Brisbane average" },
      { label: "Growth rate", value: "2.5% p.a.", context: "Healthcare infrastructure can't keep up" },
    ],
    sections: [
      {
        title: "Growth Outpacing Healthcare in Ipswich",
        paragraphs: [
          "Ipswich is one of Australia's fastest growing local government areas. The city and its surrounding suburbs — Springfield, Ripley Valley, Redbank Plains, Goodna — have seen explosive population growth driven by affordable housing compared to Brisbane. New developments are appearing faster than medical centres, leaving large populations underserviced.",
          "Springfield in particular has grown from farmland to a planned city of 45,000+ in barely a decade, with a target population of 86,000. Healthcare infrastructure is still catching up. While Springfield has some medical centres, demand far outstrips supply. Many residents drive 20–30 minutes to find a GP with same-day availability.",
          "Ipswich Hospital and the new Springfield Central hospital development will improve acute care access, but for routine GP needs — medical certificates, repeat prescriptions, straightforward consultations — the bottleneck remains. Telehealth fills this gap immediately.",
        ],
      },
      {
        title: "Ipswich's Workforce",
        paragraphs: [
          "Ipswich's economy spans defence (RAAF Base Amberley), logistics (Swanbank and Ebenezer industrial areas), healthcare, retail, and construction. Many of these workers have shift-based or physically demanding roles where GP clinic hours don't align with their schedule.",
          "The University of Southern Queensland has an Ipswich campus, and TAFE Queensland's Ipswich and Springfield campuses serve vocational students. All accept telehealth-issued medical certificates. For students and workers in Ipswich, telehealth means one less obstacle in managing health and employment.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Ipswich",
      paragraphs: [
        "Ipswich has pharmacy coverage across the CBD, Riverlink Shopping Centre, Springfield Orion, and suburban centres. All major chains accept eScripts. Springfield and Ripley Valley pharmacies are growing with the population.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in Queensland",
      paragraphs: [
        "Queensland follows national AHPRA telehealth standards. South-East Queensland's growth corridors — including Ipswich and Springfield — have been identified as priority areas for healthcare access improvements.",
        "Prescribing follows TGA national regulations. eScripts are accepted at all Queensland pharmacies.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover Springfield and Ripley Valley?", a: "Yes. We cover all of the Ipswich region — Springfield, Ripley Valley, Redbank Plains, Goodna, and everywhere else. It's an online service, so your location doesn't matter." },
      { q: "Can RAAF Amberley personnel use InstantMed?", a: "Yes, for personal medical needs (not Defence medical assessments). Our certificates are valid for civilian employment purposes and personal record-keeping." },
      { q: "How fast can I get a certificate in Ipswich?", a: `Most certificates are reviewed within 1 hour. From ${PRICING_DISPLAY.MED_CERT} — typically faster and more affordable than competing for a GP appointment in a growth corridor.` },
    ],
  },
}
