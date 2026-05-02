/**
 * State-level SEO data for /locations/state/[state] pages.
 *
 * Canonical URL pattern: /locations/state/<short-code>
 * - Short codes (nsw, vic, qld, wa, sa, tas, act, nt) used in URL
 *   for brevity and UX in the address bar.
 * - Full names (New South Wales, Victoria, etc.) used in meta title,
 *   h1, and body copy for SEO keyword relevance.
 *
 * State pages are "1-hop hubs" - they rank for head queries like
 * "online doctor new south wales" and link down to the specific city
 * pages in that state. Sibling of /locations/[city] but separated by
 * the fixed /state/ path segment to avoid routing collision.
 *
 * Each state page needs to be substantive (not a thin template) or
 * Google will classify it as duplicate content. Target: ~1,000 words
 * of unique state-specific content + city grid + FAQs.
 */

const CERT_REVIEW = "Doctor review"

export type StateSlug = "nsw" | "vic" | "qld" | "wa" | "sa" | "tas" | "act" | "nt"

export interface StateData {
  slug: StateSlug
  fullName: string
  shortName: string
  population: string
  capital: string
  /** Unique headline copy for the h1 - includes the full state name */
  heroHeadline: string
  /** One-paragraph intro below the h1 */
  heroSubtitle: string
  /** State-specific healthcare context for SEO depth (~200-300 words) */
  healthcareContext: string[]
  /** Key stats shown in the hero strip */
  stats: Array<{ label: string; value: string; context: string }>
  /** Common public holidays / workforce notes that influence med cert demand */
  localContext: Array<{ title: string; body: string }>
  /** City slugs in this state, ordered by population desc.
   *  Must match slugs in app/locations/[city]/page.tsx cities dict. */
  cities: string[]
  /** State-specific FAQs in addition to the default location FAQs */
  faqs: Array<{ q: string; a: string }>
}

