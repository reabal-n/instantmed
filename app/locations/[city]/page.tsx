import { Navbar } from "@/components/shared/navbar"
import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, Clock, Shield, Star, CheckCircle2, HelpCircle } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { PRICING_DISPLAY } from "@/lib/constants"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

// Geo coordinates for each city (latitude, longitude)
const GEO_COORDS: Record<string, { lat: string; lng: string }> = {
  sydney: { lat: "-33.8688", lng: "151.2093" },
  melbourne: { lat: "-37.8136", lng: "144.9631" },
  brisbane: { lat: "-27.4705", lng: "153.0260" },
  perth: { lat: "-31.9514", lng: "115.8617" },
  adelaide: { lat: "-34.9285", lng: "138.6007" },
  "gold-coast": { lat: "-28.0167", lng: "153.4000" },
  canberra: { lat: "-35.2802", lng: "149.1310" },
  newcastle: { lat: "-32.9283", lng: "151.7817" },
  hobart: { lat: "-42.8821", lng: "147.3272" },
  darwin: { lat: "-12.4634", lng: "130.8456" },
  "sunshine-coast": { lat: "-26.6500", lng: "153.0667" },
  wollongong: { lat: "-34.4248", lng: "150.8931" },
  geelong: { lat: "-38.1499", lng: "144.3617" },
  townsville: { lat: "-19.2590", lng: "146.8169" },
  cairns: { lat: "-16.9186", lng: "145.7781" },
  toowoomba: { lat: "-27.5598", lng: "151.9507" },
  ballarat: { lat: "-37.5622", lng: "143.8503" },
  bendigo: { lat: "-36.7570", lng: "144.2794" },
  launceston: { lat: "-41.4332", lng: "147.1441" },
  mackay: { lat: "-21.1411", lng: "149.1861" },
  rockhampton: { lat: "-23.3791", lng: "150.5100" },
  bunbury: { lat: "-33.3271", lng: "115.6414" },
  "wagga-wagga": { lat: "-35.1082", lng: "147.3598" },
  "albury-wodonga": { lat: "-36.0737", lng: "146.9135" },
  "hervey-bay": { lat: "-25.2882", lng: "152.8531" },
  parramatta: { lat: "-33.8150", lng: "151.0010" },
  "bondi-beach": { lat: "-33.8915", lng: "151.2767" },
  fremantle: { lat: "-32.0569", lng: "115.7439" },
  "central-coast": { lat: "-33.3075", lng: "151.4244" },
  penrith: { lat: "-33.7514", lng: "150.6944" },
  ipswich: { lat: "-27.6144", lng: "152.7578" },
  "port-macquarie": { lat: "-31.4333", lng: "152.9000" },
  "coffs-harbour": { lat: "-30.2963", lng: "153.1135" },
  orange: { lat: "-33.2839", lng: "149.1003" },
  dubbo: { lat: "-32.2430", lng: "148.6048" },
  mildura: { lat: "-34.1856", lng: "142.1625" },
  shepparton: { lat: "-36.3833", lng: "145.4000" },
  gladstone: { lat: "-23.8485", lng: "151.2578" },
  bundaberg: { lat: "-24.8661", lng: "152.3489" },
  "mount-gambier": { lat: "-37.8292", lng: "140.7831" },
  "port-augusta": { lat: "-32.4930", lng: "137.7728" },
  "alice-springs": { lat: "-23.6980", lng: "133.8807" },
}

