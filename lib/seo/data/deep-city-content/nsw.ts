/**
 * Deep city content -- New South Wales
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import type { DeepCityContent } from "../deep-city-content"

const MED_CERT_DOCUMENT_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")
const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")
const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")
const PRESCRIPTION_IF_APPROVED = getApprovedClaim("prescription_if_approved")
const AVAILABILITY = getApprovedClaim("availability_24_7")

export const NSW_CITIES: Record<string, DeepCityContent> = {
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
          "Greater Sydney's healthcare landscape varies dramatically by suburb. In the Eastern Suburbs and Lower North Shore, GP clinics are plentiful but few offer bulk-billing - gap fees of $40–$90 are common. In Western Sydney, bulk-billing is more available but demand is so high that same-day appointments are often impossible. The result: whether you're in Bondi or Blacktown, getting a straightforward medical certificate or repeat prescription often means taking a half-day off work.",
          "The problem is particularly acute for Sydney's large shift-working population. Hospitality workers in the CBD, nurses at Westmead or RPA, warehouse staff in Wetherill Park - their schedules rarely align with standard clinic hours. After-hours medical centres exist, but wait times of 2–3 hours are normal, and most charge premium fees. Telehealth removes the scheduling barrier entirely.",
          "Sydney's public transport, while improving, can add 45–60 minutes each way to a doctor visit if you're travelling between suburbs. When you're unwell enough to need a medical certificate, the last thing you want is a train-bus-walk journey across the city. InstantMed lets you complete the process from wherever you are - your couch in Marrickville, your share house in Randwick, or your unit in Parramatta.",
        ],
      },
      {
        title: "When Telehealth Makes Sense in Sydney",
        paragraphs: [
          `Telehealth isn't a replacement for your regular GP. Whether an online request is suitable depends on the symptoms, history, and whether an examination or other in-person care is needed. ${CLINICAL_REVIEW_SEQUENCE}`,
          "Repeat-prescription review may fit when the medicine, dose, and clinical history are stable. Every prescribing request requires an AHPRA-registered doctor outcome, and the doctor may ask questions, call, decline, or recommend in-person care.",
          `That said, some things genuinely need an in-person visit: workplace injuries requiring WorkCover certificates, conditions that need physical examination (suspicious skin lesions, joint injuries, chest pain), and anything requiring blood tests or imaging. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "Understanding Medical Certificates in NSW",
        paragraphs: [
          "Under the Fair Work Act 2009, Australian employees are entitled to personal/carer's leave (10 days per year for full-time workers). Employers can request evidence for absences, and the Act uses an evidence standard rather than a consultation-format rule. A certificate from an AHPRA-registered doctor via telehealth can support routine absence review.",
          `NSW employers, including state government agencies, assess medical documentation under their own policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          `Sydney universities, including USYD, UNSW, UTS, Macquarie, and WSU, set their own requirements for academic support, coursework documentation, and missed assessments. Check the current policy before submitting a request. ${MED_CERT_DOCUMENT_SCOPE}`,
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Sydney",
      paragraphs: [
        `Sydney has over 1,200 community pharmacies across the metropolitan area, and virtually all now accept eScripts. ${PRESCRIPTION_IF_APPROVED} Chemist Warehouse, Priceline, TerryWhite, and independent pharmacies can scan the QR code.`,
        "Many Sydney pharmacies also offer extended hours. Chemist Warehouse locations in the CBD, Parramatta, and major shopping centres often stay open until 9pm or later. Several 24-hour pharmacies operate across the city, including in the CBD and near major hospitals. Dispensing timing depends on pharmacy hours, stock, and the approved prescription.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulations in NSW",
      paragraphs: [
        "Telehealth in Australia is regulated at the federal level through AHPRA (the Australian Health Practitioner Regulation Agency) and the Medical Board of Australia. All doctors providing telehealth services must hold current AHPRA registration - the same registration required for in-person practice. There is no separate \"telehealth licence\" in Australia; any registered doctor can provide telehealth consultations.",
        "The Therapeutic Goods Administration (TGA) governs prescribing via telehealth. InstantMed limits prescribing to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review, and an eScript is sent only if approved.",
        "NSW Health has actively supported telehealth expansion since 2020, recognising its role in reducing pressure on emergency departments and GP clinics. The NSW Government's healthcare strategy explicitly includes telehealth as a component of the primary care system, particularly for regional and metropolitan areas with GP shortages.",
      ],
    },
    additionalFaqs: [
      { q: "Do I need a Medicare card to use InstantMed in Sydney?", a: `Medical certificates do not require Medicare. ${getApprovedClaim("prescribing_identity_required")} PBS eligibility and final pharmacy pricing are confirmed separately at the pharmacy if a prescription is approved.` },
      { q: "Can I submit a medical-certificate request for a mental health day?", a: `Adults aged 18+ can submit a request for a mental-health-related absence. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "How should I check NSW workplace documentation requirements?", a: `NSW employers set their own policies for medical certificates and leave evidence. Check the current policy for your request. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "What suburbs does InstantMed cover in Sydney?", a: "InstantMed is available everywhere in Greater Sydney and NSW - from the Northern Beaches to Campbelltown, Penrith to the Eastern Suburbs. It's an online service, so your location doesn't matter as long as you have internet access." },
      { q: "Can I use InstantMed if I'm visiting Sydney?", a: "Adults aged 18+ visiting Sydney for work or travel can submit a medical-certificate request online without an established local GP." },
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
          "Greater Newcastle and the Hunter Valley comprise one of Australia's largest regional populations - over 750,000 people spread from the coast at Merewether to the vineyards of Cessnock and the farming communities of Muswellbrook. Healthcare access varies dramatically across this area. Inner Newcastle (Hamilton, Merewether, Cooks Hill) has reasonable GP availability, but wait times stretch to a week or more in suburbs like Cessnock, Raymond Terrace, and Maitland.",
          "The Hunter's economy relies heavily on mining, energy, defence, and healthcare - industries with high rates of shift work. BHP, Yancoal, Glencore, and dozens of smaller mining operations run 24/7 rosters. Workers who fall ill on a night shift can't see a GP until the clinic opens the next morning - by which time they've missed their next shift and need documentation for their employer.",
          "Newcastle's university population adds another dimension. The University of Newcastle (UoN) has over 35,000 students across Callaghan and city campuses. TAFE Hunter campuses serve thousands more. During exam periods, same-day GP appointments near campus are scarce, and students need certificates quickly for academic documentation deadlines.",
        ],
      },
      {
        title: "Telehealth for the Hunter Workforce",
        paragraphs: [
          "Mining companies in the Hunter are among the most rigorous about medical certificates - many require documentation for any unplanned absence. For a miner in Singleton or Muswellbrook, the nearest bulk-billing GP might be 30–40 minutes away with a multi-day wait. Telehealth eliminates both the travel and the wait.",
          "Defence personnel at RAAF Base Williamtown and the surrounding area face similar challenges. While Defence has its own medical services, dependants and civilian contractors often need certificates from external providers. Telehealth provides a convenient alternative when the base medical centre isn't available.",
          "Healthcare workers at John Hunter Hospital, Calvary Mater, and the region's smaller hospitals frequently need certificates but can't take time off during their shifts to see their own GP. Ironically, the people who provide healthcare often have the hardest time accessing it for themselves. Telehealth fits around their schedule.",
        ],
      },
      {
        title: "Medical Certificates in NSW",
        paragraphs: [
          "Newcastle employers - from BHP to the University of Newcastle, from Hunter New England Health to local cafes in Darby Street - all fall under the Fair Work Act 2009. Certificates from AHPRA-registered doctors can support routine absence evidence, and employer policies still apply. The mining sector often has stricter internal processes for clearances and site medicals.",
          "NSW education institutions publish processes for medical documentation. UoN and Hunter TAFE set their own academic-support requirements, so students should check the current policy for their request.",
          `For workers in the Hunter coal industry, enterprise agreements may set leave-evidence requirements for absences. Check the applicable agreement and employer process. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Newcastle",
      paragraphs: [
        `Newcastle and the Hunter have approximately 200 community pharmacies, with good coverage in major centres including Charlestown, Kotara, Green Hills (Maitland), and Cessnock. All major pharmacy chains and most independents accept eScripts. ${PRESCRIPTION_IF_APPROVED} Dispensing depends on pharmacy hours, stock, and pharmacy checks.`,
        "Extended-hours pharmacies operate at Charlestown Square, Marketown, and several standalone locations. For residents in smaller Hunter towns like Kurri Kurri, Cessnock, or Raymond Terrace, the local pharmacy will accept your eScript just like a traditional paper script - no special arrangements needed.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "New South Wales follows the national AHPRA and Medical Board of Australia framework for telehealth. NSW Health has supported telehealth expansion, particularly for the Hunter-New England region where distance and workforce shortages make access challenging. The NSW Government includes telehealth as a core component of its primary care strategy.",
        "Prescribing through InstantMed follows TGA guidelines and is limited to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review. If approved, the eScript can be dispensed at any NSW pharmacy.",
        "NSW Fair Trading and the NSW Health Care Complaints Commission (HCCC) oversee telehealth services operating in the state. InstantMed complies with all NSW and national regulatory requirements.",
      ],
    },
    additionalFaqs: [
      { q: "Do mining companies assess telehealth certificates under their own policies?", a: `Mining companies in the Hunter assess leave evidence under their own policies and enterprise agreements. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "How should UoN students check medical-documentation requirements?", a: "The University of Newcastle sets its own academic-support and medical-documentation requirements for Callaghan and city campus students. Check the current policy for your request." },
      { q: "Does InstantMed work in the Upper Hunter?", a: "Yes. Telehealth works anywhere with internet access - Muswellbrook, Singleton, Scone, Denman, or anywhere in the Upper Hunter. Same service, same pricing." },
      { q: "Is InstantMed available for RAAF Williamtown personnel?", a: "Adults aged 18+ in Defence households and civilian contractors can submit medical-certificate requests and eligible repeat-prescription reviews for a regular medicine they already take. Every prescribing request requires individual doctor review, and an eScript is sent only if approved." },
      { q: "Can I request a certificate for a mining roster?", a: `If a certificate is clinically appropriate, it records the approved absence dates. Mining employers set their own leave-evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
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
          "Wollongong and the Illawarra region sit between the Illawarra Escarpment and the Pacific Ocean - a beautiful setting that comes with some practical healthcare challenges. The region has grown significantly, particularly in suburbs like Shellharbour, Dapto, and Horsley, where new housing developments have outpaced medical infrastructure. GP availability in these growth areas is limited.",
          "The Illawarra's workforce includes a significant portion of commuters who travel to Sydney daily by train (a 90-minute journey each way). These commuters often can't visit their local Wollongong GP during business hours because they're in Sydney, and can't easily access a Sydney GP without being an established patient. Telehealth bridges this gap - get a certificate from home in Wollongong, sent to your Sydney employer.",
          "BlueScope Steel and the Port Kembla industrial precinct employ thousands of shift workers who need medical documentation for unplanned absences. South Coast correctional facilities, mining operations in the Illawarra coalfield, and Wollongong Hospital's own workforce all contribute to strong demand for after-hours certificate access.",
        ],
      },
      {
        title: "University and Student Healthcare",
        paragraphs: [
          "The University of Wollongong (UOW) has over 30,000 students, including a large international student cohort. UOW's campus medical service handles high volumes, particularly during assessment periods. Wait times for on-campus GP appointments can stretch to several days during exam season - exactly when students most need certificates for academic support.",
          "TAFE Illawarra campuses serve additional students who need medical documentation for course requirements. For students living in share houses across Fairy Meadow, Gwynneville, and Keiraville, getting to a GP when you're unwell can mean a bus trip or asking a housemate for a ride. Telehealth removes the transport barrier.",
          "International students face particular challenges - they may be unfamiliar with the Australian healthcare system, lack an established GP relationship, and be uncertain about certificate requirements for their university. Telehealth can provide a straightforward path to routine absence evidence without navigating a system they may not understand.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Wollongong",
      paragraphs: [
        "The Illawarra region has approximately 80 community pharmacies, well-distributed across Wollongong, Shellharbour, Kiama, and surrounding suburbs. All major centres - Wollongong Central, Stockland Shellharbour, Dapto Mall - have pharmacies that accept eScripts. Crown Street in Wollongong's CBD has several pharmacy options within walking distance.",
        "Extended-hours pharmacy access is available at major shopping centres, with some locations open until 9pm. For residents in the smaller coastal and escarpment towns, local pharmacies accept eScripts just like traditional paper prescriptions.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in the Illawarra",
      paragraphs: [
        "Wollongong and the Illawarra fall under NSW state regulations and national AHPRA standards for telehealth. The Illawarra Shoalhaven Local Health District has embraced telehealth as part of its service delivery model, recognising its value in reducing pressure on local hospital emergency departments.",
        "Prescribing and certification requirements follow the same national practitioner framework as the rest of NSW. Medical certificates from AHPRA-registered telehealth doctors can support routine absence review. Illawarra employers assess them under workplace policy and Fair Work evidence rules.",
      ],
    },
    additionalFaqs: [
      { q: "Can UOW students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. The University of Wollongong sets its own documentation policy, so check its current requirements before submitting." },
      { q: "Does InstantMed work in Shellharbour and Kiama?", a: "Yes. Telehealth works anywhere in the Illawarra - Wollongong, Shellharbour, Kiama, Berry, Nowra, and everywhere in between." },
      { q: "How do BlueScope and industrial employers assess certificates?", a: `Each employer applies its own workplace evidence policy. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Can Sydney commuters from Wollongong use telehealth?", a: `Yes. Adults aged 18+ can submit a request from home or from their phone on the train. Certificates start from ${PRICING_DISPLAY.MED_CERT}. ${EMPLOYER_POLICY_CAVEAT}` },
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
          "The Central Coast stretches from the Hawkesbury River to Lake Macquarie, encompassing major centres like Gosford, Wyong, Tuggerah, Erina, and The Entrance. With 340,000+ residents, it's NSW's third largest urban area - but healthcare infrastructure hasn't kept pace with population growth, particularly in the northern corridor around Warnervale and Hamlyn Terrace.",
          "GP availability varies dramatically across the region. Gosford and Erina have reasonable clinic density, but wait times for non-urgent appointments are still 3–5 days. The Wyong, Toukley, and The Entrance areas have fewer practices serving larger catchments. Many residents end up at emergency departments for issues that a GP could easily handle - including medical certificates.",
          "An estimated 30,000+ Central Coast residents commute to Sydney daily. For these workers, taking time off to see a local GP often means losing a full day - the commute home, the wait at the clinic, and the commute back. InstantMed lets them submit medical-certificate requests and repeat-prescription review requests during a lunch break or after hours.",
        ],
      },
      {
        title: "Central Coast Workers and Students",
        paragraphs: [
          "The Central Coast has a significant retail, hospitality, and aged care workforce, alongside the large Sydney commuter population. Shift workers at facilities like Wyong Hospital, aged care homes across the region, and hospitality venues along the coast face the same scheduling challenges as anywhere - GP clinic hours don't align with irregular rosters.",
          "University of Newcastle's Central Coast campus in Ourimbah and TAFE NSW's Gosford and Wyong campuses serve thousands of students. Each sets its own policy for academic support, coursework documentation, and missed assessments. Adults aged 18+ should check current requirements before submitting a medical-certificate request.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts on the Central Coast",
      paragraphs: [
        "The Central Coast has extensive pharmacy coverage across Gosford, Erina, Tuggerah, Wyong, and The Entrance. All major chains - Chemist Warehouse, Priceline, TerryWhite Chemmart - and independent pharmacies accept eScripts. Extended-hours pharmacies are available in Erina Fair and Tuggerah Westfield shopping centres.",
        `${PRESCRIPTION_IF_APPROVED} Pharmacies on the Central Coast can scan the QR code, so no paper script is needed.`,
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
      { q: "Does InstantMed cover the whole Central Coast?", a: "Yes - Gosford, Wyong, Tuggerah, Erina, The Entrance, Terrigal, Woy Woy, Avoca, and everywhere in between. It's an online service, so your exact location doesn't matter." },
      { q: "Can I submit a certificate request on the train to Sydney?", a: "Yes. Adults aged 18+ can complete the form during their commute. If approved, the certificate is emailed as a PDF; the employer applies its own evidence policy." },
      { q: "How do Central Coast employers assess certificates?", a: `Each employer applies its own workplace evidence policy. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
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
          "Parramatta and Greater Western Sydney face some of the most acute GP access challenges in the country. The region's population has grown rapidly - driven by new housing developments in areas like Marsden Park, Box Hill, and Schofields - but medical infrastructure has lagged well behind. Same-day GP appointments are rare, and many practices have closed their books to new patients entirely.",
          "Parramatta CBD alone hosts over 120,000 workers on any given weekday. For these workers, getting a medical certificate means either taking a sick day to visit a GP (which defeats the purpose) or finding an after-hours clinic and waiting 2–3 hours. Western Sydney's after-hours clinics are among the busiest in NSW, with demand consistently outstripping capacity.",
          "The cultural diversity of Western Sydney adds another dimension. Many residents prefer GPs who speak their language, which further narrows available appointment options. InstantMed's listed medical-certificate and repeat-prescription review pathways begin with a structured online form, while needs outside those pathways still require appropriate local care.",
        ],
      },
      {
        title: "Western Sydney's Workforce",
        paragraphs: [
          "Western Sydney's economy is built on logistics, healthcare, education, and construction. Workers at Westmead Hospital, the Parramatta justice precinct, the growing Aerotropolis, and the countless warehouses across the region work shifts and irregular hours. The standard GP model - book an appointment 4 days out, show up during business hours - doesn't serve this workforce.",
          "Western Sydney University's Parramatta campuses serve tens of thousands of students, many of whom are first-in-family university students balancing study with work and family obligations. Telehealth medical certificates for academic support requests mean one less barrier between them and their degree.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Western Sydney",
      paragraphs: [
        "Parramatta and Western Sydney have strong pharmacy coverage, with multiple Chemist Warehouse, Priceline, and TerryWhite locations in Westfield Parramatta, Parramatta CBD, and throughout the suburbs. All accept eScripts.",
        `Extended-hours pharmacies operate in most Western Sydney shopping centres. ${PRESCRIPTION_IF_APPROVED} Present the QR code at a pharmacy; dispensing depends on stock and pharmacy checks.`,
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
      { q: "Can I use InstantMed from my office in Parramatta?", a: "Yes. Adults aged 18+ can complete the form from their office, the train, or home. If approved, a medical certificate is emailed as a PDF." },
      { q: "When can I submit a request in Western Sydney?", a: `${AVAILABILITY} Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
      { q: "How do Westmead Hospital and other employers assess certificates?", a: `NSW Health, hospitals, universities, and private companies apply their own evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
    ],
  },
  penrith: {
    healthStats: [
      { label: "Population", value: "220K+", context: "One of Western Sydney's largest cities" },
      { label: "Avg GP wait", value: "4–7 days", context: "Among the longest in Greater Sydney" },
      { label: "Bulk-billing rate", value: "~68%", context: "Below the NSW average in outer growth corridors" },
      { label: "After-hours access", value: "Stretched", context: "Few late-night bulk-billing options" },
    ],
    sections: [
      {
        title: "Healthcare Access in the Nepean and Blue Mountains Foothills",
        paragraphs: [
          "Penrith sits at the western edge of Greater Sydney, serving as the commercial and healthcare hub for the Nepean region and the foothills of the Blue Mountains. The Penrith LGA has grown dramatically over the past decade - from roughly 190,000 to more than 220,000 residents - while GP supply has barely moved. Large new housing developments in Jordan Springs, Caddens, and Werrington Downs have outpaced the arrival of new clinics, leaving residents in these suburbs driving 15–20 minutes to find same-day appointments.",
          "The area's geographic spread creates its own pressures. Residents in St Marys, Kingswood, Glenmore Park, and Cranebrook often travel across the LGA just to reach a GP with capacity. Bulk-billing remains available in pockets, but many practices now charge gap fees of $30–$60, reflecting the national trend away from full bulk-billing. For a listed medical-certificate or repeat-prescription review request, online submission can avoid that travel and waiting-room time.",
          "Nepean Hospital provides tertiary care for the region, but its emergency department regularly runs at capacity - partly because patients who cannot get timely GP access present at ED for issues that primary care should handle. The NSW Ministry of Health has publicly acknowledged Western Sydney as a Distribution Priority Area under the Modified Monash Model (MMM) framework, which is used nationally to identify workforce shortage regions. Telehealth is explicitly listed in NSW Health's strategy as a pressure valve for precisely this kind of imbalance.",
        ],
      },
      {
        title: "Penrith Commuters, Western Sydney Workers, and Students",
        paragraphs: [
          "A significant share of Penrith's working-age population commutes east on the T1 Western Line - to Parramatta, North Sydney, and the Sydney CBD - with door-to-door journey times of 60–90 minutes each way. For these commuters, losing a morning to a GP visit on top of a full workday is often simply not viable. Many of them complete their InstantMed intake on the train itself and skip the clinic entirely.",
          "Penrith also has a large blue-collar workforce across logistics (the M4/M7 corridor is a major warehousing hub), construction, manufacturing, and trades - industries with early starts, long shifts, and little flexibility to sit in a waiting room. The growing Western Sydney International Airport and the surrounding Aerotropolis will only add to this workforce in the coming years. Telehealth is one of the few healthcare models that actually flexes around shift work and early-morning starts.",
          "Western Sydney University's Kingswood and Penrith campuses, together with TAFE NSW Nirimba, serve tens of thousands of students, many of whom are first-in-family university students juggling study, part-time work, and family obligations. For academic support requests, missed assessment documentation, and coursework documentation, each campus sets its own policy for medical certificates. Students should check current requirements before submitting a request.",
        ],
      },
      {
        title: "Medical Certificates and NSW Employment Law",
        paragraphs: [
          "Penrith employers - from logistics giants on the M4 corridor to NSW Health, from construction firms to local cafes along High Street - all operate under the Fair Work Act 2009 or NSW-specific industrial instruments. The Act refers to evidence from registered health practitioners and does not set a video-call requirement. A telehealth certificate from an AHPRA-registered doctor can support routine sick-leave review.",
          `For casual retail and hospitality workers at Westfield Penrith, Nepean Village, or the Panthers precinct, online request submission can avoid a separate clinic trip. Each employer decides what evidence it requires, including for workers who do not accrue sick leave. ${EMPLOYER_POLICY_CAVEAT}`,
          `We never issue a certificate when the clinical situation is inappropriate for telehealth. If your symptoms suggest you need a physical examination - suspected chest infection, suspicious skin lesion, possible fracture - the doctor will refer you to in-person care. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "Telehealth is not a replacement for your regular GP relationship. Complex chronic disease management, screening, immunisations, dressings, injections, and conditions that require hands-on examination still need face-to-face care. InstantMed accepts medical-certificate requests, eligible repeat-prescription reviews for a regular medicine already taken, and its named specialty assessments.",
          "InstantMed complements rather than replaces a regular GP. It accepts medical-certificate requests, eligible repeat-prescription reviews for a regular medicine already taken, and its named specialty assessments. People without a regular GP still need local primary care for needs outside those listed services.",
          "InstantMed removes friction from its listed one-off services without creating a parallel system that competes with traditional general practice. Every prescribing request requires individual doctor review, and an eScript is sent only if approved.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Penrith",
      paragraphs: [
        `Penrith has strong pharmacy coverage through Westfield Penrith, Nepean Village, Lemongrove Shopping Village, and standalone outlets in St Marys, Kingswood, Glenmore Park, and Cranebrook. All major chains - Chemist Warehouse, Priceline, TerryWhite Chemmart, Amcal - accept eScripts, and virtually every independent pharmacy in the LGA has migrated off paper scripts. ${PRESCRIPTION_IF_APPROVED} Dispensing depends on pharmacy hours, stock, and pharmacy checks.`,
        "Extended-hours options exist at Westfield Penrith and several Chemist Warehouse locations, with some trading until 9pm. For PBS-listed medications, you pay the standard PBS co-payment regardless of whether the underlying prescription came from a telehealth consultation or a face-to-face GP visit - there is no pricing penalty for using telehealth at the pharmacy counter.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "Telehealth in Penrith is governed by the same national framework that applies everywhere else in Australia - AHPRA registration, Medical Board of Australia guidelines, and TGA prescribing rules. There is no separate 'telehealth licence'. Any doctor providing telehealth consultations must hold current AHPRA registration, the same credential required to practise face-to-face in a clinic.",
        "NSW Health has explicitly supported telehealth expansion as part of its Future Health strategy and has identified Western Sydney as a priority region for alternative primary care models. The Nepean Blue Mountains Local Health District has actively integrated telehealth into its care pathways to reduce unnecessary ED presentations and ease pressure on stretched primary care.",
        "InstantMed does not prescribe Schedule 8 controlled substances. Prescribing is limited to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review, and an eScript is sent only if approved.",
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover all of the Penrith LGA?", a: "Yes. Penrith, St Marys, Kingswood, Glenmore Park, Cranebrook, Jordan Springs, Werrington, Caddens, Orchard Hills - and everywhere else in the Nepean. Telehealth is an online service, so your exact suburb does not matter as long as you have internet access." },
      { q: "Can I use InstantMed on my commute into Parramatta or the CBD?", a: "Adults aged 18+ can submit a medical-certificate request on the T1 Western Line. If approved, the certificate is emailed as a PDF; timing varies and the employer applies its own evidence policy." },
      { q: "How do Nepean Hospital and Western Sydney University assess certificates?", a: `Nepean Hospital and Western Sydney University set their own evidence policies. ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Is InstantMed cheaper than seeing a Penrith GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}, with no gap fees or hidden charges. With many Penrith GPs now charging $30–$60 out of pocket after Medicare rebate, InstantMed is often the more affordable option for a straightforward medical-certificate request or eligible repeat-prescription review.` },
    ],
  },
  "coffs-harbour": {
    healthStats: [
      { label: "Population", value: "75K+", context: "Mid North Coast's largest urban area" },
      { label: "Avg GP wait", value: "4–7 days", context: "Longer during peak tourist and holiday seasons" },
      { label: "Bulk-billing rate", value: "~68%", context: "Declining in line with the national trend" },
      { label: "Tourism", value: "Major", context: "Seasonal population surges strain primary care" },
    ],
    sections: [
      {
        title: "Healthcare on the Mid North Coast",
        paragraphs: [
          "Coffs Harbour is the largest city on the NSW Mid North Coast and the main service centre for a coastal strip that runs from Sawtell and Bellingen in the south to Woolgoolga, Red Rock, and Grafton in the north. The city has grown steadily over the past two decades - driven by sea-changers from Sydney, a growing retiree population, and steady regional migration - but GP supply has not kept pace. Same-day non-urgent appointments are uncommon, and several clinics have closed their books to new patients.",
          "Coffs Harbour Health Campus provides hospital and specialist services for the region, but primary care is the bottleneck. The RACGP and national workforce data consistently identify the NSW Mid North Coast as an area of GP shortage under the Modified Monash Model (MMM), reflecting both the workforce gap and the operational impact on residents. Tourism adds seasonal pressure - during peak holiday periods (Christmas, Easter, school holidays, long weekends), the city's population can double, and local clinics get overwhelmed.",
          "For residents of smaller Mid North Coast communities - Bellingen, Dorrigo, Urunga, Woolgoolga, Nambucca Heads - Coffs is the nearest substantial GP hub, but a round trip can easily swallow half a day. Adults aged 18+ can submit InstantMed's listed medical-certificate and repeat-prescription review requests online without that drive.",
        ],
      },
      {
        title: "Retirees, Remote Workers, and Hospitality",
        paragraphs: [
          "The Mid North Coast has one of the largest retiree populations per capita in NSW. Older residents typically use GP services more frequently, which further pressures same-day availability for everyone else. For the growing cohort of remote workers who have relocated from Sydney during and after the pandemic, the healthcare access gap is often a nasty surprise - they arrive expecting metropolitan-style convenience and find a week-long wait for a routine appointment.",
          "The city's hospitality, retail, and tourism workforce relies heavily on medical certificates for absences during peak season. Getting a certificate the day you need it is critical - a delayed certificate often means a lost shift. Telehealth request submission is the entire point: submit the intake in the morning, have the certificate in their inbox if approved.",
          "Southern Cross University's Coffs Harbour campus and TAFE NSW North Coast institutes serve thousands of students across the region. Each institution sets its own policy for medical certificates used for academic support, missed assessment documentation, and coursework documentation. Students should check current requirements before submitting a request.",
        ],
      },
      {
        title: "Medical Certificates Under NSW Law",
        paragraphs: [
          `NSW employers - from local councils and NSW Health facilities to the banana and blueberry farms that anchor the Coffs Harbour agricultural sector - apply their own workplace evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          "Agricultural employers in the Coffs region - particularly the berry and banana growers - employ seasonal workers, working-holiday visa holders, and local permanent staff. Medical certificates are often required for any unplanned absence, and these employers assess telehealth certificates under their workplace evidence policies.",
          `We never issue a certificate when the clinical situation is not appropriate for telehealth. If your symptoms need a physical examination - suspected chest infection requiring auscultation, injury requiring imaging, suspicious skin lesion - the doctor will refer you to in-person care. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "Telehealth is not a substitute for ongoing GP care. Chronic disease management, immunisations, screening, hands-on physical examinations, dressings, and injections still require face-to-face care. InstantMed's online pathway is limited to medical-certificate requests, eligible repeat-prescription reviews for a regular medicine already taken, and its named specialty assessments.",
          "For residents of Bellingen, Dorrigo, and the Bellinger Valley, the drive to Coffs Harbour for a medical-certificate request can still be significant. Adults aged 18+ can submit that request online, while other needs continue through an appropriate local or in-person service.",
          `If your symptoms suggest a physical examination is required, the doctor refers you to in-person care. We never issue a certificate when the clinical situation is inappropriate for telehealth assessment. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "Practical Cost and Time Comparison for the Mid North Coast",
        paragraphs: [
          "GP economics on the Mid North Coast have moved in line with the national trend - bulk-billing has declined, gap fees have grown, and waiting lists have lengthened. For a family in Sawtell or Woolgoolga, the combined cost of a routine GP visit - fuel into Coffs, the gap fee, lost work time, and the wait - frequently exceeds InstantMed's flat fee for a medical-certificate request or repeat-prescription review.",
          "InstantMed's flat-fee model removes the unpredictability. You know what the certificate or script costs before you start the intake. There are no gap fees and no surprise add-ons. For families budgeting carefully in a region where housing costs have grown faster than incomes, that predictability matters as much as the time savings.",
          `${AVAILABILITY} If approved, a medical certificate is emailed as a PDF; an eScript is sent only if a prescribing request is approved.`,
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Coffs Harbour",
      paragraphs: [
        "Coffs Harbour has extensive pharmacy coverage through Park Beach Plaza, Coffs Central, and the Jetty. Chemist Warehouse, Priceline, TerryWhite Chemmart, and independent pharmacies all accept eScripts. Pharmacies in Sawtell, Woolgoolga, Bellingen, Dorrigo, Urunga, and Nambucca Heads also accept the QR code from an InstantMed prescription.",
        "Extended-hours options are available at Park Beach Plaza and Coffs Central. Standard PBS co-payments apply to telehealth-issued eScripts - no pricing difference at the pharmacy counter compared with a face-to-face prescription.",
        "The eScript system has been universally adopted across the Mid North Coast since the national rollout. There is no longer any meaningful gap between pharmacies that accept paper scripts and those that accept eScripts - every community pharmacy on the coast handles them as a matter of routine. For visitors to Coffs Harbour staying in holiday accommodation, this means a prescription issued by an InstantMed doctor can be filled at the nearest pharmacy without requiring any prior arrangement, just by showing the QR code on your phone.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "NSW follows the national AHPRA and Medical Board of Australia framework for telehealth. NSW Health has explicitly supported telehealth expansion under its Future Health strategy, and the Mid North Coast Local Health District has integrated telehealth into its care pathways to reduce ED presentations for low-acuity primary care needs.",
        "Prescribing through InstantMed follows national TGA rules and is limited to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review. If approved, the eScript can be dispensed at any NSW pharmacy.",
        `The NSW Health Care Complaints Commission (HCCC) handles complaints about health services operating in NSW, including telehealth. InstantMed maintains a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover Bellingen, Dorrigo, and Nambucca Heads?", a: "Yes. Bellingen, Dorrigo, Urunga, Sawtell, Woolgoolga, Nambucca Heads, Grafton - anywhere on the Mid North Coast with internet access is covered." },
      { q: "Can Southern Cross University students use InstantMed for academic support?", a: "Adults aged 18+ can submit a medical-certificate request. SCU's Coffs Harbour campus sets its own policy for academic support, missed assessment documentation, and coursework documentation, so check current requirements before submitting." },
      { q: "How do Coffs banana and berry growers assess certificates?", a: `Agricultural businesses set their own workplace evidence policies. ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "When can I submit a certificate request during school holidays?", a: `${AVAILABILITY} Medical certificates start from ${PRICING_DISPLAY.MED_CERT}, with no seasonal pricing. Issuance depends on doctor review and approval.` },
    ],
  },
  "wagga-wagga": {
    healthStats: [
      { label: "Population", value: "65K+", context: "Largest inland city in NSW" },
      { label: "Avg GP wait", value: "4–7 days", context: "Longer in surrounding Riverina communities" },
      { label: "Bulk-billing rate", value: "~65%", context: "Below the NSW average" },
      { label: "Catchment", value: "Riverina-wide", context: "Serves a population of ~200K across the region" },
    ],
    sections: [
      {
        title: "Healthcare in the Riverina",
        paragraphs: [
          "Wagga Wagga is the largest inland city in NSW and the healthcare hub for the Riverina - a catchment that stretches from Gundagai and Tumut in the east to Deniliquin and the Victorian border in the west, taking in Junee, Lockhart, Narrandera, and Leeton along the way. With 65,000 residents and a broader catchment of roughly 200,000, the city's primary care workforce is persistently stretched. Same-day appointments for non-urgent needs are hard to come by, and wait times of a week are routine.",
          "Wagga Wagga Base Hospital provides acute and specialist services for the region, but the primary care pinch point is GP supply. The Modified Monash Model (MMM) classifies the Riverina as an area of genuine workforce shortage, reflecting the persistent difficulty of attracting and retaining GPs to inland NSW. Several Wagga practices have closed their books to new patients, and bulk-billing rates have declined in line with the national trend - gap fees of $30–$60 are increasingly common.",
          "For residents of the smaller Riverina communities - Gundagai, Tumut, Junee, Lockhart, Narrandera, Leeton, Cootamundra - Wagga is the largest nearby GP hub. A round trip for a listed medical-certificate request or eligible repeat-prescription review is often 90–120 minutes of driving, not including clinic waiting time. Adults aged 18+ can submit those focused requests online from home.",
        ],
      },
      {
        title: "Defence, Agriculture, and the Riverina Workforce",
        paragraphs: [
          "Wagga hosts two of the ADF's major training bases - RAAF Base Wagga (Forest Hill) and the Army Recruit Training Centre at Kapooka. Defence families, civilian contractors, and Defence-adjacent workers make up a substantial portion of the local population. Many are relocated from interstate and do not have an established GP relationship, making online medical-certificate requests and repeat-prescription reviews practical when they do not require the base medical system.",
          "Beyond Defence, the Riverina economy runs on agriculture - wheat, canola, rice, cotton, beef, lamb, and increasingly wine in the foothills around Tumbarumba. Seasonal labour demands intersect with permanent shift work at regional processors like Teys Australia, JBS, and SunRice. Workers aged 18+ can submit a medical-certificate request online, while employers continue to apply their own evidence policies.",
          "Charles Sturt University's main campus is in Wagga Wagga, making it one of the largest regional universities in Australia. CSU, along with TAFE NSW Riverina, serves thousands of students across the region. Both set their own policies for medical certificates from AHPRA-registered doctors for academic support requests, missed assessment documentation, and coursework documentation.",
        ],
      },
      {
        title: "Medical Certificates Under NSW Law",
        paragraphs: [
          `Wagga Wagga City Council, NSW Health facilities, agricultural businesses, Defence contractors, and local retailers apply their own workplace evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          "Adults aged 18+ in Defence families can submit InstantMed's listed requests for their own non-duty needs. The base medical system handles serving personnel's duty-related healthcare, and each civilian employer sets its own evidence policy.",
          `We never issue a certificate when the clinical situation needs a physical examination or face-to-face care. If that applies, the doctor will refer you to in-person care - including, where relevant, Wagga Wagga Base Hospital. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "InstantMed is not a substitute for your regular GP relationship. Chronic disease management, immunisations, screening, hands-on physical examinations, and dressings still require face-to-face care. Its online pathway covers medical-certificate requests and eligible repeat-prescription reviews for a regular medicine already taken.",
          "Wagga's GP wait times make even a medical-certificate request difficult to arrange quickly. The city is also the service centre for Riverina residents who would otherwise drive 60–120 minutes for a certificate or eligible repeat-prescription review.",
          `If your symptoms or situation are not appropriate for telehealth, the doctor refers you to in-person care. The same suitability boundary applies across the Riverina. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "Practical Cost and Time Comparison for Riverina Residents",
        paragraphs: [
          "The economics of regional GP access have shifted in recent years. Bulk-billing has declined across the Riverina, gap fees have grown, and waiting times for non-urgent appointments have stretched to a week or more. For a working adult in Junee or Cootamundra, submitting a listed medical-certificate request or eligible repeat-prescription review online can avoid fuel, travel time, and a clinic gap fee.",
          "InstantMed's flat-fee model removes the unpredictability. You know what the certificate or script costs before you start the intake. There are no gap fees, no surprise add-ons, and no bill shock at the end of the consultation. For families budgeting carefully in a region where wages have not kept pace with cost of living, that predictability matters as much as the time saved.",
          `${AVAILABILITY} If approved, a medical certificate is emailed as a PDF; an eScript is sent only if a prescribing request is approved.`,
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Wagga Wagga",
      paragraphs: [
        "Wagga has pharmacy coverage across the CBD, Marketplace Wagga Wagga, Sturt Mall, and South City. Chemist Warehouse, Priceline, TerryWhite Chemmart, and independent pharmacies all accept eScripts. Pharmacies in surrounding Riverina towns - Junee, Lockhart, Narrandera, Leeton, Gundagai, Tumut, Cootamundra - also accept the QR code from an InstantMed prescription.",
        "Extended-hours options are available at Marketplace Wagga Wagga and several CBD locations. PBS co-payments apply to telehealth-issued eScripts identically to face-to-face prescriptions - no pricing difference at the counter.",
        "eScript adoption across the Riverina is now universal. Every community pharmacy in Wagga and the surrounding region handles the QR-code workflow as a matter of routine, and there is no need to phone ahead or make any special arrangement. For Defence families at Kapooka or RAAF Wagga whose home pharmacy may be elsewhere in the country, the eScript also works seamlessly at any Australian pharmacy outside the Riverina - the QR code is portable, not tied to a specific location.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "NSW follows the national AHPRA and Medical Board of Australia framework for telehealth. NSW Health has explicitly supported telehealth expansion, and the Murrumbidgee Local Health District - which covers Wagga Wagga and the broader Riverina - has integrated telehealth into its care pathways to ease pressure on stretched regional primary care.",
        "Prescribing through InstantMed follows national TGA rules and is limited to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review. If approved, the eScript can be dispensed at any NSW pharmacy.",
        `The NSW Health Care Complaints Commission (HCCC) handles complaints about health services in NSW, including telehealth. InstantMed operates a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover the broader Riverina?", a: "Yes. Junee, Lockhart, Narrandera, Leeton, Gundagai, Tumut, Cootamundra, Tumbarumba - anywhere in the Riverina with internet access is covered. Same service, same pricing." },
      { q: "Can adults in Defence families at Kapooka or RAAF Wagga use InstantMed?", a: "Adults aged 18+ can submit medical-certificate requests and eligible repeat-prescription review requests for a regular medicine they already take. Defence members should continue using the base medical system for duty-related healthcare. Every prescribing request requires individual doctor review, and an eScript is sent only if approved." },
      { q: "Can Charles Sturt University students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. CSU sets its own policy for academic support requests, missed assessment documentation, and coursework documentation, so check current requirements before submitting." },
      { q: "Is InstantMed cheaper than a Wagga GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Wagga bulk-billing declining and gap fees of $30–$60 increasingly common, InstantMed is often more affordable for a straightforward medical-certificate request or eligible repeat-prescription review.` },
    ],
  },
  "port-macquarie": {
    healthStats: [
      { label: "Population", value: "50K+", context: "Mid North Coast's southern retiree hub" },
      { label: "Avg GP wait", value: "5–8 days", context: "Among the longest in coastal NSW" },
      { label: "Bulk-billing rate", value: "~65%", context: "Declining with retiree demand growth" },
      { label: "Demographic", value: "Retiree-heavy", context: "One of the oldest populations by median age in NSW" },
    ],
    sections: [
      {
        title: "Healthcare in the Hastings and Mid North Coast",
        paragraphs: [
          "Port Macquarie sits at the mouth of the Hastings River and is the largest population centre of the Port Macquarie-Hastings LGA. It is one of the fastest-growing regional centres in NSW, driven largely by sea-changers from Sydney and a significant retiree population. With roughly 50,000 residents in the town itself and a broader LGA approaching 90,000, healthcare demand consistently outstrips supply. The Mid North Coast has been identified as a priority workforce region under the Modified Monash Model (MMM), reflecting persistent difficulty attracting and retaining GPs to the region.",
          "Bulk-billing has declined in line with the national trend. Several Port Macquarie practices have closed their books to new patients, and same-day appointments for non-urgent needs are hard to come by - wait times of a week are routine. For a demographic that includes a large share of older residents on multiple chronic medications, the delays compound. When a retiree needs a repeat script of a stable blood pressure tablet, sitting on a waiting list for a week is not a sensible healthcare model.",
          "Port Macquarie Base Hospital provides acute and specialist care, but the bottleneck is squarely in primary care. InstantMed lets adults aged 18+ submit medical-certificate requests and eligible repeat-prescription reviews for a regular medicine they already take. It does not replace ongoing GP relationships for complex care.",
        ],
      },
      {
        title: "Retirees, Remote Workers, and Hospitality",
        paragraphs: [
          "Port Macquarie is one of Australia's most popular retirement destinations, and the population skews significantly older than the state average. Adults aged 18+ can submit an eligible repeat-prescription review for a regular medicine they already take without travelling to a clinic. Every prescribing request requires individual doctor review, and an eScript is sent only if approved.",
          "The region has also become a magnet for remote workers since the pandemic. Many arrived from Sydney or inland NSW for lifestyle reasons and kept their city jobs. These residents often arrived expecting metropolitan healthcare convenience and were surprised to find a week-long wait for routine appointments. Telehealth restores the convenience they were used to without requiring a move back to the city.",
          "Hospitality, retail, and the region's growing tourism sector employ a younger workforce with irregular hours and limited sick leave accrual. Adults aged 18+ can submit a medical-certificate request online around those rosters; issue depends on doctor review and approval.",
        ],
      },
      {
        title: "Medical Certificates and NSW Law",
        paragraphs: [
          `Port Macquarie-Hastings employers, including local councils, NSW Health facilities, tourism operators, retailers, and private businesses, apply their own workplace evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          "Charles Sturt University's Port Macquarie campus serves regional students. CSU sets its own policy for academic support requests, missed assessment documentation, and coursework documentation, so adults aged 18+ should check current requirements before submitting a request.",
          `We never issue a certificate when the clinical situation is inappropriate for telehealth. If your symptoms suggest a physical examination is required, the doctor refers you to in-person care. InstantMed is for adults aged 18+ only. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "InstantMed is not a substitute for your regular GP relationship. Chronic disease management, immunisations, screening, hands-on physical examinations, and dressings still require face-to-face care. Its online pathway covers medical-certificate requests and eligible repeat-prescription reviews for a regular medicine already taken.",
          `For Port Macquarie's adults aged 18+, an eligible repeat-prescription review for a regular medicine already taken can be submitted online. The doctor decides whether renewal is appropriate. ${PRESCRIPTION_IF_APPROVED}`,
          "For working-age residents and remote workers, submitting a medical-certificate request or eligible repeat-prescription review online can avoid a clinic commute, wait, and gap fee. Needs outside InstantMed's listed services still require a regular GP or in-person care.",
        ],
      },
      {
        title: "Practical Cost and Time Comparison for the Hastings",
        paragraphs: [
          "GP economics in the Port Macquarie-Hastings region have moved in line with the national trend. Bulk-billing has declined, gap fees have grown to $40–$80, and waiting times for non-urgent appointments have stretched to a week. For households on fixed retiree incomes or working families managing tight budgets, the combined cost of a routine GP visit - fuel, gap fee, lost time, the wait - frequently exceeds what telehealth charges flat.",
          "InstantMed's flat-fee model removes the unpredictability. You know what the certificate or script costs before you start the intake. There are no gap fees and no surprise add-ons. For residents budgeting carefully in a region where housing and cost-of-living pressures have grown sharply, that predictability matters as much as the time saved.",
          `${AVAILABILITY} If approved, a medical certificate is emailed as a PDF; an eScript is sent only if a prescribing request is approved.`,
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Port Macquarie",
      paragraphs: [
        "Port Macquarie has pharmacy coverage across Port Central, Settlement City, Lakewood, and the CBD. Chemist Warehouse, Priceline, TerryWhite Chemmart, and independent pharmacies all accept eScripts. Pharmacies in surrounding communities - Wauchope, Laurieton, Camden Haven, Kempsey - also accept the QR code from an InstantMed prescription.",
        `For an eligible repeat-prescription review for a regular medicine already taken, the request can be submitted online. ${PRESCRIPTION_IF_APPROVED} Pharmacy dispensing still depends on the approved prescription, stock, and pharmacy checks.`,
        "eScript adoption across the Mid North Coast is now universal. Every community pharmacy in the Port Macquarie-Hastings region handles the QR-code workflow as a matter of routine, and there is no need to phone ahead or make any special arrangement. For older residents who travel between Port Macquarie and family elsewhere in the country, the eScript also works seamlessly at any Australian pharmacy outside the region - the QR code is portable and not tied to a specific location.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "NSW follows the national AHPRA and Medical Board of Australia framework for telehealth. NSW Health has explicitly supported telehealth expansion under its Future Health strategy, and the Mid North Coast Local Health District has integrated telehealth into its care pathways to reduce pressure on stretched regional primary care and ease ED demand.",
        "Prescribing through InstantMed follows national TGA rules and is limited to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review. If approved, the eScript can be dispensed at any NSW pharmacy.",
        `The NSW Health Care Complaints Commission (HCCC) handles complaints about health services in NSW, including telehealth. InstantMed maintains a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover Wauchope, Laurieton, and Camden Haven?", a: "Yes. Wauchope, Laurieton, Camden Haven, Kempsey, and all the surrounding Hastings communities. Anywhere on the Mid North Coast with internet access is covered." },
      { q: "Can retirees use InstantMed?", a: "Yes, if they are aged 18+ and the request fits a listed service. Repeat-prescription requests are limited to eligible reviews for a regular medicine the patient already takes; every request requires doctor review and an eScript is sent only if approved." },
      { q: "Can Charles Sturt University Port Macquarie students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. CSU sets its own policy for academic support, missed assessment documentation, and coursework documentation, so check current requirements before submitting." },
      { q: "Is InstantMed cheaper than a Port Macquarie GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Port Macquarie bulk-billing around 65% and increasing gap fees, InstantMed is often more affordable for a straightforward medical-certificate request or eligible repeat-prescription review.` },
    ],
  },
  dubbo: {
    healthStats: [
      { label: "Population", value: "43K+", context: "Hub of the Orana region of NSW" },
      { label: "Avg GP wait", value: "5–8 days", context: "Longer in the surrounding Orana communities" },
      { label: "Bulk-billing rate", value: "~60%", context: "Among the lowest in regional NSW" },
      { label: "Catchment", value: "120K+", context: "Serves the whole Orana and Western Plains region" },
    ],
    sections: [
      {
        title: "Healthcare in the Orana and Western Plains",
        paragraphs: [
          "Dubbo is the service hub for the Orana and Western Plains region of NSW - a vast catchment that extends from Mudgee in the east to Cobar and Bourke in the west, and from Coonamble and Walgett in the north down to Parkes and Forbes. With a city population of roughly 43,000 and a broader regional catchment of 120,000+, Dubbo's primary care workforce is under constant pressure. Same-day appointments for non-urgent needs are rarely available, and wait times of a week are routine. The Modified Monash Model (MMM) classifies Dubbo and the surrounding Orana region as a workforce priority area with genuine, persistent GP shortages.",
          "Bulk-billing in Dubbo has dropped below 60% - among the lowest in regional NSW - and gap fees of $40–$70 are common. Several practices have restricted new patient intakes, and for the smaller Orana communities the nearest GP is often Dubbo itself. A round trip from Cobar, Nyngan, Coonamble, or Warren for a routine sick note is measured in hours of driving and fuel cost.",
          "Dubbo Base Hospital provides tertiary referral services for the Western NSW Local Health District, covering an area larger than most European countries. But the primary care pinch point is not hospital capacity - it is GP supply. InstantMed lets adults aged 18+ submit medical-certificate requests and eligible repeat-prescription reviews for a regular medicine they already take from home instead of making a half-day round trip.",
        ],
      },
      {
        title: "Agriculture, Indigenous Health, and Western NSW Workers",
        paragraphs: [
          "The Orana economy runs on agriculture - wheat, cotton, sheep, and cattle across the Western Plains - together with mining services (Cobar copper and zinc, and the gold mines at Peak Hill and surrounds), transport, and regional healthcare. These industries are heavily shift-based, remote-work heavy, and often operate in locations where the nearest GP is hours away. Online medical-certificate requests and repeat-prescription reviews can avoid losing a full day of work to travel.",
          "The Orana region has significant Aboriginal and Torres Strait Islander populations, particularly in Dubbo, Wellington, and the northern communities. The Western NSW Primary Health Network works with Aboriginal Community Controlled Health Services across the region. InstantMed is not a substitute for ACCHS care, which provides culturally safe, comprehensive primary care, but its medical-certificate request and repeat-prescription review pathways can complement existing healthcare relationships.",
          "Charles Sturt University's Dubbo campus and TAFE NSW's Dubbo campus serve thousands of regional students. Each institution sets its own policy for medical certificates used for academic support, missed assessment documentation, and coursework documentation. Adults aged 18+ should check current requirements before submitting a request.",
        ],
      },
      {
        title: "Distance, Weather, and the Case for Telehealth in Western NSW",
        paragraphs: [
          "The Orana's geography is defining. Distances between towns are measured in hours, not kilometres. Wet-weather events can cut roads for days at a time, and drought years strain every service including healthcare delivery. Adults aged 18+ can submit a medical-certificate request online while the mobile network is available, with issue depending on doctor review and approval.",
          `Dubbo employers - from the Dubbo Regional Council and NSW Health facilities, through to agricultural businesses, mining services companies, and local retailers - apply their own workplace evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          "Dubbo's role as a regional service hub also means it has a substantial commuter and visitor population on any given weekday. Adults aged 18+ who travel in from smaller Orana towns for shift work, contracting, agribusiness, or personal business can submit the same medical-certificate requests and eligible repeat-prescription reviews for a regular medicine they already take as local adults.",
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "InstantMed is not a substitute for your regular GP. Chronic disease management, immunisations, screening, hands-on physical examinations, and dressings still require face-to-face care. Its online pathway covers medical-certificate requests and eligible repeat-prescription reviews for a regular medicine already taken.",
          "Western NSW's distances make this distinction matter more than in metropolitan settings. A round trip from Cobar, Bourke, or Walgett to Dubbo for a medical-certificate request or eligible repeat-prescription review can take a full day.",
          `If your situation is not appropriate for telehealth, the doctor will tell you and refer you to in-person care. The same suitability boundary applies across the Orana. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "Practical Cost and Time Comparison for Western NSW",
        paragraphs: [
          "GP economics in Western NSW have shifted significantly over recent years. Bulk-billing has declined to one of the lowest rates in regional NSW, gap fees have grown to $40–$70, and waiting times have stretched to a week or more. For households across the Orana - particularly those on agricultural incomes that fluctuate with the seasons - the combined cost of a routine GP visit frequently exceeds what telehealth charges flat.",
          "InstantMed's flat-fee model removes the unpredictability. You know what the certificate or script costs before you start the intake. There are no gap fees and no surprise add-ons. For families budgeting through drought years and rural cost-of-living pressures, that predictability matters as much as the time saved.",
          `${AVAILABILITY} If approved, a medical certificate is emailed as a PDF; an eScript is sent only if a prescribing request is approved.`,
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Dubbo",
      paragraphs: [
        "Dubbo has pharmacy coverage across Dubbo Square, Orana Mall, and the CBD. Chemist Warehouse, Priceline, TerryWhite Chemmart, and independent pharmacies all accept eScripts. Pharmacies in surrounding Orana towns - Wellington, Narromine, Nyngan, Coonamble, Cobar, Warren, Parkes, Forbes - also accept the QR code from an InstantMed prescription.",
        "Extended-hours options are more limited in regional NSW than in Sydney, but Dubbo Square and Orana Mall locations trade into the early evening. Standard PBS co-payments apply to telehealth-issued eScripts - no pricing difference at the counter compared to a face-to-face prescription.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "NSW follows the national AHPRA and Medical Board of Australia framework for telehealth. NSW Health has explicitly supported telehealth expansion, and the Western NSW Local Health District has integrated telehealth into its service planning - specifically because the region's distances and workforce shortages make face-to-face primary care genuinely impractical for a substantial share of residents.",
        "Prescribing through InstantMed follows national TGA rules and is limited to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review. If approved, the eScript can be dispensed at any NSW pharmacy.",
        `The NSW Health Care Complaints Commission (HCCC) handles complaints about health services in NSW. InstantMed operates a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover the broader Orana region?", a: "Yes. Wellington, Narromine, Nyngan, Coonamble, Cobar, Warren, Walgett, Parkes, Forbes, Mudgee - anywhere in the Orana and Western Plains with internet access is covered." },
      { q: "Can farmers on remote properties use InstantMed?", a: "Adults aged 18+ can submit a listed request with mobile or internet access. Many Orana properties have Starlink, NBN fixed wireless, or mobile coverage, so the intake can be completed from the homestead without driving into town." },
      { q: "Can Charles Sturt University Dubbo students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. CSU sets its own policy for academic support, missed assessment documentation, and coursework documentation, so check current requirements before submitting." },
      { q: "Is InstantMed cheaper than a Dubbo GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Dubbo bulk-billing around 60% and typical gap fees of $40–$70, InstantMed is often more affordable for a straightforward medical-certificate request or eligible repeat-prescription review.` },
    ],
  },
  "albury-wodonga": {
    healthStats: [
      { label: "Population", value: "100K+", context: "Combined cross-border city of Albury (NSW) + Wodonga (VIC)" },
      { label: "Avg GP wait", value: "5–9 days", context: "Persistent shortage on both sides of the border" },
      { label: "Bulk-billing rate", value: "~62%", context: "Below NSW and VIC averages in the border corridor" },
      { label: "Defence presence", value: "Significant", context: "Latchford Barracks, ADF Logistics, large civilian contractor workforce" },
    ],
    sections: [
      {
        title: "Healthcare Across the Murray Corridor",
        paragraphs: [
          "Albury-Wodonga straddles the Murray River and the NSW-Victoria state border, making it one of Australia's most unusual healthcare environments. Residents on the Albury side are covered by NSW Health, while Wodonga sits within the Victorian public health system. AHPRA registration is national, and InstantMed's listed services are available to eligible adults aged 18+ on either side of the river. Employers and institutions set their own evidence policies.",
          "The Albury-Wodonga region has experienced strong population growth, with combined city population now exceeding 100,000. The healthcare workforce has not grown proportionately. GP wait times of 5–9 days are routine for non-urgent appointments, and several practices on both sides of the border have closed their books to new patients. The Albury Wodonga Health service operates acute care across two campuses, but hospital demand for primary care overflow is consistently high.",
          "The Murray River corridor also serves a wider agricultural and pastoral catchment. Communities like Corowa, Jindera, Culcairn, Holbrook, and Tallangatta on the Victorian side all look to Albury-Wodonga as their main service hub. For these residents, telehealth removes not just the waiting room but the 30-60 minute drive each way for a routine certificate or repeat script.",
        ],
      },
      {
        title: "Defence Families and the Border Workforce",
        paragraphs: [
          "Latchford Barracks in Wodonga and the ADF Logistics and Training bases across the border corridor make Defence one of the region's largest employers. Soldiers, officers, and the substantial civilian contractor workforce attached to Defence operations are frequently posted to Albury-Wodonga from other parts of Australia and often arrive without an established local GP. Adults aged 18+ can submit InstantMed's listed medical-certificate and repeat-prescription review requests online while establishing appropriate local care.",
          "Adults aged 18+ in Defence families use civilian healthcare providers for their own needs. The base medical system handles duty-related healthcare for serving personnel. Eligible adults can submit InstantMed's listed medical-certificate and repeat-prescription review requests online, while other needs require appropriate local care.",
          "Beyond Defence, Albury-Wodonga has a large cross-border commuter workforce - residents who live in Albury and work in Wodonga, or vice versa, crossing the Murray daily. These workers often don't have a clear sense of which state's GP system they should use, and the ambiguity adds a small but real barrier to routine care. Telehealth eliminates the cross-border complexity: it is a national service regulated under Australian law, not state law, and works the same way regardless of which bank of the Murray you happen to be standing on.",
        ],
      },
      {
        title: "Medical Certificates, State Borders, and NSW Law",
        paragraphs: [
          `The Fair Work Act 2009 is federal legislation and applies across NSW and Victoria. AHPRA registration is national. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          "For workers in the agricultural sector across the Murray corridor - grain growers, wool and beef producers, and the network of irrigation farms along the river - enterprise agreements and labour hire arrangements consistently require medical documentation for unplanned absences. These employers assess telehealth certificates under their workplace evidence policies.",
          "Charles Sturt University has a campus in Albury, and TAFE NSW operates in both cities. Those institutions and La Trobe University's Wodonga campus each set their own policy for medical certificates used for academic support, coursework documentation, and missed assessments. Adults aged 18+ should check current requirements before submitting a request.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Albury-Wodonga",
      paragraphs: [
        "Albury-Wodonga has good pharmacy coverage across both cities. On the Albury side, Chemist Warehouse and Priceline operate in Centro Albury, and independent pharmacies serve suburbs including Lavington, Hamilton Valley, and East Albury. Wodonga's Marketplace and High Street have Chemist Warehouse, TerryWhite Chemmart, and independent options. All accept eScripts - the QR code from an InstantMed prescription works at any pharmacy on either side of the border.",
        "The national eScript system does not care which state a pharmacy is in. An eScript issued by an InstantMed doctor can be filled at a Chemist Warehouse in Albury or at an independent pharmacy in Wodonga - the QR code works identically. For the region's cross-border workers and families, this portability is a genuine convenience. Standard PBS co-payments apply regardless of which side of the Murray you collect your medication.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Albury-Wodonga",
      paragraphs: [
        "Telehealth in Australia is regulated nationally by AHPRA and the Medical Board of Australia. There is no state-by-state telehealth licence. An AHPRA-registered doctor can provide telehealth consultations to patients anywhere in Australia - including in NSW, Victoria, and the unique cross-border setting of Albury-Wodonga. InstantMed's doctors hold current AHPRA registration and comply with the Medical Board's telehealth guidelines.",
        "Prescribing follows national TGA rules with some state-level overlays for controlled substances. InstantMed accepts eligible repeat-prescription reviews for a regular medicine the patient already takes and its named specialty assessments. Every prescribing request requires individual doctor review, and an eScript is sent only if approved. Schedule 8 controlled substances are not prescribed through InstantMed.",
        `For NSW residents on the Albury side, the NSW Health Care Complaints Commission (HCCC) handles complaints about health services including telehealth. For Victorian residents in Wodonga, the Health Complaints Commissioner Victoria has jurisdiction. InstantMed operates a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Does it matter whether I live in Albury or Wodonga?", a: `InstantMed's listed services are available to eligible adults aged 18+ on both sides of the border. ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Can Defence families at Latchford Barracks use InstantMed?", a: "Adults aged 18+ can submit a listed request for their own non-duty needs. Defence members should continue using the base medical system for duty-related healthcare." },
      { q: "Does my eScript work in both NSW and Victorian pharmacies?", a: "Yes. eScripts are a national system and work at any Australian pharmacy regardless of state. Whether you fill it at a Chemist Warehouse in Albury or a Priceline in Wodonga, the QR code works the same way." },
      { q: "Can I use InstantMed for places like Corowa, Jindera, and Holbrook?", a: "Yes. Any town in the Murray corridor with internet access is covered - Corowa, Jindera, Culcairn, Holbrook, Tallangatta, and anywhere else in the region." },
      { q: "How much does a medical certificate cost?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. Local clinic fees and availability vary across Albury-Wodonga.` },
    ],
  },
  "bondi-beach": {
    healthStats: [
      { label: "Population", value: "12K+", context: "One of Australia's most iconic beach suburbs" },
      { label: "Avg GP wait", value: "3–7 days", context: "Very limited bulk-billing in the Eastern Suburbs" },
      { label: "Bulk-billing rate", value: "~45%", context: "Among the lowest in Greater Sydney" },
      { label: "Gap fees", value: "$60–$100", context: "Premium pricing in Eastern Suburbs clinics" },
    ],
    sections: [
      {
        title: "Healthcare in Sydney's Eastern Suburbs",
        paragraphs: [
          "Bondi Beach and the surrounding Eastern Suburbs - Bondi Junction, Bronte, Coogee, Randwick, Waverley - have some of the lowest bulk-billing rates in Greater Sydney. Inner-city and coastal GPs in the Eastern Suburbs frequently charge gap fees of $60–$100 per standard consultation, making even a straightforward sick certificate an expensive exercise. The combination of high rent, affluent demographics, and limited Medicare incentives means few practices offer bulk-billing at all.",
          "The Eastern Suburbs' population is heavily weighted toward young professionals, backpackers, international students, and shift workers in hospitality and retail. These groups may need a medical-certificate request or eligible repeat-prescription review but face a $90 gap fee for a standard local consultation.",
          "Bondi's transient population adds another dimension. Backpackers on working holiday visas, international students at UNSW or the nearby English language schools, and short-term renters often don't have an established GP. InstantMed lets eligible adults submit medical-certificate requests and repeat-prescription review requests online; other needs require local primary care.",
        ],
      },
      {
        title: "Who Uses Telehealth in Bondi and the Eastern Suburbs",
        paragraphs: [
          "Bondi's hospitality and retail workforce is substantial. Cafes, restaurants, bars, and surf shops along Campbell Parade and Hall Street employ hundreds of casual and part-time workers. These workers often have irregular hours, limited sick leave, and can't easily visit a GP during standard business hours. Adults aged 18+ can submit a medical-certificate request online before a shift; issue depends on the clinical assessment.",
          `The Eastern Suburbs also has a large fitness and wellness community - personal trainers, yoga instructors, surf coaches, and gym staff. These workers are often self-employed or casual, and a day off sick means lost income with no safety net. Adults aged 18+ can submit a medical-certificate request online, while clients and venues apply their own documentation policies. ${MED_CERT_DOCUMENT_SCOPE}`,
          "UNSW Kensington is a short bus ride from Bondi, and thousands of students live across the Eastern Suburbs. Adults aged 18+ can submit a medical-certificate request online. UNSW and other universities set their own policies for academic support and coursework documentation.",
        ],
      },
      {
        title: "Medical Certificates for Eastern Suburbs Workers",
        paragraphs: [
          `Bondi RSL, Campbell Parade cafes, Westfield Bondi Junction retailers, and other Eastern Suburbs employers apply their own workplace evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          "For casual workers - a large portion of Bondi's workforce - each employer decides what absence documentation it requires even when formal sick leave does not apply. Check the current workplace policy before submitting a request.",
          "Bondi's international workforce (working holiday makers, student visa holders) sometimes face confusion about Australian medical certificate requirements. Routine absence evidence is assessed by the employer or institution under its own policy. Your visa status does not change the certificate details required for a simple sick-leave record.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Bondi",
      paragraphs: [
        "Bondi Beach and the surrounding Eastern Suburbs have good pharmacy coverage. Bondi Junction's Westfield has multiple pharmacy options including Chemist Warehouse and Priceline, both open extended hours. Local pharmacies along Bondi Road and Campbell Parade serve the beach suburb directly. All accept eScripts - the QR code from an InstantMed prescription works at any of them.",
        "Westfield Bondi Junction pharmacies typically trade until 9pm on weeknights and through the weekend. Randwick and Coogee also have extended-hours pharmacy options. Dispensing timing depends on the approved prescription, pharmacy hours, stock, and pharmacy checks.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "NSW follows the national AHPRA and Medical Board of Australia framework for telehealth. All telehealth consultations must be provided by AHPRA-registered practitioners - the same registration standard required for in-person care. NSW Health supports telehealth as a legitimate component of the primary care system.",
        "Prescribing through InstantMed follows national TGA rules and is limited to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review. If approved, the eScript can be dispensed at any NSW pharmacy.",
        `The NSW Health Care Complaints Commission (HCCC) handles complaints about health services in NSW, including telehealth. InstantMed operates a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Can backpackers use InstantMed in Bondi?", a: "Adults aged 18+ who meet the service eligibility requirements can submit a listed request while visiting Bondi. Medical certificates do not require Medicare." },
      { q: "Are Bondi GP clinics really that expensive?", a: "The Eastern Suburbs have some of the lowest bulk-billing rates in Sydney. Gap fees of $60–$100 are common for a standard consultation. For a straightforward medical certificate, InstantMed is significantly more affordable." },
      { q: "Can UNSW students use InstantMed for academic support?", a: "Adults aged 18+ can submit a medical-certificate request. UNSW sets its own policy for academic support, coursework documentation, and missed assessments, so check the current requirements before submitting." },
      { q: "Is InstantMed available across the whole Eastern Suburbs?", a: "Yes. Bondi Beach, Bondi Junction, Bronte, Coogee, Randwick, Waverley, Tamarama, Double Bay - anywhere with internet access. It's an online service with no geographic restrictions within Australia." },
    ],
  },
  orange: {
    healthStats: [
      { label: "Population", value: "42K+", context: "Central West NSW's service hub" },
      { label: "Avg GP wait", value: "5–10 days", context: "Among the longest in regional NSW" },
      { label: "Bulk-billing rate", value: "~55%", context: "Well below the state average" },
      { label: "Catchment", value: "80K+", context: "Serves Bathurst, Mudgee, and surrounding Central West" },
    ],
    sections: [
      {
        title: "Healthcare in the Central West",
        paragraphs: [
          "Orange is the healthcare and service hub for NSW's Central West - a region stretching from Bathurst in the east to Parkes and Forbes in the west, and from Mudgee in the north to Cowra in the south. Orange Health Service is the major referral hospital for the region, but the real pressure point is primary care. Same-day GP appointments for non-urgent needs are rarely available, with wait times of a week or more being the norm rather than the exception.",
          "Bulk-billing in Orange has been declining steadily. Many practices now charge gap fees of $40–$70, and several have closed their books to new patients. For the Central West's smaller towns - Molong, Canowindra, Blayney, Millthorpe - the nearest GP is often Orange itself, adding a 30–60 minute drive each way on top of the appointment wait. For a medical certificate that takes a doctor five minutes to assess, the total time and cost investment is disproportionate.",
          "The Central West has been identified as a Distribution Priority Area (DPA) under the Modified Monash Model, reflecting genuine, persistent GP workforce shortages. This is not a temporary dip - the region has been underserviced for years, and population growth in Orange itself is making it worse. InstantMed lets adults aged 18+ submit medical-certificate requests and eligible repeat-prescription reviews for a regular medicine they already take online.",
        ],
      },
      {
        title: "Agriculture, Mining, and Central West Workers",
        paragraphs: [
          "The Central West economy runs on agriculture (wine, stone fruit, cherries, grazing), mining (Cadia-Ridgeway gold/copper mine is one of Australia's largest), healthcare, education, and government services. Many of these industries involve shift work, seasonal employment, or remote locations where getting to a GP clinic during business hours is impractical.",
          "Cadia mine alone employs over 1,800 workers, many of whom commute from Orange, Bathurst, and surrounding towns. Mining rosters mean days off rarely coincide with available GP appointments. Adults aged 18+ can submit a medical-certificate request between shifts; digital delivery occurs only if the request is approved.",
          `Agricultural workers across the Central West face similar access challenges, particularly during harvest and shearing seasons when taking time off to visit a GP is not practical. Adults aged 18+ can submit a medical-certificate request online. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
        ],
      },
      {
        title: "Students and Medical Certificates in the Central West",
        paragraphs: [
          "Charles Sturt University's Orange campus is the main tertiary institution in the region, alongside TAFE NSW Western. Both set their own policies for medical certificates used for academic support, missed assessment documentation, and coursework documentation. Adults aged 18+ should check current institution requirements before submitting a request.",
          "Orange's schools and boarding facilities set their own absence-documentation policies. InstantMed is for adults aged 18+ only.",
          `Orange City Council, the Western NSW Local Health District, mining companies, agricultural businesses, and local retailers apply their own workplace evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Orange",
      paragraphs: [
        "Orange has good pharmacy coverage across the CBD, Orange City Centre shopping precinct, and the Summer Street retail strip. Chemist Warehouse, Priceline, TerryWhite Chemmart, and independent pharmacies all accept eScripts. Pharmacies in surrounding towns - Bathurst, Mudgee, Parkes, Forbes, Cowra, Blayney - also accept the QR code from an InstantMed prescription.",
        "Extended-hours options are more limited in regional NSW than in Sydney, but Orange City Centre pharmacies typically trade into the early evening. Standard PBS co-payments apply to telehealth-issued eScripts - there is no pricing difference at the counter compared to a prescription from a face-to-face consultation.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in NSW",
      paragraphs: [
        "NSW follows the national AHPRA and Medical Board of Australia framework for telehealth. NSW Health has explicitly supported telehealth expansion, and the Western NSW Local Health District has integrated telehealth into its service planning to address the region's persistent GP workforce shortages.",
        "Prescribing through InstantMed follows national TGA rules and is limited to eligible repeat-prescription reviews for a regular medicine already taken and named specialty pathways. Every prescribing request requires individual doctor review. If approved, the eScript can be dispensed at any NSW pharmacy.",
        `The NSW Health Care Complaints Commission (HCCC) handles complaints about health services in NSW. InstantMed operates a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover Bathurst, Mudgee, and the wider Central West?", a: "Yes. Orange, Bathurst, Mudgee, Parkes, Forbes, Cowra, Blayney, Millthorpe, Molong, Canowindra - anywhere in the Central West with internet access is covered." },
      { q: "Can Cadia mine workers use InstantMed?", a: `Adults aged 18+ can submit a medical-certificate request online. Mining employers and labour-hire firms apply their own evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Can Charles Sturt University Orange students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. CSU sets its own policy for academic support, missed assessment documentation, and coursework documentation, so check current Orange-campus requirements before submitting." },
      { q: "Is InstantMed cheaper than a GP in Orange?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Orange bulk-billing around 55% and typical gap fees of $40–$70, InstantMed is often more affordable for a straightforward medical-certificate request or eligible repeat-prescription review.` },
    ],
  },
}