export const statesData: Record<StateSlug, StateData> = {
  nsw: {
    slug: "nsw",
    fullName: "New South Wales",
    shortName: "NSW",
    population: "8.3 million",
    capital: "Sydney",
    heroHeadline: "Online doctor across New South Wales",
    heroSubtitle:
      "Medical certificates, repeat prescriptions, and consultations reviewed by AHPRA-registered doctors. Serving every NSW postcode from Sydney to the Riverina - no appointments, no waiting rooms.",
    healthcareContext: [
      "New South Wales has the largest population and the widest healthcare-access gap of any Australian state. Metropolitan Sydney alone spans 12,000 km² with healthcare availability varying dramatically between suburbs - the Eastern Suburbs and Lower North Shore have high GP density but low bulk-billing, while Western and Southwestern Sydney have growing populations outpacing clinic capacity. Even when bulk-billing is available in the west, same-day appointments are often impossible, particularly on Mondays and Fridays when demand peaks.",
      "Beyond Sydney, regional NSW faces a different set of pressures. Towns like Dubbo, Orange, Wagga Wagga, and the Mid North Coast have fewer GPs per capita than the national average, and locum coverage is inconsistent. For residents of these areas, a 'quick trip to the doctor' for a straightforward med cert or repeat script can mean a half-day round trip. Telehealth removes the distance barrier entirely - the same AHPRA-registered doctor reviews your request whether you're in Mosman or Moree.",
      "Sydney's shift-working population - hospitality, healthcare workers at RPA and Westmead, logistics staff in Western Sydney - rarely align with standard 9-5 clinic hours. After-hours medical centres exist but typically charge premium fees and have 2-3 hour waits. InstantMed's med-cert service accepts submissions 24/7 for doctor review, and prescription/consultation reviews run 8am-10pm AEST, seven days a week.",
    ],
    stats: [
      { label: "Population", value: "8.3M", context: "Largest Australian state" },
      { label: "Cities served", value: "13+", context: "Sydney to Wagga Wagga" },
      { label: "Med cert pathway", value: CERT_REVIEW, context: "24/7 submission" },
      { label: "Bulk-billing rate", value: "~69%", context: "Below national average in metro Sydney" },
    ],
    localContext: [
      {
        title: "NSW public holidays & leave documentation",
        body: "Under the Fair Work Act and NSW employment law, employers can request medical evidence for sick leave. NSW-issued certificates from AHPRA-registered telehealth doctors meet the same evidentiary standard as in-person consultations. They include the doctor's name, provider number, dates of illness, and signature - valid for work, study, carer's leave, and Centrelink reporting.",
      },
      {
        title: "University & TAFE certificates",
        body: "Major NSW institutions - UNSW, USYD, UTS, Macquarie, Newcastle, Wollongong, Western Sydney, Charles Sturt - all assess telehealth medical certificates under their own policies for academic support requests and absence documentation. The certificate covers the medical condition and affected dates without disclosing diagnosis details unless the student requests disclosure.",
      },
      {
        title: "Regional NSW access gaps",
        body: "Modified Monash Model (MMM) categories 3-6 cover most regional NSW, where GP access is 30-60% lower than metro areas per 10,000 people. Telehealth is explicitly endorsed by RACGP as an appropriate alternative for straightforward conditions in these areas - our doctors follow the same clinical protocols regardless of your postcode.",
      },
    ],
    cities: [
      "sydney",
      "parramatta",
      "central-coast",
      "newcastle",
      "wollongong",
      "penrith",
      "coffs-harbour",
      "port-macquarie",
      "wagga-wagga",
      "orange",
      "dubbo",
      "bondi-beach",
      "albury-wodonga",
    ],
    faqs: [
      {
        q: "Is InstantMed available in regional NSW?",
        a: "Yes. Our service covers every NSW postcode with no geographic restrictions. Whether you're in Sydney, the Central Coast, Newcastle, or out in Dubbo, Orange, or Wagga Wagga, you can access AHPRA-registered doctors at the same cost and with the same turnaround time.",
      },
      {
        q: "Are NSW medical certificates subject to employer and institution policy?",
        a: "Yes. NSW medical certificates from AHPRA-registered telehealth doctors meet Fair Work Act requirements and are reviewed under NSW employer, public-sector, health-service, and university policies.",
      },
      {
        q: "Do you offer NSW-specific prescriptions or state-based scripts?",
        a: "Prescriptions are federally regulated under the Commonwealth Therapeutic Goods Act, not state-based. An eScript issued by an AHPRA-registered doctor is valid at any pharmacy across NSW and the rest of Australia.",
      },
    ],
  },

  vic: {
    slug: "vic",
    fullName: "Victoria",
    shortName: "VIC",
    population: "6.9 million",
    capital: "Melbourne",
    heroHeadline: "Online doctor across Victoria",
    heroSubtitle:
      "Medical certificates and prescriptions reviewed by AHPRA-registered doctors. Serving all Victorian postcodes from Melbourne to Mildura, with evening and weekend availability.",
    healthcareContext: [
      "Victoria has the second-largest Australian population and faces a distinct set of healthcare-access challenges compared to NSW. Melbourne's CBD and inner suburbs have high clinic density but persistently high gap fees - bulk-billing in the Melbourne CBD has dropped below 55% in recent years, one of the lowest rates in Australia. Outer Melbourne (Werribee, Cranbourne, Pakenham, Craigieburn) has the opposite problem: bulk-billing is more available but appointment wait times frequently stretch to 7-10 days for non-urgent visits.",
      "Regional Victoria is served by a mix of rural health networks and private clinics, but locum coverage has been a persistent issue since the 2022 GP workforce shortage. Towns like Mildura, Shepparton, Ballarat, and Bendigo often rely on rotating locum GPs, which creates continuity-of-care gaps for patients on repeat medications. For a straightforward prescription repeat on stable medication, telehealth removes the need to book, travel, and wait - you interact with an AHPRA-registered doctor who reviews your medication history and issues an eScript directly to your phone.",
      "Melbourne's hospitality and creative industries have irregular schedules that don't fit standard clinic hours. A bartender in Brunswick, a nurse at The Alfred, a warehouse worker in Dandenong - all of them have asked the same question: 'Why does getting a med cert for the flu require a 9am appointment?' It doesn't. InstantMed's flow runs on your time, not the clinic's.",
    ],
    stats: [
      { label: "Population", value: "6.9M", context: "Second-largest Australian state" },
      { label: "Cities served", value: "6+", context: "Melbourne to Mildura" },
      { label: "Melbourne CBD bulk-billing", value: "~55%", context: "Among the lowest in Australia" },
      { label: "Med cert pathway", value: CERT_REVIEW, context: "24/7 submission" },
    ],
    localContext: [
      {
        title: "Victoria employment & sick leave law",
        body: "Victoria follows the national Fair Work Act for employer-side sick leave documentation. Telehealth certificates from AHPRA-registered doctors are reviewed under Victorian public-sector and private employer policies. For WorkCover matters, an in-person assessment is required - InstantMed does not issue WorkCover certificates.",
      },
      {
        title: "University of Melbourne & Monash acceptance",
        body: "The University of Melbourne, Monash, RMIT, Deakin, La Trobe, Swinburne, and Victoria University all assess telehealth medical certificates under their own policies for academic support requests, academic support requests, and absence documentation. The certificate meets their requirement for a 'medical practitioner' - no distinction is made between telehealth and in-person certificates.",
      },
      {
        title: "Regional Victoria locum gaps",
        body: "Modified Monash Model categories 4-6 cover most of regional Victoria. The 2022-2024 GP workforce report flagged particular gaps in Loddon-Mallee, Goulburn-Hume, and the Wimmera regions - areas served by Mildura, Shepparton, and Horsham respectively. Telehealth is not a replacement for a regular GP relationship in these areas, but it's a reliable option for straightforward acute needs and medication repeats.",
      },
    ],
    cities: ["melbourne", "geelong", "ballarat", "bendigo", "shepparton", "mildura"],
    faqs: [
      {
        q: "Does InstantMed work for regional Victoria?",
        a: "Yes. Every Victorian postcode - metropolitan Melbourne, Geelong, Ballarat, Bendigo, Shepparton, Mildura, and everywhere in between - has access to the same AHPRA-registered doctors with the same turnaround times. There are no geographic restrictions.",
      },
      {
        q: "Are Victorian telehealth certificates valid for Centrelink?",
        a: "Yes. Telehealth certificates from AHPRA-registered doctors meet Services Australia requirements for Centrelink medical evidence, including JobSeeker, DSP, and Carer Payment reporting. The certificate will include the doctor's name, provider number, and clinical assessment.",
      },
      {
        q: "Can I use InstantMed for my Monash or UniMelb academic support request?",
        a: "Yes. Monash, the University of Melbourne, and all other major Victorian universities assess telehealth medical certificates under their own policies. When you request your certificate, let us know the reason is 'study / university' and we'll format it appropriately for academic use.",
      },
    ],
  },

  qld: {
    slug: "qld",
    fullName: "Queensland",
    shortName: "QLD",
    population: "5.5 million",
    capital: "Brisbane",
    heroHeadline: "Online doctor across Queensland",
    heroSubtitle:
      "Telehealth medical certificates and prescriptions for Queensland residents. From Brisbane to Cairns, reviewed by AHPRA-registered doctors - doctor review, no driving.",
    healthcareContext: [
      "Queensland's geography makes it the poster child for Australian telehealth. The state covers 1.85 million km² - more than seven times the size of the UK - with population clusters along the coast and sparse inland communities. A resident of Mount Isa is closer to Darwin than to Brisbane. Regional Queenslanders have some of the highest telehealth adoption rates in the country, and for good reason: the alternative is often a 2-4 hour drive or a flight to the nearest GP with availability.",
      "The Southeast corner - Brisbane, Gold Coast, Sunshine Coast, Ipswich, Toowoomba - has decent GP density but among the longest appointment wait times in Australia. Brisbane's northside and the Sunshine Coast have been growing faster than clinic capacity since 2020, pushing non-urgent wait times to 5-10 days. For FIFO workers, shift workers at the Brisbane Airport precinct, or anyone managing a busy schedule, the friction of a traditional GP visit for a straightforward med cert or prescription repeat is often untenable.",
      "Far North Queensland and the tropics present unique medical considerations - stinger season, dengue awareness, tropical ulcer management - that InstantMed's doctors are trained for. Our prescribing follows TGA guidelines and we maintain the same Schedule 8 blocks as any other telehealth provider, but for straightforward repeat scripts on stable medication, the Cairns-to-Townsville corridor can access an AHPRA-registered doctor online regardless of wet season flooding.",
    ],
    stats: [
      { label: "Population", value: "5.5M", context: "Third-largest Australian state" },
      { label: "Cities served", value: "12+", context: "Brisbane to Cairns" },
      { label: "Area covered", value: "1.85M km²", context: "Spread across coast, inland, FNQ" },
      { label: "Med cert pathway", value: CERT_REVIEW, context: "24/7 submission" },
    ],
    localContext: [
      {
        title: "Queensland employment documentation",
        body: "QLD follows federal Fair Work Act rules for sick leave evidence. Telehealth certificates from AHPRA-registered doctors are reviewed under Queensland public-sector, mining, and private employer policies. WorkCover Queensland requires in-person assessment - we do not issue WorkCover certificates.",
      },
      {
        title: "University of Queensland, QUT, Griffith acceptance",
        body: "UQ, QUT, Griffith, James Cook University, CQU, USC, and Bond University all assess telehealth medical certificates under their own policies for academic support requests and absence documentation. James Cook and CQU have explicit telehealth-friendly policies for students in rural and remote placements across North Queensland.",
      },
      {
        title: "FIFO, DIDO & mining industry context",
        body: "Queensland's resources sector employs hundreds of thousands of FIFO (fly-in-fly-out) and DIDO (drive-in-drive-out) workers on rotational schedules. For these workers, accessing a regular GP is often impossible during on-site rotations. InstantMed is commonly used for repeat scripts, post-incident medical certificates, and routine consults during residential rotations at home.",
      },
    ],
    cities: [
      "brisbane",
      "gold-coast",
      "sunshine-coast",
      "townsville",
      "cairns",
      "ipswich",
      "toowoomba",
      "mackay",
      "rockhampton",
      "bundaberg",
      "hervey-bay",
      "gladstone",
    ],
    faqs: [
      {
        q: "Is InstantMed available in Far North Queensland and regional QLD?",
        a: "Yes. From Brisbane to Cairns, Mount Isa to Coolangatta, every Queensland postcode has access. FNQ residents often find telehealth more practical than local GP access during wet season or in remote communities.",
      },
      {
        q: "Can I get a medical certificate for FIFO / mining rotation absence?",
        a: "Yes, where clinically appropriate. Our doctors can issue certificates for legitimate illnesses that prevent you from working a mining rotation. Note: we don't handle fitness-to-work clearances or fit-for-duty assessments required by some mining operators - those require in-person or company-specific medical examinations.",
      },
      {
        q: "Does the Queensland Health Pharmacy accept eScripts from InstantMed?",
        a: "eScripts are federally regulated and valid at any Australian pharmacy, including Queensland Health pharmacies, Chemist Warehouse, Priceline, TerryWhite, and independent community pharmacies. You'll receive an SMS token that any pharmacist scans to dispense your medication.",
      },
    ],
  },

  wa: {
    slug: "wa",
    fullName: "Western Australia",
    shortName: "WA",
    population: "2.8 million",
    capital: "Perth",
    heroHeadline: "Online doctor across Western Australia",
    heroSubtitle:
      "Telehealth medical certificates and prescriptions for WA residents. Perth to Broome, Bunbury to Karratha - the same AHPRA-registered doctor, wherever you are in the state.",
    healthcareContext: [
      "Western Australia is larger than Western Europe - 2.6 million km² - with 90% of the population concentrated in the southwest corner around Perth. For residents outside metropolitan Perth, healthcare access is defined by distance. A Broome local needing a repeat prescription has a 2,200 km drive to the nearest major GP centre in Perth. Telehealth is not a convenience for WA regional residents - it's often the only practical option.",
      "Even within metropolitan Perth, WA has unique access pressures. The East-West time difference (3 hours behind the eastern states) means Perth residents often can't reach eastern-state telehealth providers during local business hours - providers closing at 5pm AEST are actually closing at 2pm WA time. InstantMed's prescription and consultation service runs 8am-10pm AEST which translates to 5am-7pm WA time, with med certs available 24/7.",
      "WA's mining sector and offshore oil & gas workforce is substantial - FIFO workers commuting between Perth and the Pilbara, Kimberley, or Goldfields represent tens of thousands of residents. These workers are rarely at home during standard business hours, and their home postcodes (often Perth southern/northern suburbs) face significant GP access pressure. Telehealth consultations fit the FIFO lifestyle in a way traditional clinics cannot.",
    ],
    stats: [
      { label: "Population", value: "2.8M", context: "Largest state by area" },
      { label: "Cities served", value: "3+", context: "Perth, Fremantle, Bunbury, + regional" },
      { label: "Time zone", value: "AWST (-3h)", context: "3 hours behind AEDT" },
      { label: "Area covered", value: "2.6M km²", context: "Larger than Western Europe" },
    ],
    localContext: [
      {
        title: "WA time zone & service hours",
        body: "Perth runs on Australian Western Standard Time (AWST), 3 hours behind Sydney/Melbourne/Brisbane. Our med cert service is 24/7 so time zone is irrelevant. Prescription and consultation reviews run 8am-10pm AEST which converts to 5am-7pm AWST - so Perth residents can request a script from early morning through to mid-evening local time.",
      },
      {
        title: "WA mining & resources sector",
        body: "WA's mining sector (iron ore, gold, lithium, LNG) employs a large FIFO workforce based out of Perth. Telehealth is widely used by these workers for repeat scripts between rotations and for med certs covering acute illness on residential rest weeks. We can't issue fitness-to-work clearances or site-specific fit-for-duty medical assessments - those require in-person examination.",
      },
      {
        title: "Regional WA access pressure",
        body: "The Pilbara, Kimberley, Mid West, and Goldfields regions have the lowest GP density in Australia. Modified Monash Model categories 5-7 cover most regional WA, with visits from rotating locum GPs being the norm rather than continuity-of-care. Telehealth is endorsed by the RACGP Rural Faculty as an appropriate alternative for straightforward conditions in these regions.",
      },
    ],
    cities: ["perth", "fremantle", "bunbury"],
    faqs: [
      {
        q: "Does InstantMed work in remote WA - Broome, Karratha, Kalgoorlie, Geraldton?",
        a: "Yes. Every WA postcode has access with no geographic restrictions. For residents of the Kimberley, Pilbara, Mid West, and Goldfields, telehealth is often the most practical way to access an AHPRA-registered doctor for straightforward needs.",
      },
      {
        q: "Is there a WA-specific pharmacy network?",
        a: "eScripts are federally regulated and valid at any Australian pharmacy. In WA, Chemist Warehouse, Priceline, TerryWhite, and the WA Country Health Service pharmacies all accept eScripts from telehealth doctors. You'll receive an SMS token that any pharmacist can scan.",
      },
      {
        q: "Can I use the service during the WA time difference from the east?",
        a: "Yes. Med certs are 24/7. Prescription/consultation reviews run 8am-10pm AEST which is 5am-7pm AWST (early morning through to mid-evening Perth time). You can submit a request outside these hours and it will be queued for morning review.",
      },
    ],
  },

  sa: {
    slug: "sa",
    fullName: "South Australia",
    shortName: "SA",
    population: "1.8 million",
    capital: "Adelaide",
    heroHeadline: "Online doctor across South Australia",
    heroSubtitle:
      "Medical certificates and prescriptions for South Australians. Adelaide, the Limestone Coast, Outback SA - reviewed by AHPRA-registered doctors in minutes.",
    healthcareContext: [
      "South Australia is geographically vast - 984,000 km² - but with a relatively small population concentrated in Adelaide and along the coast. Like WA, distance is the defining feature of healthcare access outside the capital. A resident of Coober Pedy or Ceduna has limited options for a same-day GP visit, and the alternative is often a day-long drive to Adelaide or Port Augusta.",
      "Adelaide itself has comparatively good GP access by Australian standards - higher bulk-billing rates than Melbourne or Sydney CBDs, shorter average wait times for non-urgent appointments. Where Adelaide residents commonly use telehealth is for convenience and scheduling flexibility rather than access pressure. The CBD, North Adelaide, and inner suburbs have GPs available, but fitting a visit around work, childcare, or university commitments is the same friction as any other capital city.",
      "Regional SA - particularly the Limestone Coast (Mount Gambier region), the Eyre Peninsula (Port Augusta, Whyalla, Port Lincoln), and Outback communities - has the most pronounced access gaps. Rural health networks rely heavily on locum GPs, and continuity of care is inconsistent. For straightforward repeat scripts on stable medication, telehealth is often the path of least resistance - the same AHPRA-registered doctor reviews requests from Adelaide and from Coober Pedy with no difference in service level.",
    ],
    stats: [
      { label: "Population", value: "1.8M", context: "75% in metro Adelaide" },
      { label: "Cities served", value: "3+", context: "Adelaide, Mt Gambier, Port Augusta" },
      { label: "Area covered", value: "984,000 km²", context: "Includes remote Outback communities" },
      { label: "Med cert pathway", value: CERT_REVIEW, context: "24/7 submission" },
    ],
    localContext: [
      {
        title: "SA employment sick leave documentation",
        body: "South Australia follows federal Fair Work Act requirements for sick leave evidence. Telehealth certificates from AHPRA-registered doctors are reviewed under SA public-sector and private employer policies. Certificates include doctor name, provider number, dates of illness, and signature - meeting the same evidentiary standard as in-person consultations.",
      },
      {
        title: "University of Adelaide, Flinders, UniSA acceptance",
        body: "The University of Adelaide, Flinders University, UniSA, and Torrens University all assess telehealth medical certificates under their own policies for academic support requests, academic support requests, and absence documentation. No distinction is made between telehealth and in-person practitioners.",
      },
      {
        title: "Outback SA & Eyre Peninsula",
        body: "MMM categories 5-7 cover most of Outback SA and the Eyre Peninsula. These areas have among the lowest GP density in Australia. The Royal Flying Doctor Service handles emergency and acute complex cases; InstantMed handles straightforward med certs and prescription repeats - complementary rather than competing services.",
      },
    ],
    cities: ["adelaide", "mount-gambier", "port-augusta"],
    faqs: [
      {
        q: "Does InstantMed work in Outback SA and regional communities?",
        a: "Yes. Every SA postcode has access with no geographic restrictions. Remote communities on the Eyre Peninsula, in the Far North, and Limestone Coast can access AHPRA-registered doctors for the same price and with the same turnaround as Adelaide residents.",
      },
      {
        q: "Is a telehealth cert valid for a Flinders or UniAdelaide academic support request?",
        a: "Yes. All major SA universities assess telehealth medical certificates under their own policies from AHPRA-registered doctors. When requesting your certificate, mention the reason is 'study / university' so we can format it appropriately.",
      },
      {
        q: "Can I get an SA prescription filled at any pharmacy?",
        a: "Yes. eScripts are federally regulated and valid at every Australian pharmacy, including all SA pharmacies - Chemist Warehouse, Priceline, TerryWhite, independent community pharmacies, and SA Health hospital outpatient pharmacies.",
      },
    ],
  },

  tas: {
    slug: "tas",
    fullName: "Tasmania",
    shortName: "TAS",
    population: "570,000",
    capital: "Hobart",
    heroHeadline: "Online doctor across Tasmania",
    heroSubtitle:
      "Telehealth medical certificates and prescriptions for Tasmanian residents. Hobart, Launceston, Devonport, and the West Coast - same AHPRA-registered doctors, wherever you are on the island.",
    healthcareContext: [
      "Tasmania has the most acute GP shortage of any Australian state. The 2023 RACGP Rural Medicine Workforce Report found that Tasmania has fewer GPs per 100,000 residents than any other state, and the trend has worsened since 2019. Average wait times for a new-patient GP appointment in Hobart exceed 6 weeks in 2026, and several bulk-billing clinics across the state have closed their books entirely.",
      "This access pressure disproportionately affects Tasmanians who need straightforward services: a repeat script, a med cert for the flu, a consultation about persistent back pain. For these everyday needs, the alternative to telehealth is often weeks of waiting or a 1-2 hour drive to a different town. Telehealth has become not a convenience but a practical necessity for many Tasmanians - a trend confirmed by Tasmania's adoption rates, which rank among the highest in Australia.",
      "Tasmania's seasonal industries - tourism, agriculture, forestry - create a shift-working population whose schedules don't align with standard clinic hours. Add in the state's ferry-dependent transport (for King Island and Flinders Island residents) and the case for accessible telehealth becomes even clearer. InstantMed serves every Tasmanian postcode with the same AHPRA-registered doctors and same turnaround times regardless of location.",
    ],
    stats: [
      { label: "Population", value: "570K", context: "Smallest mainland state" },
      { label: "Cities served", value: "2+", context: "Hobart, Launceston + regional" },
      { label: "New-patient GP wait", value: "6+ weeks", context: "Highest in Australia (2026)" },
      { label: "Med cert pathway", value: CERT_REVIEW, context: "24/7 submission" },
    ],
    localContext: [
      {
        title: "Tasmania's GP workforce shortage",
        body: "Tasmania has the lowest GP density in Australia per 2023 AIHW workforce data. Several bulk-billing practices in Hobart and Launceston have closed their books to new patients. This makes telehealth a particularly valuable option for Tasmanians who can't secure a GP appointment locally for straightforward needs.",
      },
      {
        title: "University of Tasmania documentation",
        body: "The University of Tasmania (UTAS) sets its own policy for medical certificates used in academic support requests and absence documentation. Students should check the relevant campus or faculty requirements before submitting a certificate.",
      },
      {
        title: "West Coast & Bass Strait islands",
        body: "Residents of the West Coast (Queenstown, Zeehan, Strahan) and the Bass Strait islands (King Island, Flinders Island) face significant travel times to any urban GP. Telehealth removes the logistical burden of air or ferry travel for routine medical needs. We do not handle situations requiring in-person examination - these still require travel or local GP access.",
      },
    ],
    cities: ["hobart", "launceston"],
    faqs: [
      {
        q: "Is telehealth a practical option given Tasmania's GP shortage?",
        a: "Yes - it's specifically helpful in Tasmania because of the GP shortage. Our service isn't a replacement for a regular GP relationship for complex conditions, but for straightforward med certs and repeat scripts, it removes the wait time entirely.",
      },
      {
        q: "Can Tasmanian employers use telehealth certificates as evidence?",
        a: "Yes. Telehealth certificates from AHPRA-registered doctors meet Fair Work Act requirements and are reviewed under Tasmanian public-sector and private employer policies.",
      },
      {
        q: "Can I use the service from King Island or Flinders Island?",
        a: "Yes. Every Tasmanian postcode has access, including King Island and Flinders Island. eScripts are valid at any Australian pharmacy including pharmacies in these remote communities, though availability of specific medications should be checked with your local pharmacy in advance.",
      },
    ],
  },

  act: {
    slug: "act",
    fullName: "Australian Capital Territory",
    shortName: "ACT",
    population: "460,000",
    capital: "Canberra",
    heroHeadline: "Online doctor in the ACT",
    heroSubtitle:
      "Telehealth medical certificates, prescriptions, and consultations for Canberra and the ACT. Reviewed by AHPRA-registered doctors - faster than waiting for a bulk-billing appointment at your local clinic.",
    healthcareContext: [
      "The Australian Capital Territory has one of the best-educated populations in Australia and correspondingly high expectations of healthcare. Canberra's GP supply has historically been stable, but the post-2020 period has seen a sharp decline in bulk-billing availability - the ACT now has one of the lowest bulk-billing rates in the country, with most GP visits in Canberra carrying a $35-90 gap fee. For straightforward med certs and repeat scripts, many Canberrans find the total cost of a traditional GP visit (time off work + gap fee) higher than a $19.95 telehealth certificate.",
      "The ACT's workforce is heavily weighted toward APS (Australian Public Service) roles, which have specific sick-leave documentation requirements that telehealth certificates meet. Universities - ANU, UC, ACU Canberra campus - all assess telehealth medical certificates under their own policies for academic support requests. For Canberrans juggling APS work schedules, university commitments, or family life in a city with minimal public transport, the scheduling flexibility of telehealth is the key advantage.",
      "ACT residents occasionally use NSW GPs for appointments when local availability is tight, particularly in Queanbeyan and Southern Highlands regions. InstantMed works the same way whether you're in Belconnen, Tuggeranong, Gungahlin, or the town centre - same doctors, same turnaround, valid across both ACT and NSW jurisdictions.",
    ],
    stats: [
      { label: "Population", value: "460K", context: "Smallest Australian state/territory" },
      { label: "Cities served", value: "1", context: "Canberra (ACT is one city-state)" },
      { label: "Bulk-billing rate", value: "~42%", context: "Among the lowest in Australia" },
      { label: "Med cert pathway", value: CERT_REVIEW, context: "24/7 submission" },
    ],
    localContext: [
      {
        title: "APS (Australian Public Service) sick leave",
        body: "APS employees across all Commonwealth departments assess telehealth medical certificates under their own policies from AHPRA-registered doctors. The APS Commission recognises telehealth consultations under the Public Service Act for sick leave evidence purposes. ADF (Defence) personnel have separate medical documentation requirements and should consult their medical chain of command.",
      },
      {
        title: "ANU, UC, ACU acceptance",
        body: "The Australian National University (ANU), University of Canberra (UC), and Australian Catholic University Canberra campus all assess telehealth medical certificates under their own policies for academic support requests, academic support, and absence documentation. No distinction is made between telehealth and in-person medical practitioners under ANU/UC academic policy.",
      },
      {
        title: "ACT/NSW border & cross-jurisdiction",
        body: "ACT residents sometimes travel to nearby NSW localities (Queanbeyan, Yass, Bungendore) for services. Telehealth removes this geographic friction entirely - an InstantMed certificate is valid across both ACT and NSW jurisdictions. eScripts are federally regulated and valid at any pharmacy in either location.",
      },
    ],
    cities: ["canberra"],
    faqs: [
      {
        q: "Is my APS employer likely to accept a telehealth medical certificate?",
        a: "Yes. APS employers across Commonwealth departments set their own evidence policies for telehealth certificates from AHPRA-registered doctors. The Public Service Act and the APS Commission's leave evidence requirements explicitly recognise telehealth consultations. Our certificates include the doctor's name, provider number, dates of illness, and signature - all required fields.",
      },
      {
        q: "Can I use this service for an ANU academic support request?",
        a: "Yes. ANU sets its own policy for telehealth medical certificates used in academic support requests. When requesting your certificate, let us know it's for university use and we'll format it appropriately. The certificate meets ANU's 'medical practitioner' requirement.",
      },
      {
        q: "Does the service cover both ACT and nearby NSW (Queanbeyan, Yass)?",
        a: "Yes. There are no geographic restrictions - we cover every Australian postcode including NSW localities adjacent to the ACT. If you live in Canberra but work in Queanbeyan, the same certificate works for both jurisdictions.",
      },
    ],
  },

  nt: {
    slug: "nt",
    fullName: "Northern Territory",
    shortName: "NT",
    population: "250,000",
    capital: "Darwin",
    heroHeadline: "Online doctor across the Northern Territory",
    heroSubtitle:
      "Telehealth medical certificates and prescriptions for NT residents. Darwin, Alice Springs, Katherine, and remote communities - AHPRA-registered doctors serving the Top End and the Red Centre.",
    healthcareContext: [
      "The Northern Territory has the most challenging healthcare-access environment in Australia. With 250,000 people spread across 1.4 million km², many NT residents live hundreds of kilometres from the nearest GP. The Royal Flying Doctor Service, the NT Department of Health, and Aboriginal Community Controlled Health Organisations (ACCHOs) form the backbone of rural and remote healthcare - InstantMed is a complement, not a replacement, for these services.",
      "Darwin and Alice Springs are the primary population centres. Darwin faces persistent GP workforce gaps - the tropical climate, distance from other capitals, and specific workforce pressures have made it one of the hardest places in Australia to secure a same-day GP appointment. For straightforward med certs and repeat scripts, telehealth is often the only practical same-day option. Alice Springs has a smaller but similarly stretched GP workforce.",
      "Remote NT communities are served by a combination of ACCHOs, remote area nurses (RANs), and periodic GP visits via the Outback Stores and District Medical Officer networks. These services handle clinically complex and continuity-of-care needs. For straightforward repeat scripts on stable medication or acute med certs for community members with reliable internet access, telehealth fills a specific gap without disrupting existing primary care relationships.",
    ],
    stats: [
      { label: "Population", value: "250K", context: "Smallest Australian jurisdiction" },
      { label: "Cities served", value: "2+", context: "Darwin, Alice Springs + remote" },
      { label: "Area covered", value: "1.4M km²", context: "Largest per-capita area" },
      { label: "Med cert pathway", value: CERT_REVIEW, context: "24/7 submission" },
    ],
    localContext: [
      {
        title: "NT healthcare network",
        body: "The NT healthcare system is layered: hospitals in Darwin and Alice Springs for acute care, Aboriginal Community Controlled Health Organisations (ACCHOs) for primary care in Indigenous communities, remote area nurses (RANs) in small communities, and periodic visiting GP clinics. InstantMed is complementary - we handle straightforward med certs and prescription repeats for community members with internet access, while complex clinical needs remain with established local providers.",
      },
      {
        title: "Charles Darwin University acceptance",
        body: "Charles Darwin University (CDU) and CDU's Batchelor Institute partners assess telehealth medical certificates under their own policies for academic support requests and absence documentation. CDU has campuses across the NT including Darwin, Casuarina, Palmerston, Alice Springs, and Katherine - telehealth is particularly relevant for students at the smaller regional campuses.",
      },
      {
        title: "Top End & Red Centre access",
        body: "The Top End (Darwin, Palmerston, Katherine, Nhulunbuy) and Red Centre (Alice Springs, Tennant Creek) have different healthcare access profiles. Both regions face GP shortages, but the Red Centre has greater distances between population centres. Telehealth works the same in both - the same AHPRA-registered doctors, same turnaround, regardless of your NT postcode.",
      },
    ],
    cities: ["darwin", "alice-springs"],
    faqs: [
      {
        q: "Is InstantMed an appropriate service for remote NT communities?",
        a: "For straightforward needs (med certs, repeat scripts on stable medication), yes. We're not a replacement for ACCHOs, remote area nurses, or the Royal Flying Doctor Service - these remain your primary care providers for complex needs. Telehealth works alongside them for specific, straightforward requests.",
      },
      {
        q: "Can I get a certificate from Darwin or Alice Springs in wet season?",
        a: "Yes. The service runs 24/7 with no weather-related disruptions - our doctors are not travelling to you, they're reviewing your request remotely. Wet season conditions that would prevent travel to a local clinic have no impact on telehealth service.",
      },
      {
        q: "Will my NT employer accept a telehealth medical certificate?",
        a: "Yes. Certificates from AHPRA-registered doctors meet Fair Work Act requirements and are reviewed under NT public-sector and private employer policies. They meet the same standard as in-person certificates.",
      },
    ],
  },
}

export function getStateBySlug(slug: string): StateData | undefined {
  return statesData[slug as StateSlug]
}

export function getAllStateSlugs(): StateSlug[] {
  return Object.keys(statesData) as StateSlug[]
}