// City-specific content paragraphs for unique SEO value
const CITY_CONTENT: Record<string, string[]> = {
  sydney: [
    "Sydney residents can skip crowded CBD clinics and long waits at bulk-billing practices. Whether you're in the Eastern Suburbs, Inner West, or out in Parramatta, InstantMed connects you with an AHPRA-registered doctor from anywhere with phone signal.",
    "Sydney has some of the longest GP wait times in Australia — averaging 3-5 days for a non-urgent appointment in many suburbs, and same-day availability is increasingly rare, especially at bulk-billing practices. For straightforward needs like medical certificates or repeat prescriptions, waiting days for a clinic appointment is unnecessary.",
    "Our service covers all of Greater Sydney, from the Northern Beaches to Campbelltown, Penrith to Bondi. No matter which suburb you're in, you'll receive the same quality of care from Australian-registered doctors. Certificates and eScripts are valid at any employer or pharmacy in NSW.",
  ],
  melbourne: [
    "From Brunswick to Brighton, Melbourne's notoriously long doctor wait times are a thing of the past. InstantMed lets you see a doctor without braving the weather or the traffic — perfect for those days when you really can't leave the house.",
    "Melbourne's GP shortage is well-documented: many inner-city clinics have week-long waits, and after-hours options often mean expensive emergency departments or overcrowded medical centres. Telehealth fills the gap for non-urgent needs that still require a doctor's assessment.",
    "We serve all of Greater Melbourne and regional Victoria. Whether you're in the CBD, the western suburbs, the Mornington Peninsula, or the Yarra Valley, you can access the same AHPRA-registered doctors and receive certificates and eScripts accepted anywhere in Australia.",
  ],
  brisbane: [
    "Brisbane's growing population means longer doctor wait times across the city. From the CBD to the suburbs, InstantMed gives you access to Australian-registered doctors without the queue — even during school holidays and peak flu season.",
    "South-East Queensland's rapid population growth has stretched GP availability, particularly in newer suburbs where healthcare infrastructure hasn't kept pace. For residents in areas like Springfield, North Lakes, or Ormeau, getting a same-day appointment can mean driving across the city.",
    "InstantMed serves all of Greater Brisbane, the Gold Coast hinterland, and surrounding regions. Queensland employers accept our medical certificates, and eScripts work at any pharmacy in the state. We're available 8am-10pm AEST, seven days a week.",
  ],
  perth: [
    "Perth's isolation means fewer doctor options, especially in outer suburbs. InstantMed works on WA time and connects you with doctors who understand the unique needs of Western Australian patients, no matter where you are in the metro area.",
    "Western Australia's vast geography means that even within the Perth metro area, driving to a doctor can take 30-45 minutes. In suburbs like Joondalup, Rockingham, or Mandurah, same-day GP availability is limited. Telehealth removes the travel time entirely.",
    "Our doctors are available during WA business hours (AWST) and beyond. eScripts work at any pharmacy in Western Australia, and our medical certificates meet all requirements under the Fair Work Act — accepted by every employer in the state.",
  ],
  adelaide: [
    "Adelaide patients can avoid the scramble for same-day doctor appointments. InstantMed is ideal for when you need a quick med cert or script without driving across the city — from Glenelg to the Adelaide Hills.",
    "South Australia has seen a significant decline in bulk-billing rates, with many Adelaide GPs now charging gap fees of $40-80 per consultation. For straightforward needs like a medical certificate or repeat prescription, InstantMed offers a more affordable flat-fee alternative.",
    "We serve all of Adelaide and regional South Australia. Whether you're in the northern suburbs, the southern beaches, or the Hills district, you'll receive the same quality of care. All certificates and prescriptions are valid across SA.",
  ],
  "gold-coast": [
    "Whether you're a local or visiting the Gold Coast, getting a doctor appointment at short notice can be tricky. InstantMed lets you sort a med cert or script from Broadbeach, Burleigh, or anywhere along the coast.",
    "The Gold Coast's population swells during peak tourist seasons and school holidays, putting extra pressure on local medical centres. Walk-in clinics can have 2-3 hour waits during busy periods. For non-urgent medical needs, telehealth is the practical alternative.",
    "InstantMed covers the entire Gold Coast region, from Coolangatta to Coomera. eScripts can be filled at any Gold Coast pharmacy, and our certificates are accepted by all Queensland employers and educational institutions.",
  ],
  canberra: [
    "Canberra's limited bulk-billing options and long wait times make telehealth a practical choice for public servants and students alike. InstantMed is available across the ACT, from Civic to Tuggeranong.",
    "The ACT has one of the lowest bulk-billing rates in Australia, with many GPs charging significant gap fees. For APS employees who need a medical certificate quickly, or ANU and UC students who can't wait days for a campus doctor, InstantMed provides same-day access at a transparent flat fee.",
    "We serve all of Canberra and the surrounding region, including Queanbeyan and the broader Capital Region. Australian Government employers accept our medical certificates, and eScripts work at any ACT pharmacy.",
  ],
  newcastle: [
    "Newcastle and the Hunter Valley can face long waits for same-day doctor availability. InstantMed gives you access to Australian doctors from anywhere in the region — from Merewether to Maitland.",
    "The Hunter region's mix of mining, industry, and growing residential areas creates variable healthcare access. Workers on rotating rosters at the mines or port often can't make standard clinic hours, and after-hours options are limited outside the city centre.",
    "InstantMed serves Newcastle, Lake Macquarie, Maitland, Cessnock, and the wider Hunter Valley. Our flexible hours (8am-10pm, 7 days) suit shift workers and anyone who can't get to a clinic during the day.",
  ],
  hobart: [
    "Hobart and Southern Tasmania have limited after-hours doctor options. InstantMed bridges the gap, giving you access to Australian-registered doctors seven days a week without leaving your home.",
    "Tasmania has experienced significant GP shortages, particularly in regional areas. Even in Hobart, same-day appointments can be difficult to find. For straightforward telehealth-suitable needs, waiting days for a clinic appointment adds unnecessary delay to getting a certificate or prescription.",
    "We serve all of Tasmania, from Hobart to the North-West Coast. eScripts work at any Tasmanian pharmacy, and our certificates are valid for all employers and institutions in the state.",
  ],
  darwin: [
    "In the Top End, extreme weather and distance can make doctor visits difficult. InstantMed works on NT time and is available whether you're in the CBD, Palmerston, or further afield.",
    "The Northern Territory has unique healthcare challenges: a dispersed population, extreme climate, and limited GP availability — particularly during the wet season when travel is disrupted. For non-urgent needs that don't require a physical examination, telehealth is often the most practical option.",
    "InstantMed serves Darwin, Palmerston, and the wider Top End region. Our doctors are available during NT hours (ACST), and all certificates and eScripts are valid across the Territory.",
  ],
  "sunshine-coast": [
    "The Sunshine Coast's popularity means doctor clinics are often overloaded, especially in peak season. From Noosa to Caloundra, InstantMed offers a quick alternative to long clinic waits.",
    "The Sunshine Coast region is growing rapidly, with new suburbs and retirees driving demand for healthcare that local infrastructure hasn't fully matched. During school holidays and winter tourist season, clinic wait times can stretch significantly.",
  ],
  wollongong: [
    "Illawarra residents often face the choice of a long wait locally or driving to Sydney for a doctor. InstantMed lets you stay in the Gong and get sorted from your couch.",
    "The Illawarra region, including Wollongong, Shellharbour, and Kiama, has a mix of students, families, and industry workers. University of Wollongong students and steelworkers alike benefit from a telehealth option that doesn't require the commute to Sydney.",
  ],
  geelong: [
    "Geelong is growing fast, and doctor availability hasn't kept up. InstantMed gives you same-day access to doctors without the drive to Melbourne or the wait at a walk-in clinic.",
    "As Victoria's second-largest city, Geelong has seen significant population growth in suburbs like Armstrong Creek and Lara. Healthcare infrastructure is expanding but hasn't matched demand, particularly for same-day appointments.",
  ],
  townsville: [
    "North Queensland's limited specialist availability makes telehealth essential. InstantMed connects Townsville patients with Australian doctors for everyday health needs, rain or shine.",
    "Townsville serves as the healthcare hub for North Queensland, but demand consistently outstrips supply. During cyclone season, getting to a clinic can be particularly challenging. Telehealth ensures continuity of care regardless of weather.",
  ],
  cairns: [
    "Far North Queensland can be challenging for doctor access, especially in the wet season. InstantMed keeps you connected to healthcare from anywhere in the Cairns region.",
    "Cairns and the Tablelands have a transient population of tourists and seasonal workers alongside permanent residents, all competing for limited GP appointments. Telehealth helps manage the overflow for straightforward medical needs.",
  ],
  toowoomba: [
    "Toowoomba and the Darling Downs can face doctor shortages, especially outside business hours. InstantMed gives you flexible access to Australian doctors when you need them.",
    "As the largest inland city in Queensland, Toowoomba serves a wide agricultural region. Many residents face long drives to access healthcare, and after-hours options are limited. Telehealth provides a practical alternative for non-urgent needs.",
  ],
  ballarat: [
    "Ballarat and regional Victoria have fewer doctor options than Melbourne. InstantMed lets you get medical certificates and scripts without the drive or the wait.",
    "Ballarat is growing rapidly as a commuter city for Melbourne, but healthcare services haven't fully scaled to match. For workers commuting to Melbourne who fall sick, telehealth eliminates the need to take a half-day just to see a doctor.",
  ],
  bendigo: [
    "Bendigo's growing population means doctor wait times are increasing. InstantMed provides an alternative that works around your schedule — no appointments needed.",
    "Central Victoria's key regional centre serves a wide catchment area, from Castlemaine to Echuca. Demand for GP services regularly exceeds availability, particularly during cold and flu season.",
  ],
  launceston: [
    "Northern Tasmania's doctor availability can be limited. InstantMed bridges the gap with same-day access to Australian-registered doctors, seven days a week.",
    "Launceston and the surrounding Tamar Valley face ongoing GP shortages. For non-urgent healthcare needs, waiting days for a clinic appointment is often unnecessary when telehealth can provide the same outcome in under an hour.",
  ],
  mackay: [
    "The Mackay region, including the mining communities of the Bowen Basin, can face limited doctor access. InstantMed is designed to work around shift patterns and remote schedules.",
    "Mining and agriculture dominate the Mackay economy, with many workers on rotating rosters that don't align with standard clinic hours. Telehealth gives FIFO and shift workers access to healthcare that works around their schedule.",
  ],
  rockhampton: [
    "Central Queensland's vast distances make doctor visits time-consuming. InstantMed lets Rockhampton residents get healthcare sorted without the drive.",
    "Rockhampton serves as the beef capital of Australia and a key service centre for Central Queensland. Limited GP availability and a dispersed population make telehealth a practical option for straightforward health needs.",
  ],
  bunbury: [
    "South-West WA has fewer doctor options than Perth. InstantMed gives Bunbury and surrounding area residents access to doctors without a trip to the city.",
    "The South-West region, from Bunbury to Margaret River, has a growing population and tourist influx that stretches healthcare resources. Telehealth provides an alternative that doesn't require the 2-hour drive to Perth.",
  ],
  "wagga-wagga": [
    "The Riverina's doctor shortages are well documented. InstantMed gives Wagga residents the same access to healthcare as metro patients — from home.",
    "Wagga Wagga is the largest inland city in NSW, serving as a healthcare hub for the Riverina. Despite this, GP availability is limited, and Charles Sturt University students add seasonal demand. Telehealth fills a genuine gap for non-urgent medical needs.",
  ],
  "albury-wodonga": [
    "Straddling the NSW-Victoria border can complicate healthcare. InstantMed serves the whole Albury-Wodonga region regardless of which side of the Murray you're on.",
    "The border location means residents sometimes cross state lines for healthcare, creating administrative complications. InstantMed's national service avoids this entirely — same doctors, same certificates, valid in both NSW and Victoria.",
  ],
  "hervey-bay": [
    "Hervey Bay and the Fraser Coast have a growing retiree population and limited doctor availability. InstantMed offers a simple, affordable alternative for everyday health needs.",
    "The Wide Bay region's ageing population drives high demand for GP services, while the relatively small number of local practices struggles to keep up. Telehealth provides a practical alternative for routine needs like medical certificates and repeat prescriptions.",
  ],
  parramatta: [
    "Parramatta and Western Sydney face some of the longest GP wait times in the country. InstantMed gives you access to Australian doctors without the commute — from your office, home, or anywhere in the region.",
    "Western Sydney is home to over 2.5 million people, and healthcare infrastructure has not kept pace with explosive population growth. Many suburbs have 3-5 day waits for GP appointments, and bulk-billing options are increasingly scarce. Telehealth eliminates the wait for straightforward needs.",
  ],
  "bondi-beach": [
    "Eastern suburbs residents know the drill: packed medical centres and long waits. InstantMed lets you get a med cert or script without the queue — from your couch, reviewed by a real doctor.",
    "The Eastern Suburbs' mix of professionals, students, and tourists creates constant demand for GP services. Walk-in clinics on Bondi Road and Oxford Street regularly run 1-2 hour waits. For a straightforward medical certificate, telehealth is faster and more affordable.",
  ],
  fremantle: [
    "Fremantle and the port city have a distinct character — and distinct healthcare challenges. InstantMed works on WA time and connects you with doctors without the trip into Perth.",
    "Fremantle's mix of maritime workers, students, and young professionals creates demand for flexible healthcare. With Notre Dame University and the port both driving the local population, same-day GP availability can be difficult to find.",
  ],
  "central-coast": [
    "The Central Coast stretches from Gosford to The Entrance, and doctor availability varies. InstantMed gives the whole region same-day access to Australian doctors — no drive to Sydney required.",
    "The Central Coast's population of 340,000 sits between Sydney and the Hunter Valley, with many residents commuting to Sydney for work. When you fall ill, the last thing you need is a drive to the city for a doctor — telehealth brings the doctor to you.",
  ],
  penrith: [
    "Western Sydney's growth has outpaced healthcare infrastructure. InstantMed provides an alternative for Penrith, St Marys, and the greater west — all from home.",
    "The Penrith region's rapid development, from Jordan Springs to Glenmore Park, has brought thousands of new residents without proportional healthcare growth. Same-day GP appointments are increasingly rare. Telehealth bridges the gap.",
  ],
  ipswich: [
    "Ipswich is one of Australia's fastest-growing cities. Doctor availability hasn't kept up. InstantMed gives you access without the drive to Brisbane or the wait at a walk-in clinic.",
    "Ipswich and the surrounding growth corridors (Springfield, Ripley Valley) have some of the highest population growth rates in Queensland. Healthcare infrastructure is playing catch-up. Telehealth provides immediate access while the region builds out its medical services.",
  ],
  "port-macquarie": [
    "The Mid North Coast has a significant retiree population and limited after-hours options. InstantMed bridges the gap with 7-day access to Australian doctors.",
    "Port Macquarie's popularity with retirees and sea-changers has driven population growth, but GP availability hasn't matched. After-hours options are limited to the hospital emergency department for many residents.",
  ],
  "coffs-harbour": [
    "Coffs Harbour and the Coffs Coast attract tourists and families alike. When you need a doctor, wait times can stretch. InstantMed offers a quick alternative.",
    "The Mid North Coast's mix of permanent residents, tourists, and agricultural workers creates fluctuating demand for healthcare. During holiday periods and banana harvest season, clinic wait times can be particularly long.",
  ],
  orange: [
    "The Central West has fewer doctor options than metro areas. InstantMed gives Orange and surrounding towns access to telehealth without the drive to Sydney.",
    "Orange serves as the healthcare hub for the Central West, but demand from surrounding towns like Bathurst, Mudgee, and Cowra stretches capacity. For straightforward telehealth-suitable needs, a 3-4 hour round trip to Sydney is unnecessary.",
  ],
  dubbo: [
    "Dubbo is the hub of the Orana region. Healthcare access can be challenging. InstantMed connects you with Australian doctors from anywhere with internet.",
    "As Western NSW's key service centre, Dubbo draws patients from a vast area. GP availability is limited relative to demand, and the nearest major hospital is hours away. Telehealth makes routine healthcare more accessible for the entire region.",
  ],
  mildura: [
    "Sunraysia's isolation makes telehealth valuable. InstantMed gives Mildura and the Mallee access to doctors without the long drive to Melbourne.",
    "Mildura is one of the most geographically isolated cities in Victoria — nearly 6 hours from Melbourne by road. Healthcare access has always been a challenge. Telehealth brings the same quality of doctor assessment to Sunraysia without the drive.",
  ],
  shepparton: [
    "The Goulburn Valley has a strong agricultural base and growing population. InstantMed provides flexible healthcare access for Shepparton and the region.",
    "Shepparton's agricultural and food processing industries employ many shift workers and seasonal labourers who can't easily access GP clinics during standard hours. Telehealth works around these schedules.",
  ],
  gladstone: [
    "Gladstone's industrial workforce often works shifts. InstantMed is designed to work around irregular hours — get a cert or script when you need it.",
    "The Gladstone region's LNG and resources sector employs a large FIFO and shift workforce. Standard clinic hours rarely align with 12-hour rotating rosters. Telehealth provides healthcare access that fits around industrial schedules.",
  ],
  bundaberg: [
    "The Wide Bay-Burnett region has a mix of agriculture, tourism, and retirees. InstantMed offers a simple option when local clinics are booked out.",
    "Bundaberg's growing population and limited GP numbers mean same-day appointments can be hard to find. For routine telehealth-suitable needs, waiting days for a clinic slot is unnecessary when a doctor can review your request online.",
  ],
  "mount-gambier": [
    "Mount Gambier and the Limestone Coast are a long way from Adelaide. InstantMed brings telehealth to the region — no travel required.",
    "South Australia's second-largest city is over 4 hours from Adelaide by road. Healthcare access has always required either local availability or a significant journey. Telehealth closes this gap for everyday medical needs.",
  ],
  "port-augusta": [
    "Port Augusta is a key regional centre for outback South Australia. Healthcare access is limited. InstantMed helps bridge the distance.",
    "As the crossroads of Australia, Port Augusta serves travellers and remote communities alongside its permanent population. Limited GP availability makes telehealth a practical necessity rather than just a convenience.",
  ],
  "alice-springs": [
    "Central Australia faces unique healthcare challenges — vast distances, extreme weather, and limited specialist access. InstantMed provides telehealth for everyday needs.",
    "Alice Springs is nearly 1,500 kilometres from the nearest major city. For non-urgent healthcare needs that don't require a physical examination, telehealth removes the tyranny of distance entirely. Our doctors are available during NT hours.",
  ],
}

