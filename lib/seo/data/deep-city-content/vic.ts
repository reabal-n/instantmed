/**
 * Deep city content -- Victoria
 * Part of the deep-city-content data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import type { DeepCityContent } from "../deep-city-content"

const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")
const MED_CERT_DOCUMENT_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")
const PRESCRIPTION_IF_APPROVED = getApprovedClaim("prescription_if_approved")

export const VIC_CITIES: Record<string, DeepCityContent> = {
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
          "Melbourne has a well-documented GP shortage that's been worsening for years. The city's rapid population growth - roughly 100,000 new residents per year pre-pandemic - has outpaced the supply of general practitioners. Inner-city suburbs like Fitzroy, Collingwood, and Brunswick have some of the longest wait times in the country, with many clinics booking a week or more in advance for non-urgent appointments.",
          "The outer suburbs face different but equally challenging access issues. Growth corridors like Wyndham, Casey, and Melton have large populations and relatively few GP clinics. Residents in these areas often face a choice between a long wait locally or a lengthy drive to a clinic in another suburb. For a straightforward medical certificate, neither option makes much sense.",
          "Bulk-billing rates in Melbourne have been declining steadily. Many inner-city GPs now charge gap fees of $40–$80 per standard consultation. Even in suburbs where bulk-billing is available, the trade-off is usually longer wait times - sometimes 5–7 days. When you need a medical certificate for work tomorrow, that timeline doesn't help.",
        ],
      },
      {
        title: "Who Uses Telehealth in Melbourne",
        paragraphs: [
          "Melbourne's telehealth adoption rate is among the highest in Australia, driven by the city's experience with extended lockdowns and a tech-savvy population. Telehealth usage for non-urgent consultations increased significantly from 2020 onwards and has remained elevated, particularly among 18–44 year olds - the demographic most likely to need medical certificates for work or study.",
          "University students are heavy telehealth users. Melbourne is home to the University of Melbourne, Monash, RMIT, Deakin, La Trobe, Swinburne, and VU - collectively serving hundreds of thousands of students. For academic support requests and coursework documentation, a medical certificate from an AHPRA-registered doctor via telehealth is assessed under Victorian university policies.",
          "Melbourne's hospitality and retail workforce - a significant portion of the city's employment - often works irregular hours and may struggle to attend a clinic during business hours. Adults aged 18+ can submit a medical-certificate request online; issue depends on the clinical assessment, and employers apply their own evidence policies.",
        ],
      },
      {
        title: "Medical Certificates and Victorian Employment Law",
        paragraphs: [
          `Victorian workplaces apply the Fair Work Act or relevant state industrial instruments, and each employer sets its own leave-evidence policy. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          "Victorian public sector enterprise agreements and private-sector workplace policies can set different evidence requirements. Employees should check the current policy that applies to their request.",
          "For casual workers in Melbourne, each employer decides what absence documentation it requires even when formal sick leave does not apply. Adults aged 18+ can submit a medical-certificate request online and should check the workplace's current evidence policy.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Melbourne",
      paragraphs: [
        `Melbourne is home to over 1,400 community pharmacies, including the headquarters of Chemist Warehouse - Australia's largest pharmacy chain. Every major pharmacy chain and virtually all independent pharmacies in Victoria now accept eScripts. ${PRESCRIPTION_IF_APPROVED}`,
        "Extended-hours pharmacies are common across Melbourne. Many Chemist Warehouse and Priceline locations in shopping centres and high streets stay open until 9pm. Several pharmacies in the CBD and inner suburbs operate late or 24 hours. If a prescribing request is approved, the eScript can often be filled the same day, including in the evening.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth in Victoria",
      paragraphs: [
        "Victoria was among the most enthusiastic adopters of telehealth during 2020–2021, and the state government has since embedded telehealth into its ongoing healthcare strategy. The Victorian Department of Health recognises telehealth as a legitimate and important component of the primary care system, particularly for reducing pressure on emergency departments.",
        "All telehealth consultations in Australia must be provided by AHPRA-registered practitioners - the same registration standard required for in-person care. The Medical Board of Australia's telehealth guidelines require that doctors exercise the same standard of care via telehealth as they would in person, including appropriate clinical assessment and documentation.",
        "Prescribing via telehealth in Victoria follows national TGA guidelines. InstantMed accepts eligible prescribing requests only through repeat-prescription reviews for a regular medicine the patient already takes and its erectile dysfunction, hair loss, women's health, and weight-management assessment pathways. Every prescribing request requires an individual doctor review, and an eScript is sent only if approved. Schedule 8 controlled substances have additional restrictions and typically require in-person assessment. InstantMed does not prescribe Schedule 8 medications.",
      ],
    },
    additionalFaqs: [
      { q: "How do Melbourne employers assess telehealth medical certificates?", a: `Victorian government, private businesses, universities, and other workplaces apply their own evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Can I submit a medical-certificate request for a mental health day in Melbourne?", a: `Adults aged 18+ can submit a request for a mental-health-related absence. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Is InstantMed cheaper than seeing a GP in Melbourne?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Melbourne's declining bulk-billing rates, a standard GP visit can cost $40–$80 out of pocket (gap fee after Medicare rebate). For a straightforward certificate, InstantMed is often the more affordable option.` },
      { q: "How should Monash or UniMelb students check medical-documentation requirements?", a: "Victorian universities set their own policies for medical certificates, academic support, coursework documentation, and missed assessments. Check the current process at Monash or the University of Melbourne before submitting a request." },
      { q: "What if the doctor decides I need an in-person visit?", a: `If a listed request cannot be safely assessed without a physical examination, the doctor will recommend you see a GP in person instead. ${REFUND_PAYMENT_PROCESS}` },
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
          "The city's evolution from its manufacturing heritage (Ford, Alcoa) to a knowledge and service economy has brought new residents who commute to Melbourne - often falling sick on days when a 90-minute round trip to a familiar GP simply isn't practical. InstantMed gives eligible Geelong residents access to the same medical-certificate and repeat-prescription review pathways available in inner Melbourne.",
          "Barwon Health's University Hospital Geelong is the major public hospital, but a medical-certificate request or repeat-prescription review for a regular medicine already taken does not belong in emergency or urgent care. InstantMed provides a focused online pathway for those requests.",
        ],
      },
      {
        title: "Commuters, Students, and Surf Coast Workers",
        paragraphs: [
          "Geelong's population includes a significant commuter base travelling to Melbourne daily, Deakin University's Waurn Ponds campus students, and hospitality workers along the Surf Coast. Each group faces distinct healthcare access challenges - commuters need flexible hours, students need affordable options, and hospitality workers need weekend availability.",
          "For Surf Coast tourism workers in Torquay, Anglesea, and Lorne, peak season coincides with the busiest time for local clinics. Telehealth means getting a medical certificate without losing an entire shift to a doctor's waiting room.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies in Geelong",
      paragraphs: [
        "Geelong has extensive pharmacy coverage including Chemist Warehouse in Waurn Ponds, Westfield Geelong, and Market Square. eScripts are accepted everywhere - show the QR code and collect your medication. Regional pharmacies in Ocean Grove, Torquay, and Bannockburn also accept eScripts without issue.",
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
      { q: "Can Deakin University students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. Deakin sets its own policy for academic support, missed assessment documentation, and extension requests, so check current requirements before submitting." },
      { q: "Does InstantMed serve the Surf Coast?", a: "Yes. We serve all of Greater Geelong including Torquay, Anglesea, Lorne, Ocean Grove, and the Bellarine Peninsula." },
      { q: "Is InstantMed cheaper than a Geelong GP?", a: `With bulk-billing declining in Geelong (gap fees of $40–$70 are common), InstantMed is often more affordable for a straightforward medical-certificate request. Medical certificates start from ${PRICING_DISPLAY.MED_CERT}.` },
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
          "Ballarat is growing fast - it's one of regional Australia's fastest-growing cities, attracting families and professionals priced out of Melbourne's housing market. But healthcare supply hasn't kept pace. Several GP practices have closed their books to new patients, and those accepting new patients often have wait times of 5+ days for non-urgent appointments.",
          "The city serves as a healthcare hub for the Central Highlands and Goldfields region, drawing patients from Daylesford, Creswick, Bacchus Marsh, and beyond. This catchment demand puts additional pressure on local clinics. Ballarat Health Services provides hospital-level care, but for routine needs like medical certificates, the system is overloaded.",
          "For the estimated 5,000+ Ballarat residents who commute to Melbourne for work, healthcare access is doubly complicated. You're unwell, you can't get a same-day GP appointment in Ballarat, and you certainly can't make the 90-minute drive to a Melbourne clinic. InstantMed lets adults aged 18+ submit a medical-certificate request or eligible repeat-prescription review for a regular medicine they already take online.",
        ],
      },
      {
        title: "Workers and Students",
        paragraphs: [
          "Federation University's Ballarat campus is the city's major university, supplemented by TAFE and a growing education sector. All Victorian universities assess telehealth medical certificates under their own policies for academic support requests.",
          "Ballarat's economy spans manufacturing, healthcare, retail, and a significant public sector presence (including CFA and local government). Workers across these sectors benefit from telehealth when GP access is limited - particularly shift workers and those in remote-start roles.",
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
      { q: "Can Melbourne commuters from Ballarat use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request from home or the train. If approved, the certificate is emailed as a PDF; the employer applies its own evidence policy." },
      { q: "How much does a medical certificate cost in Ballarat?", a: `Medical certificates from InstantMed start at ${PRICING_DISPLAY.MED_CERT}. Local GP fees and wait times vary by clinic.` },
      { q: "Does InstantMed serve Daylesford and Bacchus Marsh?", a: "Yes. We serve all of regional Victoria - anywhere with internet access." },
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
          `Bulk-billing in Bendigo has dropped below 60% - one of the lowest rates in regional Victoria. A standard GP consultation can cost $50–$80 out of pocket after Medicare rebate. InstantMed medical certificates start from ${PRICING_DISPLAY.MED_CERT}, with issue depending on the clinical assessment.`,
          "The ripple effect extends beyond Bendigo itself. Residents in Heathcote, Castlemaine, and the Loddon Shire often travel to Bendigo for healthcare. Adding a 30–60 minute drive each way to a 5-day wait makes an online medical-certificate request or eligible repeat-prescription review a practical option.",
        ],
      },
      {
        title: "Bendigo's Workforce",
        paragraphs: [
          "Bendigo's economy is anchored by healthcare (Bendigo Health is the largest employer), education (La Trobe University Bendigo), retail, agriculture, and a growing creative sector. Shift workers at the hospital and aged care facilities, university staff, and agricultural workers all benefit from telehealth when clinic schedules don't align with work rosters.",
          "La Trobe University Bendigo serves thousands of students from across regional Victoria. The university applies its own policy to academic-support documentation. Adults aged 18+ can submit a medical-certificate request online and should check current institution requirements first.",
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
      { q: "Does InstantMed serve Castlemaine and Kyneton?", a: "Yes. We serve all of regional Victoria - Castlemaine, Kyneton, Heathcote, Echuca, and everywhere in between." },
      { q: "Can every medical-certificate request be handled by telehealth?", a: `No. Some symptoms need a physical examination or other in-person care. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT} ${REFUND_PAYMENT_PROCESS}` },
      { q: "Can La Trobe Bendigo students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. La Trobe sets its own policy for academic support and coursework documentation, so check current requirements before submitting." },
    ],
  },
  shepparton: {
    healthStats: [
      { label: "Population", value: "65K+", context: "Heart of the Goulburn Valley" },
      { label: "Avg GP wait", value: "4–7 days", context: "Longer during harvest and in surrounding towns" },
      { label: "Bulk-billing rate", value: "~62%", context: "Below the Victorian average" },
      { label: "Distance to Melbourne", value: "180km", context: "Roughly two hours by road" },
    ],
    sections: [
      {
        title: "Healthcare in the Goulburn Valley",
        paragraphs: [
          "Shepparton is the largest city in the Goulburn Valley and the main service hub for a region that includes Mooroopna, Kyabram, Tatura, Numurkah, Cobram, Seymour, and Benalla. With roughly 65,000 residents and a broader Goulburn Valley catchment well over 150,000, the city sits at a familiar regional Victorian intersection of rapid population change and constrained GP workforce. Same-day appointments are rare, several practices have stopped accepting new patients, and wait times stretch to a week or more for non-urgent needs.",
          "Goulburn Valley Health anchors hospital and specialist services for the region, but the pinch point - as everywhere in regional Victoria - is primary care. The Modified Monash Model (MMM) classifies the Goulburn Valley as a workforce priority area, and the RACGP's regional and rural data consistently identifies the region as short of GPs relative to its population. Bulk-billing has declined in Shepparton in line with the national trend, with gap fees of $40–$70 now common.",
          "For residents of the smaller Goulburn Valley communities - Mooroopna, Tatura, Kyabram, Numurkah, Cobram, Nathalia - Shepparton is often the nearest GP hub. A round trip of 60–90 minutes plus waiting-room time is a significant cost. Adults aged 18+ can submit InstantMed's listed medical-certificate and repeat-prescription review requests online without that travel.",
        ],
      },
      {
        title: "Agriculture, Food Processing, and a Diverse Workforce",
        paragraphs: [
          "The Goulburn Valley is the food bowl of Victoria. Shepparton's economy is dominated by dairy, fruit (pears, apples, stone fruit), tomatoes, and processing industries including SPC, Campbell's, Unilever, and the dairy processors in Tatura. These are heavily shift-based industries, and harvest season brings a large influx of seasonal workers - including working-holiday visa holders - on top of the permanent workforce.",
          "Medical certificates for unplanned absences are a constant requirement across these workplaces. For shift workers and seasonal staff, getting to a GP during business hours is often impossible - and for working-holiday visa holders without an established local GP, it's even harder. Telehealth provides a consistent pathway that works around rosters and does not require a local patient relationship.",
          "Shepparton has one of the most culturally diverse populations in regional Australia, with established communities of Albanian, Iraqi, Afghan, Congolese, and Pacific Islander origin, alongside long-standing Italian and Greek communities. For residents who prefer a GP who shares their language, available appointments are often further narrowed. InstantMed provides a standardised online pathway for medical-certificate requests and eligible repeat-prescription reviews for a regular medicine already taken.",
        ],
      },
      {
        title: "Students, Universities, and Workers Under Victorian Law",
        paragraphs: [
          "La Trobe University's Shepparton campus, together with GOTAFE Goulburn Ovens, serves thousands of regional students. Both set their own policies for medical certificates used for academic support, missed assessment documentation, and coursework documentation. Adults aged 18+ should check current institution requirements before submitting a request.",
          `Shepparton employers - from the Greater Shepparton City Council and Goulburn Valley Health, through to SPC, Campbell's, and the dairy processors - apply their own workplace evidence policies. ${EMPLOYER_POLICY_CAVEAT}`,
          `We never issue a certificate when the clinical situation needs a physical examination or face-to-face care. If your symptoms suggest a physical exam is required, the doctor will refer you to in-person care. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "Telehealth is not a substitute for your regular GP. Chronic disease management, immunisations, screening, hands-on physical examinations, and dressings still require face-to-face care. InstantMed provides focused online pathways for medical-certificate requests and eligible repeat-prescription reviews for a regular medicine already taken.",
          "For Shepparton's diverse population, InstantMed has a particular advantage: its medical-certificate assessment and documentation are standardised, so the language barrier that often constrains access to a preferred local GP is not the same constraint here. The documentation produced is consistent regardless of whether you would normally see a Greek-speaking, Arabic-speaking, or English-speaking GP.",
          `If a listed request is not appropriate for telehealth, the doctor will refer you to in-person care. The same suitability boundary applies in Shepparton and every other location we serve. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "Cost, Time, and the Practical Case for Telehealth in the Goulburn Valley",
        paragraphs: [
          "The economics of GP access in regional Victoria have shifted significantly over the past five years. Bulk-billing has declined, gap fees have grown, and waiting times for non-urgent appointments have stretched. For a working family in Mooroopna or Tatura, the combined cost of attending a GP for a medical-certificate request or eligible repeat-prescription review - fuel to drive to Shepparton, lost work time, gap fee, and the wait - can exceed InstantMed's listed fee for the corresponding service.",
          "InstantMed's flat-fee model removes the unpredictability. You know what a medical-certificate request or repeat-prescription review costs before you start the intake. There are no gap fees, no bill shock, no surprise add-ons. For families managing tight budgets in a region where wages have not kept pace with cost of living, that predictability matters as much as the time savings.",
          "Requests can be submitted and reviewed 24/7. After review, an approved medical certificate is sent as a PDF; an eScript is sent only if a prescribing request is approved. The process stays online from intake to delivery. For Shepparton residents and workers across the Goulburn Valley, that avoids competing for a same-day clinic appointment for these focused requests.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Shepparton",
      paragraphs: [
        "Shepparton has pharmacy coverage across the CBD, Shepparton Marketplace, Riverside Plaza, and surrounding suburban centres. Chemist Warehouse, Priceline, TerryWhite Chemmart, and independent pharmacies all accept eScripts. Surrounding Goulburn Valley towns - Mooroopna, Tatura, Kyabram, Numurkah, Cobram - have local pharmacies that accept the QR code from an InstantMed prescription.",
        "Extended-hours options exist at Shepparton Marketplace. Standard PBS co-payments apply to telehealth-issued eScripts - there is no pricing difference at the counter compared to a face-to-face prescription.",
        "eScript adoption across the Goulburn Valley is now universal. Every community pharmacy in Shepparton and the surrounding region handles the QR-code workflow as a matter of routine, with no need to phone ahead or make any special arrangement. For seasonal workers and working-holiday visa holders moving through the region during harvest, this also means a prescription issued by an InstantMed doctor in Shepparton will work at any pharmacy elsewhere in the country once they leave - the QR code is portable and not tied to a specific location. The same applies to the substantial number of Goulburn Valley families who travel between Shepparton and Melbourne for work, family, or specialist appointments - your eScript follows you, not the other way around.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Victoria",
      paragraphs: [
        "Victoria follows the national AHPRA and Medical Board of Australia framework for telehealth. The Victorian Government has invested heavily in telehealth infrastructure and has explicitly identified regional Victoria - including the Goulburn Valley - as a priority area for digital healthcare delivery. The Goulburn Valley Primary Health Network has integrated telehealth into its service planning.",
        "Prescribing follows national TGA rules. InstantMed accepts eligible prescribing requests only through repeat-prescription reviews for a regular medicine the patient already takes and its named specialty assessment pathways. Every prescribing request requires an individual doctor review, and an eScript is sent only if approved. Schedule 8 controlled substances require Victorian Department of Health authority and in-person assessment, and are not prescribed through InstantMed.",
        `The Health Complaints Commissioner Victoria handles complaints about health services in Victoria, including telehealth. InstantMed operates a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover the Goulburn Valley?", a: "Yes. Mooroopna, Tatura, Kyabram, Numurkah, Cobram, Seymour, Benalla - anywhere in the Goulburn Valley with internet access is covered." },
      { q: "Can working-holiday visa holders use InstantMed during harvest?", a: "Yes. Any resident 18+ currently in Australia can use InstantMed regardless of visa status. Certificates are subject to employer and labour-hire provider policies." },
      { q: "Can La Trobe Shepparton students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. La Trobe sets its own policy for academic support, missed assessment documentation, and coursework documentation, so check current requirements before submitting." },
      { q: "Is InstantMed cheaper than a Shepparton GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Shepparton bulk-billing around 62% and gap fees of $40–$70 common, InstantMed is often more affordable for a straightforward medical-certificate request or eligible repeat-prescription review.` },
    ],
  },
  mildura: {
    healthStats: [
      { label: "Population", value: "55K+", context: "Sunraysia's largest population centre" },
      { label: "Avg GP wait", value: "4–8 days", context: "Among the longest in regional Victoria" },
      { label: "Bulk-billing rate", value: "~60%", context: "Well below the Victorian average" },
      { label: "Distance to Melbourne", value: "545km", context: "Roughly six hours by road" },
    ],
    sections: [
      {
        title: "Healthcare in Sunraysia and the Murray-Mallee",
        paragraphs: [
          "Mildura is the largest population centre in the Sunraysia region and sits at the intersection of three states - Victoria, New South Wales, and South Australia. The city serves as the healthcare hub for a catchment that extends across Wentworth, Robinvale, Swan Hill, Ouyen, Red Cliffs, and into the South Australian Riverland. Despite being a substantial regional centre, Mildura faces some of the most acute GP access challenges in regional Victoria. The Modified Monash Model (MMM) classifies the entire Sunraysia region as a workforce priority area, and that classification has translated into persistent shortages on the ground.",
          "The region's geography is the underlying problem. Mildura is six hours by road from Melbourne and four from Adelaide. For GPs, it is one of the hardest regional postings to attract doctors to, and several practices in the city have closed their books to new patients. Bulk-billing has dropped below 60% - significantly lower than the Victorian average - and gap fees of $40–$70 are common. For a straightforward sick note, that economics is hard to justify.",
          "Mildura Base Public Hospital provides acute services, but its emergency department regularly handles non-urgent presentations when people cannot get GP appointments in time. An online medical-certificate request or eligible repeat-prescription review provides a focused alternative without using emergency resources.",
        ],
      },
      {
        title: "Horticulture, Seasonal Workers, and the Sunraysia Economy",
        paragraphs: [
          "Sunraysia is one of Australia's most productive horticultural regions - table grapes, wine grapes, citrus, almonds, stone fruit, and vegetables. The annual harvest season brings a huge influx of seasonal workers, including significant numbers of working-holiday visa holders and Pacific Australia Labour Mobility (PALM) scheme workers from Pacific island nations. Add this to the permanent workforce across packing sheds, wineries, transport operators, and processing facilities, and you get a heavily shift-based local labour market.",
          "Medical certificates for unplanned absences during harvest are a routine operational requirement. For workers without an established local GP, securing a same-day appointment during peak season is difficult. Adults aged 18+ can submit a medical-certificate request online, with a PDF sent only if the request is approved. Employers and labour hire providers apply their own evidence policies.",
          "The region's cross-border nature - Mildura in Victoria, Wentworth just across the Murray in NSW, and Renmark only a couple of hours away in SA - makes AHPRA's national registration framework relevant. InstantMed's listed services are available to eligible adults aged 18+ across those state borders, while employers and institutions set their own evidence policies.",
        ],
      },
      {
        title: "Students and Workers Under Victorian Law",
        paragraphs: [
          "La Trobe University's Mildura campus, Latrobe Rural Clinical School, and SuniTAFE serve thousands of regional students. Each sets its own policy for medical certificates used for academic support, missed assessment documentation, and coursework documentation. Adults aged 18+ should check current institution requirements before submitting a request.",
          `Mildura Rural City Council, Mildura Base Hospital, horticultural operations, wineries, and processors apply their own workplace evidence policies. ${MED_CERT_DOCUMENT_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
          `We never issue a certificate when the clinical situation is inappropriate for telehealth. If a physical examination is required, the doctor refers you to in-person care. The same suitability boundary applies in Mildura, Melbourne, and every other location we serve. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "What Telehealth Replaces - and What It Doesn't",
        paragraphs: [
          "Telehealth is not a substitute for your regular GP relationship. Chronic disease management, immunisations, screening, hands-on physical examinations, dressings, and injections still require face-to-face care. InstantMed provides focused online pathways for medical-certificate requests and eligible repeat-prescription reviews for a regular medicine already taken.",
          "Mildura's distance from major capital cities makes the in-person versus telehealth distinction especially valuable. Residents do not have the option of a quick alternative GP appointment in another suburb when their usual practice cannot fit them in. InstantMed lets eligible adults aged 18+ in Sunraysia submit those focused requests online and reserve in-person appointments for care that requires them.",
          `If a listed request is not appropriate for telehealth, the doctor will refer you to in-person care. The same suitability boundary applies on either side of the Murray. ${REFUND_PAYMENT_PROCESS}`,
        ],
      },
      {
        title: "Practical Cost and Time Comparison for Sunraysia",
        paragraphs: [
          "Mildura GP economics have moved in line with the broader regional trend. Bulk-billing has declined to one of the lowest rates in regional Victoria, gap fees of $40–$80 are common, and waiting times for non-urgent appointments have stretched to a week or more. For a working family in Robinvale, Wentworth, or Red Cliffs, the combined cost of a routine GP visit - fuel, gap fee, lost work time, the wait - frequently exceeds what telehealth charges flat.",
          "InstantMed's flat-fee model removes the unpredictability. You know what a medical-certificate request or repeat-prescription review costs before you start the intake. There are no gap fees and no surprise add-ons. For households budgeting tightly in a region where wages have not kept pace with cost of living, that predictability matters as much as the time saved.",
          "Requests can be submitted and reviewed 24/7. After review, an approved medical certificate is sent as a PDF; an eScript is sent only if a prescribing request is approved. The process stays online from intake to delivery. For Sunraysia residents, that avoids competing for a same-day clinic appointment for these focused requests.",
        ],
      },
    ],
    pharmacyInfo: {
      title: "Pharmacies and eScripts in Mildura",
      paragraphs: [
        "Mildura has pharmacy coverage across the CBD, Centro Mildura, Mildura Central, and Red Cliffs. Chemist Warehouse, Priceline, TerryWhite Chemmart, and independent pharmacies all accept eScripts. Pharmacies in surrounding Sunraysia and Murray-Mallee towns - Robinvale, Swan Hill, Ouyen, Wentworth, and the South Australian Riverland - also accept the QR code from an InstantMed prescription, regardless of which state issued it.",
        "Extended-hours options exist at Centro Mildura and Mildura Central. Standard PBS co-payments apply to telehealth-issued eScripts - no pricing difference at the counter compared to a face-to-face prescription.",
        "eScript adoption across Sunraysia and the broader Murray-Mallee is now universal. Every community pharmacy in the region handles the QR-code workflow as a matter of routine, with no need to phone ahead or make any special arrangement. The cross-border nature of the region is also worth noting - an eScript issued by an InstantMed doctor for a patient in Mildura works equally well at a pharmacy in Wentworth (NSW) or Renmark (SA), with no additional administrative steps and no state-line restrictions.",
      ],
    },
    telehealthRegulations: {
      title: "Telehealth Regulation in Victoria and the Cross-Border Murray",
      paragraphs: [
        "Victoria follows the national AHPRA and Medical Board of Australia framework for telehealth. AHPRA registration is national, which is particularly relevant in a cross-border region like Mildura. InstantMed's listed services are available to eligible adults aged 18+ in Victoria, NSW, and SA.",
        "Prescribing follows national TGA rules. InstantMed accepts eligible prescribing requests only through repeat-prescription reviews for a regular medicine the patient already takes and its named specialty assessment pathways. Every prescribing request requires an individual doctor review, and an eScript is sent only if approved. Schedule 8 controlled substances require state health authority and in-person assessment, and are not prescribed through InstantMed.",
        `The Health Complaints Commissioner Victoria handles complaints about health services in Victoria, including telehealth. InstantMed maintains a formal complaints process at complaints@instantmed.com.au. ${COMPLAINTS_TIMING}`,
      ],
    },
    additionalFaqs: [
      { q: "Does InstantMed cover Wentworth, Robinvale, and the Riverland?", a: `Yes. Eligible adults aged 18+ can submit a listed request from Wentworth, Robinvale, Red Cliffs, Ouyen, Swan Hill, and the SA Riverland. ${EMPLOYER_POLICY_CAVEAT}` },
      { q: "Can PALM scheme and working-holiday visa holders use InstantMed?", a: "Yes. Any resident 18+ currently in Australia can use InstantMed regardless of visa status. Certificates are subject to employer and labour-hire provider policies." },
      { q: "Can La Trobe Mildura students use InstantMed?", a: "Adults aged 18+ can submit a medical-certificate request. La Trobe sets its own policy for academic support, missed assessment documentation, and coursework documentation, so check current requirements before submitting." },
      { q: "Is InstantMed cheaper than a Mildura GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Mildura bulk-billing rates around 60% and typical gap fees of $40–$70, InstantMed is often more affordable for a straightforward medical-certificate request or eligible repeat-prescription review.` },
    ],
  },
}