// City-specific FAQ items
const CITY_FAQS: Record<string, Array<{ q: string; a: string }>> = {
  sydney: [
    { q: "Can I use InstantMed if I live in Western Sydney?", a: "Yes — InstantMed is available anywhere in Greater Sydney, from Penrith to Bondi. All you need is an internet connection." },
    { q: "Are InstantMed certificates accepted by NSW employers?", a: "Yes. Our certificates are issued by AHPRA-registered doctors and are valid for all Australian employers, including NSW government agencies." },
    { q: "How fast can I get a medical certificate in Sydney?", a: "Most medical certificates are reviewed within 45 minutes during business hours. You'll receive it via email as a PDF." },
  ],
  melbourne: [
    { q: "Is InstantMed available across all of Melbourne?", a: "Yes — from the CBD to the outer suburbs. We serve all of Greater Melbourne and regional Victoria." },
    { q: "Can I get an eScript filled at a Melbourne pharmacy?", a: "Yes. Your eScript can be filled at any pharmacy in Melbourne. Just show the QR code on your phone." },
    { q: "Do I need a Medicare card to use InstantMed in Victoria?", a: "No Medicare card is required. InstantMed is a private service with transparent flat-fee pricing." },
  ],
  brisbane: [
    { q: "Does InstantMed work in Greater Brisbane?", a: "Yes — we serve all Brisbane suburbs, from the CBD to Logan, Ipswich and Redcliffe." },
    { q: "Are certificates valid for Queensland employers?", a: "Yes. Our AHPRA-registered doctors issue certificates accepted by all Australian employers." },
    { q: "Can I get a repeat script through InstantMed in Brisbane?", a: "Yes. If you have an existing prescription, we can arrange a repeat via eScript sent to your phone." },
  ],
  perth: [
    { q: "Does InstantMed account for WA time zones?", a: "Yes. Our platform is available 7 days a week and our doctors work across all Australian time zones, including AWST." },
    { q: "Can I use InstantMed in regional WA?", a: "Yes — anywhere in Western Australia with internet access. We serve Perth metro and all regional areas." },
    { q: "How do eScripts work in Western Australia?", a: "eScripts work the same way across Australia. You receive a QR code via SMS that any pharmacy can scan." },
  ],
  adelaide: [
    { q: "Is InstantMed available in South Australia?", a: "Yes — we serve all of Adelaide and regional SA. All you need is an internet connection." },
    { q: "Are your doctors registered in South Australia?", a: "Our doctors are AHPRA-registered, which means they can practise anywhere in Australia, including SA." },
    { q: "How much does a medical certificate cost in Adelaide?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. The same price applies regardless of your location.` },
  ],
  "gold-coast": [
    { q: "Can I use InstantMed on the Gold Coast?", a: "Yes — InstantMed serves the entire Gold Coast, from Coolangatta to Coomera and the hinterland. All you need is internet access." },
    { q: "Are eScripts accepted at Gold Coast pharmacies?", a: "Yes. eScripts work at every pharmacy in Australia. You'll receive a QR code via SMS that any Gold Coast chemist can scan." },
    { q: "Can I get a certificate for a sick day at a Gold Coast hotel?", a: "Yes. Whether you're a local or visiting, our doctors can provide medical certificates. You don't need a local address or Medicare card." },
  ],
  canberra: [
    { q: "Do APS employers accept InstantMed certificates?", a: "Yes. Our certificates are issued by AHPRA-registered doctors and are legally valid for all employers, including all levels of Australian Government." },
    { q: "Can ANU or UC students use InstantMed?", a: "Yes — students can use InstantMed for medical certificates, consults, and prescriptions. No Medicare card is needed for most services." },
    { q: "Is InstantMed cheaper than a Canberra GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. With Canberra's low bulk-billing rates, this is often less than a GP gap fee.` },
  ],
  newcastle: [
    { q: "Does InstantMed serve the Hunter Valley?", a: "Yes — we cover Newcastle, Lake Macquarie, Maitland, Cessnock, and the entire Hunter region." },
    { q: "Can shift workers at the Port of Newcastle use InstantMed?", a: "Yes. Our 8am-10pm, 7-day availability suits shift workers who can't access clinics during standard hours." },
    { q: "Are certificates valid for mining companies?", a: "Yes. Our AHPRA-registered certificates are accepted by all Australian employers, including mining companies with fitness-for-duty policies." },
  ],
  hobart: [
    { q: "Does InstantMed work in Tasmania?", a: "Yes — we serve all of Tasmania, from Hobart to Launceston, Devonport, and the North-West Coast." },
    { q: "Can I fill an eScript at a Tasmanian pharmacy?", a: "Yes. eScripts are a national system and work at any pharmacy in Australia, including all Tasmanian pharmacies." },
    { q: "Are there after-hours telehealth options in Hobart?", a: "InstantMed is available 8am-10pm AEST, 7 days a week — covering evenings and weekends when most Hobart clinics are closed." },
  ],
  darwin: [
    { q: "Does InstantMed account for NT time?", a: "Yes. Our platform works across all Australian time zones, including ACST. We're available 7 days a week." },
    { q: "Can I use InstantMed in the wet season?", a: "Yes — telehealth is especially useful when travel is disrupted. All you need is an internet connection." },
    { q: "Are certificates accepted by NT employers?", a: "Yes. AHPRA-registered certificates are valid for all Australian employers, including NT Government and defence." },
  ],
  parramatta: [
    { q: "Does InstantMed serve Western Sydney?", a: "Yes — we cover all of Western Sydney, from Parramatta to Penrith, Blacktown, Liverpool, and Campbelltown." },
    { q: "Is InstantMed faster than a walk-in clinic in Parramatta?", a: "Usually, yes. Most requests are reviewed within 45 minutes. Walk-in clinics in Western Sydney often have 1-3 hour waits." },
    { q: "Can I use InstantMed during my lunch break?", a: "Yes. The form takes about 2 minutes, and you'll receive your certificate via email — no phone call needed for most requests." },
  ],
  geelong: [
    { q: "Does InstantMed serve Geelong and the Surf Coast?", a: "Yes — we cover Geelong, Torquay, the Bellarine Peninsula, and the broader Barwon region." },
    { q: "Can Deakin University students use InstantMed?", a: "Yes. Students can access medical certificates, consults, and prescriptions without a Medicare card." },
    { q: "Is this cheaper than driving to Melbourne for a GP?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. That's less than the petrol for a round trip to Melbourne, plus you avoid the wait.` },
  ],
}

// Fallback FAQs for cities without specific ones
const DEFAULT_FAQS = [
  { q: "Is InstantMed available in my area?", a: "Yes — InstantMed works anywhere in Australia with an internet connection. No matter your location, our doctors can help." },
  { q: "Are your medical certificates accepted by employers?", a: "Yes. Our certificates are issued by AHPRA-registered doctors and are legally valid for all Australian employers and educational institutions." },
  { q: "How fast will I receive my medical certificate?", a: "Most medical certificates are reviewed within 45 minutes during business hours. You'll receive it as a PDF via email." },
]

// Local SEO Pages - Top 25 Australian cities & regions
const cities: Record<
  string,
  {
    name: string
    state: string
    slug: string
    population: string
    localTestimonial?: { name: string; quote: string }
  }
> = {
  sydney: {
    name: "Sydney",
    state: "NSW",
    slug: "sydney",
    population: "5.3 million",
    localTestimonial: { name: "Sarah M.", quote: "Sorted my cert on the couch before work. HR accepted it, no dramas." },
  },
  melbourne: {
    name: "Melbourne",
    state: "VIC",
    slug: "melbourne",
    population: "5.1 million",
    localTestimonial: { name: "James L.", quote: "Didn't have to leave the house when I was feeling terrible. Doctor asked proper questions too." },
  },
  brisbane: {
    name: "Brisbane",
    state: "QLD",
    slug: "brisbane",
    population: "2.5 million",
    localTestimonial: { name: "Emma T.", quote: "Did the whole thing from my phone. Certificate came through while I was still on the couch." },
  },
  perth: {
    name: "Perth",
    state: "WA",
    slug: "perth",
    population: "2.1 million",
    localTestimonial: { name: "Michael K.", quote: "Works on WA time which is a plus. Doctor was thorough." },
  },
  adelaide: {
    name: "Adelaide",
    state: "SA",
    slug: "adelaide",
    population: "1.4 million",
    localTestimonial: { name: "Lisa R.", quote: "The doctor actually read my answers properly. More than I expected from an online service." },
  },
  "gold-coast": {
    name: "Gold Coast",
    state: "QLD",
    slug: "gold-coast",
    population: "700,000",
    localTestimonial: { name: "Chris D.", quote: "Got my script sorted and picked it up from the pharmacy down the road. Easy." },
  },
  canberra: {
    name: "Canberra",
    state: "ACT",
    slug: "canberra",
    population: "460,000",
    localTestimonial: { name: "Nicole W.", quote: "Handy when you can't get in anywhere locally. Doctor was professional." },
  },
  newcastle: {
    name: "Newcastle",
    state: "NSW",
    slug: "newcastle",
    population: "320,000",
    localTestimonial: { name: "David H.", quote: "Too crook to drive anywhere. Did it from bed, cert came through same morning." },
  },
  hobart: {
    name: "Hobart",
    state: "TAS",
    slug: "hobart",
    population: "240,000",
    localTestimonial: { name: "Amy S.", quote: "Good option when the local clinics are booked out." },
  },
  darwin: {
    name: "Darwin",
    state: "NT",
    slug: "darwin",
    population: "150,000",
    localTestimonial: { name: "Tom B.", quote: "Works well up here. Doctor reviewed everything properly." },
  },
  "sunshine-coast": {
    name: "Sunshine Coast",
    state: "QLD",
    slug: "sunshine-coast",
    population: "350,000",
    localTestimonial: { name: "Kate P.", quote: "Easier than trying to find a clinic with availability. Done from my phone." },
  },
  wollongong: {
    name: "Wollongong",
    state: "NSW",
    slug: "wollongong",
    population: "310,000",
    localTestimonial: { name: "Ryan C.", quote: "Got my cert while recovering at home. Didn't have to drive anywhere." },
  },
  geelong: {
    name: "Geelong",
    state: "VIC",
    slug: "geelong",
    population: "270,000",
    localTestimonial: { name: "Sophie W.", quote: "Simple process, doctor was thorough. Certificate came through within the hour." },
  },
  townsville: {
    name: "Townsville",
    state: "QLD",
    slug: "townsville",
    population: "195,000",
    localTestimonial: { name: "Daniel M.", quote: "Good to have this option up here. Professional service." },
  },
  cairns: {
    name: "Cairns",
    state: "QLD",
    slug: "cairns",
    population: "160,000",
    localTestimonial: { name: "Jess A.", quote: "Handy when getting a doctor appointment is hard. Did it all online." },
  },
  toowoomba: {
    name: "Toowoomba",
    state: "QLD",
    slug: "toowoomba",
    population: "140,000",
    localTestimonial: { name: "Matt H.", quote: "Great for regional areas. Doctor asked good follow-up questions." },
  },
  ballarat: {
    name: "Ballarat",
    state: "VIC",
    slug: "ballarat",
    population: "115,000",
    localTestimonial: { name: "Emily G.", quote: "Did it from home instead of sitting in a waiting room. Much better." },
  },
  bendigo: {
    name: "Bendigo",
    state: "VIC",
    slug: "bendigo",
    population: "100,000",
    localTestimonial: { name: "Steve R.", quote: "Easy to use and got my certificate within the hour." },
  },
  launceston: {
    name: "Launceston",
    state: "TAS",
    slug: "launceston",
    population: "90,000",
    localTestimonial: { name: "Lauren T.", quote: "Good option for Tassie when local clinics are fully booked." },
  },
  mackay: {
    name: "Mackay",
    state: "QLD",
    slug: "mackay",
    population: "85,000",
    localTestimonial: { name: "Josh F.", quote: "Works well for shift workers out here. Reliable." },
  },
  rockhampton: {
    name: "Rockhampton",
    state: "QLD",
    slug: "rockhampton",
    population: "80,000",
    localTestimonial: { name: "Tina K.", quote: "Saved me a trip when I was feeling awful. Doctor was thorough." },
  },
  bunbury: {
    name: "Bunbury",
    state: "WA",
    slug: "bunbury",
    population: "75,000",
    localTestimonial: { name: "Craig N.", quote: "Useful for regional WA. Didn't have to drive to Perth." },
  },
  "wagga-wagga": {
    name: "Wagga Wagga",
    state: "NSW",
    slug: "wagga-wagga",
    population: "65,000",
    localTestimonial: { name: "Mel J.", quote: "Good service for the Riverina. Straightforward process." },
  },
  "albury-wodonga": {
    name: "Albury-Wodonga",
    state: "NSW/VIC",
    slug: "albury-wodonga",
    population: "95,000",
    localTestimonial: { name: "Sam L.", quote: "Works well for the border region. Doctor was professional." },
  },
  "hervey-bay": {
    name: "Hervey Bay",
    state: "QLD",
    slug: "hervey-bay",
    population: "55,000",
    localTestimonial: { name: "Linda B.", quote: "Simple to use and affordable. Good for everyday health stuff." },
  },
  parramatta: {
    name: "Parramatta",
    state: "NSW",
    slug: "parramatta",
    population: "270,000",
    localTestimonial: { name: "Marcus T.", quote: "Did it on the train. Certificate in my inbox before I got to work." },
  },
  "bondi-beach": {
    name: "Bondi Beach",
    state: "NSW",
    slug: "bondi-beach",
    population: "12,000",
    localTestimonial: { name: "Sarah K.", quote: "Sorted from home before the school run. No waiting around." },
  },
  fremantle: {
    name: "Fremantle",
    state: "WA",
    slug: "fremantle",
    population: "32,000",
    localTestimonial: { name: "Jake M.", quote: "Telehealth makes sense when you're juggling shift work. Good experience." },
  },
  "central-coast": {
    name: "Central Coast",
    state: "NSW",
    slug: "central-coast",
    population: "340,000",
    localTestimonial: { name: "Emma L.", quote: "Coastie here. Did it from home instead of driving to Gosford." },
  },
  penrith: {
    name: "Penrith",
    state: "NSW",
    slug: "penrith",
    population: "220,000",
    localTestimonial: { name: "David P.", quote: "Got my script renewed without a round trip across Western Sydney." },
  },
  ipswich: {
    name: "Ipswich",
    state: "QLD",
    slug: "ipswich",
    population: "230,000",
    localTestimonial: { name: "Rachel W.", quote: "Sorted me from home. Doctor asked proper questions which was reassuring." },
  },
  "port-macquarie": {
    name: "Port Macquarie",
    state: "NSW",
    slug: "port-macquarie",
    population: "50,000",
    localTestimonial: { name: "Tom R.", quote: "Good to have another option on the Mid North Coast." },
  },
  "coffs-harbour": {
    name: "Coffs Harbour",
    state: "NSW",
    slug: "coffs-harbour",
    population: "75,000",
    localTestimonial: { name: "Lisa M.", quote: "Regional NSW needs more options like this. Professional service." },
  },
  orange: {
    name: "Orange",
    state: "NSW",
    slug: "orange",
    population: "42,000",
    localTestimonial: { name: "James O.", quote: "Helpful when local clinics are booked solid." },
  },
  dubbo: {
    name: "Dubbo",
    state: "NSW",
    slug: "dubbo",
    population: "43,000",
    localTestimonial: { name: "Kate D.", quote: "Telehealth makes sense out here. Worked well." },
  },
  mildura: {
    name: "Mildura",
    state: "VIC",
    slug: "mildura",
    population: "55,000",
    localTestimonial: { name: "Steve M.", quote: "Good for everyday health stuff when you're a long way from a city." },
  },
  shepparton: {
    name: "Shepparton",
    state: "VIC",
    slug: "shepparton",
    population: "65,000",
    localTestimonial: { name: "Anna S.", quote: "Straightforward process. Doctor was thorough." },
  },
  gladstone: {
    name: "Gladstone",
    state: "QLD",
    slug: "gladstone",
    population: "35,000",
    localTestimonial: { name: "Mike G.", quote: "Good for shift workers who can't make it to a clinic during the day." },
  },
  bundaberg: {
    name: "Bundaberg",
    state: "QLD",
    slug: "bundaberg",
    population: "72,000",
    localTestimonial: { name: "Sue B.", quote: "Simple and reliable. Did it all from my phone." },
  },
  "mount-gambier": {
    name: "Mount Gambier",
    state: "SA",
    slug: "mount-gambier",
    population: "28,000",
    localTestimonial: { name: "Peter M.", quote: "Useful when you're a long way from Adelaide." },
  },
  "port-augusta": {
    name: "Port Augusta",
    state: "SA",
    slug: "port-augusta",
    population: "14,000",
    localTestimonial: { name: "Jenny P.", quote: "Healthcare access is tough out here. This helps." },
  },
  "alice-springs": {
    name: "Alice Springs",
    state: "NT",
    slug: "alice-springs",
    population: "28,000",
    localTestimonial: { name: "Rob A.", quote: "Distance is the challenge in Central Australia. Telehealth helps bridge it." },
  },
}

const services = [
  { name: "Medical Certificates", href: "/medical-certificate", price: PRICING_DISPLAY.FROM_MED_CERT },
  { name: "Prescriptions", href: "/prescriptions", price: PRICING_DISPLAY.FROM_SCRIPT },
]

interface PageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params
  const cityData = cities[city]
  if (!cityData) return {}

  return {
    title: `Online Doctor ${cityData.name} | Telehealth ${cityData.state}`,
    description: `Online doctor consults in ${cityData.name}. Med certs & scripts from AHPRA-registered doctors. Serving ${cityData.state}.`,
    keywords: [
      `online doctor ${cityData.name.toLowerCase()}`,
      `telehealth ${cityData.name.toLowerCase()}`,
      `medical certificate ${cityData.name.toLowerCase()}`,
      `online prescription ${cityData.name.toLowerCase()}`,
    ],
    openGraph: {
      title: `Online Doctor ${cityData.name} | InstantMed`,
      description: `Telehealth consultations for ${cityData.name} residents. Doctor-reviewed, affordable, and convenient.`,
      url: `https://instantmed.com.au/locations/${city}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Online Doctor ${cityData.name} | InstantMed`,
      description: `Telehealth consultations for ${cityData.name} residents. Doctor-reviewed, affordable, and convenient.`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/locations/${city}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(cities).map((city) => ({ city }))
}

export default async function CityPage({ params }: PageProps) {
  const { city } = await params
  const cityData = cities[city]

  if (!cityData) {
    notFound()
  }

  const geo = GEO_COORDS[city] || GEO_COORDS.sydney
  const faqs = CITY_FAQS[city] || DEFAULT_FAQS
  const cityContent = CITY_CONTENT[city]

  // Enhanced Local Business Schema for SEO
  const localSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `https://instantmed.com.au/locations/${city}#business`,
    name: `InstantMed - Online Doctor ${cityData.name}`,
    description: `Online doctor consultations, medical certificates, and prescriptions for ${cityData.name} residents. AHPRA-registered Australian doctors.`,
    url: `https://instantmed.com.au/locations/${city}`,
    logo: "https://instantmed.com.au/branding/logo.png",
    image: "https://instantmed.com.au/branding/logo.png",
    telephone: "+61-450-722-549",
    areaServed: {
      "@type": "City",
      name: cityData.name,
      containedInPlace: {
        "@type": "State",
        name: cityData.state,
        containedInPlace: { "@type": "Country", name: "Australia" }
      },
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: geo.lat,
      longitude: geo.lng,
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "AU",
      addressRegion: cityData.state,
      addressLocality: cityData.name
    },
    priceRange: "$$",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "08:00",
        closes: "22:00"
      }
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Telehealth Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "MedicalProcedure",
            name: "Medical Certificate",
            description: "Online medical certificate for work or study"
          },
          price: "19.95",
          priceCurrency: "AUD"
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "MedicalProcedure",
            name: "Online Prescription",
            description: "eScript prescription sent to your phone"
          },
          price: "29.95",
          priceCurrency: "AUD"
        }
      ]
    },
    medicalSpecialty: "General Practice",
    isAcceptingNewPatients: true
  }

  // FAQ Schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(localSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://instantmed.com.au" },
        { name: "Locations", url: "https://instantmed.com.au/locations" },
        { name: cityData.name, url: `https://instantmed.com.au/locations/${city}` },
      ]} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />
        <ContentPageTracker pageType="location" slug={city} />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:py-16 bg-linear-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
                <MapPin className="h-4 w-4" />
                Serving {cityData.name}, {cityData.state}
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Online Doctor in {cityData.name}
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Skip the waiting room. Get medical certificates and prescriptions online — reviewed by
                Australian doctors, delivered to your phone.
              </p>

              <Link href="/request">
                <Button size="lg" className="text-base px-8 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Usually under 1 hour</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>AHPRA-registered</span>
                </div>
              </div>
            </div>
          </section>

          {/* City-specific content */}
          {cityContent && cityContent.length > 0 && (
            <section className="px-4 py-10">
              <div className="mx-auto max-w-2xl space-y-4">
                {cityContent.map((paragraph, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed text-center">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Med Cert CTA */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl rounded-2xl bg-primary/5 border border-primary/15 p-6 sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl mb-3">
                Medical certificates online in {cityData.name}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Skip the {cityData.name} waiting rooms. Get a medical certificate reviewed by an
                AHPRA-registered doctor and delivered to your inbox — from {PRICING_DISPLAY.MED_CERT}.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/medical-certificate">
                  Get a medical certificate
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </section>

          {/* Services */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold mb-6 text-center">Services Available in {cityData.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <Link key={service.href} href={service.href}>
                    <div className="p-5 rounded-xl border bg-card hover:border-primary transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.price}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Local Testimonial */}
          {cityData.localTestimonial && (
            <section className="px-4 py-12 bg-muted/30">
              <div className="mx-auto max-w-2xl text-center">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-lg mb-4">&quot;{cityData.localTestimonial.quote}&quot;</blockquote>
                <p className="text-sm text-muted-foreground">
                  — {cityData.localTestimonial.name}, {cityData.name}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Individual experiences may vary. All requests are subject to doctor assessment.
                </p>
              </div>
            </section>
          )}

          {/* How It Works */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold mb-6 text-center">How It Works for {cityData.name} Patients</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    step: "1",
                    title: "Tell us what you need",
                    desc: "Answer a few quick questions about your health concern",
                  },
                  {
                    step: "2",
                    title: "Doctor reviews",
                    desc: "An Australian doctor reviews your request (usually within 1 hour)",
                  },
                  { step: "3", title: "Get your result", desc: "Certificate, script, or referral sent to your phone" },
                ].map((item) => (
                  <div key={item.step} className="text-center p-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="font-semibold text-primary">{item.step}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Why Telehealth */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold mb-6 text-center">Why {cityData.name} Residents Choose InstantMed</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "No need to leave home or work",
                  "Skip the waiting room",
                  "Same-day service, most requests",
                  "eScripts sent to your phone",
                  "Valid for all Australian employers",
                  "Reviewed by real Australian doctors",
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-xl font-semibold mb-6 text-center flex items-center justify-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions — {cityData.name}
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-card">
                    <h3 className="font-semibold text-sm mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-6">
                Join hundreds of {cityData.name} residents who trust InstantMed for their telehealth needs.
              </p>
              <Link href="/request">
                <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Get started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          {/* Related Resources - internal cross-linking */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold mb-6 text-center">
                Health Resources for {cityData.name}
              </h2>
              <div className="grid gap-6 sm:grid-cols-3 mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Common Conditions</h3>
                  <ul className="space-y-2">
                    {[
                      { href: "/conditions/cold-and-flu", label: "Cold & Flu" },
                      { href: "/conditions/back-pain", label: "Back Pain" },
                      { href: "/conditions/migraine", label: "Migraine" },
                      { href: "/conditions/gastro", label: "Gastro" },
                      { href: "/conditions/mental-health-day", label: "Mental Health" },
                    ].map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="text-sm text-primary hover:underline">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link href="/conditions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        View all conditions →
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Helpful Guides</h3>
                  <ul className="space-y-2">
                    {[
                      { href: "/guides/how-to-get-medical-certificate-for-work", label: "Med Cert for Work" },
                      { href: "/guides/telehealth-guide-australia", label: "Telehealth Guide" },
                      { href: "/guides/how-to-get-repeat-prescription-online", label: "Repeat Prescriptions" },
                      { href: "/guides/when-to-use-telehealth", label: "When to Use Telehealth" },
                    ].map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="text-sm text-primary hover:underline">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link href="/guides" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        View all guides →
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Our Services</h3>
                  <ul className="space-y-2">
                    {[
                      { href: "/medical-certificate", label: "Medical Certificates" },
                      { href: "/prescriptions", label: "Prescriptions" },
                      { href: "/general-consult", label: "GP Consults" },
                      { href: "/weight-management", label: "Weight Management" },
                    ].map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="text-sm text-primary hover:underline">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link href="/blog/how-to-get-medical-certificate-online-australia" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Read: How to get a med cert online →
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Other Cities */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm text-muted-foreground text-center">
                Also serving:{" "}
                {Object.values(cities)
                  .filter((c) => c.slug !== city)
                  .slice(0, 8)
                  .map((c, i, arr) => (
                    <span key={c.slug}>
                      <Link href={`/locations/${c.slug}`} className="text-primary hover:underline">
                        {c.name}
                      </Link>
                      {i < arr.length - 1 && " • "}
                    </span>
                  ))}
                {" • "}
                <Link href="/locations" className="text-primary hover:underline font-medium">
                  View all locations
                </Link>
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
