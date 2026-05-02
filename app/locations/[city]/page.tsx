import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LocationPageContent } from "@/components/marketing/location-page-content"
import { BreadcrumbSchema } from "@/components/seo"
import { Footer, Navbar } from "@/components/shared"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { DEEP_CITY_CONTENT } from "@/lib/seo/data/deep-city-content"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

// City-specific content paragraphs for unique SEO value
const CITY_CONTENT: Record<string, string> = {
  sydney: "Sydney residents can skip crowded CBD clinics and long waits at bulk-billing practices. Whether you're in the Eastern Suburbs, Inner West or out in Parramatta, InstantMed connects you with a doctor from anywhere with phone signal.",
  melbourne: "From Brunswick to Brighton, Melbourne's notoriously long doctor wait times are a thing of the past. InstantMed lets you see a doctor without braving the weather or the traffic - perfect for those days when you really can't leave the house.",
  brisbane: "Brisbane's growing population means longer doctor wait times across the city. From the CBD to the suburbs, InstantMed gives you access to Australian-registered doctors without the queue - even during school holidays and peak flu season.",
  perth: "Perth's isolation means fewer doctor options, especially in outer suburbs. InstantMed works on WA time and connects you with doctors who understand the unique needs of Western Australian patients, no matter where you are in the metro area.",
  adelaide: "Adelaide patients can avoid the scramble for same-day doctor appointments. InstantMed is ideal for when you need a quick med cert or script without driving across the city - from Glenelg to the Adelaide Hills.",
  "gold-coast": "Whether you're a local or visiting the Gold Coast, getting a doctor appointment at short notice can be tricky. InstantMed lets you sort a med cert or script from Broadbeach, Burleigh or anywhere along the coast.",
  canberra: "Canberra's limited bulk-billing options and long wait times make telehealth a practical choice for public servants and students alike. InstantMed is available across the ACT, from Civic to Tuggeranong.",
  newcastle: "Newcastle and the Hunter Valley can face long waits for same-day doctor availability. InstantMed gives you access to Australian doctors from anywhere in the region - from Merewether to Maitland.",
  hobart: "Hobart and Southern Tasmania have limited after-hours doctor options. InstantMed bridges the gap, giving you access to Australian-registered doctors seven days a week without leaving your home.",
  darwin: "In the Top End, extreme weather and distance can make doctor visits difficult. InstantMed works on NT time and is available whether you're in the CBD, Palmerston, or further afield.",
  "sunshine-coast": "The Sunshine Coast's popularity means doctor clinics are often overloaded, especially in peak season. From Noosa to Caloundra, InstantMed offers a quick alternative to long clinic waits.",
  wollongong: "Illawarra residents often face the choice of a long wait locally or driving to Sydney for a doctor. InstantMed lets you stay in the Gong and get sorted from your couch.",
  geelong: "Geelong is growing fast, and doctor availability hasn't kept up. InstantMed gives you online access to doctors without the drive to Melbourne or the wait at a walk-in clinic.",
  townsville: "North Queensland's limited specialist availability makes telehealth essential. InstantMed connects Townsville patients with Australian doctors for everyday health needs, rain or shine.",
  cairns: "Far North Queensland can be challenging for doctor access, especially in the wet season. InstantMed keeps you connected to healthcare from anywhere in the Cairns region.",
  toowoomba: "Toowoomba and the Darling Downs can face doctor shortages, especially outside business hours. InstantMed gives you flexible access to Australian doctors when you need them.",
  ballarat: "Ballarat and regional Victoria have fewer doctor options than Melbourne. InstantMed lets you get medical certificates and scripts without the drive or the wait.",
  bendigo: "Bendigo's growing population means doctor wait times are increasing. InstantMed provides an alternative that works around your schedule - no appointments needed.",
  launceston: "Northern Tasmania's doctor availability can be limited. InstantMed bridges the gap with online access to Australian-registered doctors, seven days a week.",
  mackay: "The Mackay region, including the mining communities of the Bowen Basin, can face limited doctor access. InstantMed is designed to work around shift patterns and remote schedules.",
  rockhampton: "Central Queensland's vast distances make doctor visits time-consuming. InstantMed lets Rockhampton residents get healthcare sorted without the drive.",
  bunbury: "South-West WA has fewer doctor options than Perth. InstantMed gives Bunbury and surrounding area residents access to doctors without a trip to the city.",
  "wagga-wagga": "The Riverina's doctor shortages are well documented. InstantMed gives Wagga residents the same access to healthcare as metro patients - fast and from home.",
  "albury-wodonga": "Straddling the NSW-Victoria border can complicate healthcare. InstantMed serves the whole Albury-Wodonga region regardless of which side of the Murray you're on.",
  "hervey-bay": "Hervey Bay and the Fraser Coast have a growing retiree population and limited doctor availability. InstantMed offers a simple, affordable alternative for everyday health needs.",
  parramatta: "Parramatta and Western Sydney face some of the longest GP wait times in the country. InstantMed gives you access to Australian doctors without the commute - from your office, home, or anywhere in the region.",
  "bondi-beach": "Eastern suburbs residents know the drill: packed medical centres and long waits. InstantMed lets you get a med cert or script without the queue - perfect when you're under the weather but need to sort things fast.",
  fremantle: "Fremantle and the port city have a distinct character - and distinct healthcare challenges. InstantMed works on WA time and connects you with doctors without the trip into Perth.",
  "central-coast": "The Central Coast stretches from Gosford to The Entrance, and doctor availability varies. InstantMed gives the whole region online access to Australian doctors - no drive to Sydney required.",
  penrith: "Western Sydney's growth has outpaced healthcare infrastructure. InstantMed provides an alternative for Penrith, St Marys, and the greater west - fast, from home.",
  ipswich: "Ipswich is one of Australia's fastest-growing cities. Doctor availability hasn't kept up. InstantMed gives you access without the drive to Brisbane or the wait at a walk-in clinic.",
  "port-macquarie": "The Mid North Coast has a significant retiree population and limited after-hours options. InstantMed bridges the gap with 7-day access to Australian doctors.",
  "coffs-harbour": "Coffs Harbour and the Coffs Coast attract tourists and families alike. When you need a doctor, wait times can stretch. InstantMed offers a quick alternative.",
  orange: "The Central West has fewer doctor options than metro areas. InstantMed gives Orange and surrounding towns access to telehealth without the drive to Sydney.",
  dubbo: "Dubbo is the hub of the Orana region. Healthcare access can be challenging. InstantMed connects you with Australian doctors from anywhere with internet.",
  mildura: "Sunraysia's isolation makes telehealth valuable. InstantMed gives Mildura and the Mallee access to doctors without the long drive to Melbourne.",
  shepparton: "The Goulburn Valley has a strong agricultural base and growing population. InstantMed provides flexible healthcare access for Shepparton and the region.",
  gladstone: "Gladstone's industrial workforce often works shifts. InstantMed is designed to work around irregular hours - get a cert or script when you need it.",
  bundaberg: "The Wide Bay-Burnett region has a mix of agriculture, tourism, and retirees. InstantMed offers a simple option when local clinics are booked out.",
  "mount-gambier": "Mount Gambier and the Limestone Coast are a long way from Adelaide. InstantMed brings telehealth to the region - no travel required.",
  "port-augusta": "Port Augusta is a key regional centre for outback South Australia. Healthcare access is limited. InstantMed helps bridge the distance.",
  "alice-springs": "Central Australia faces unique healthcare challenges - vast distances, extreme weather, and limited specialist access. InstantMed provides telehealth for everyday needs.",
}

// City-specific FAQ items
const CITY_FAQS: Record<string, Array<{ q: string; a: string }>> = {
  sydney: [
    { q: "Can I use InstantMed if I live in Western Sydney?", a: "Yes - InstantMed is available anywhere in Greater Sydney, from Penrith to Bondi. All you need is an internet connection." },
    { q: "Can NSW employers use InstantMed certificates as evidence?", a: "Yes. Our certificates are issued by AHPRA-registered doctors and include standard workplace evidence details. Employer policies may vary." },
    { q: "How fast can I get a medical certificate in Sydney?", a: "Review timing depends on doctor availability and whether follow-up information is needed. Approved certificates are emailed as a PDF." },
  ],
  melbourne: [
    { q: "Is InstantMed available across all of Melbourne?", a: "Yes - from the CBD to the outer suburbs. We serve all of Greater Melbourne and regional Victoria." },
    { q: "Can I get an eScript filled at a Melbourne pharmacy?", a: "Yes. Your eScript can be filled at any pharmacy in Melbourne. Just show the QR code on your phone." },
    { q: "Do I need a Medicare card to use InstantMed in Victoria?", a: "No Medicare card is required. InstantMed is a private service with transparent flat-fee pricing." },
  ],
  brisbane: [
    { q: "Does InstantMed work in Greater Brisbane?", a: "Yes - we serve all Brisbane suburbs, from the CBD to Logan, Ipswich and Redcliffe." },
    { q: "Can Queensland employers use these certificates as evidence?", a: "Yes. Our AHPRA-registered doctors issue certificates with standard workplace evidence details. Employer policies may vary." },
    { q: "Can I get a repeat script through InstantMed in Brisbane?", a: "Yes. If you have an existing prescription, we can arrange a repeat via eScript sent to your phone." },
  ],
  perth: [
    { q: "Does InstantMed account for WA time zones?", a: "Yes. Our platform is available 7 days a week and clinical reviews are available across all Australian time zones, including AWST." },
    { q: "Can I use InstantMed in regional WA?", a: "Yes - anywhere in Western Australia with internet access. We serve Perth metro and all regional areas." },
    { q: "How do eScripts work in Western Australia?", a: "eScripts work the same way across Australia. You receive a QR code via SMS that any pharmacy can scan." },
  ],
  adelaide: [
    { q: "Is InstantMed available in South Australia?", a: "Yes - we serve all of Adelaide and regional SA. All you need is an internet connection." },
    { q: "Is your doctor registered in South Australia?", a: "Our AHPRA-registered Medical Director can practise anywhere in Australia, including SA. AHPRA registration is national." },
    { q: "How much does a medical certificate cost in Adelaide?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. The same price applies regardless of your location.` },
  ],
}

// Fallback FAQs for cities without specific ones
const DEFAULT_FAQS = [
  { q: "Is InstantMed available in my area?", a: "Yes - InstantMed works anywhere in Australia with an internet connection. No matter your location, an AHPRA-registered doctor can help." },
  { q: "Can employers use your medical certificates as evidence?", a: "Yes. Our certificates are issued by AHPRA-registered doctors and include standard workplace evidence details. Employer and institution policies may vary." },
  { q: "How fast will I receive my medical certificate?", a: "Review timing depends on doctor availability and whether follow-up information is needed. Approved certificates are emailed as a PDF." },
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
    localTestimonial: {
      name: "Sarah M.",
      quote: "Got my med cert sorted while stuck on a train at Town Hall. Absolute lifesaver!",
    },
  },
  melbourne: {
    name: "Melbourne",
    state: "VIC",
    slug: "melbourne",
    population: "5.1 million",
    localTestimonial: { name: "James L.", quote: "Way easier than trying to get a same-day appointment in the CBD." },
  },
  brisbane: {
    name: "Brisbane",
    state: "QLD",
    slug: "brisbane",
    population: "2.5 million",
    localTestimonial: {
      name: "Emma T.",
      quote: "Perfect for when you need something quick without leaving Fortitude Valley.",
    },
  },
  perth: {
    name: "Perth",
    state: "WA",
    slug: "perth",
    population: "2.1 million",
    localTestimonial: { name: "Michael K.", quote: "Finally a service that understands WA time zone!" },
  },
  adelaide: {
    name: "Adelaide",
    state: "SA",
    slug: "adelaide",
    population: "1.4 million",
    localTestimonial: {
      name: "Lisa R.",
      quote: "Quick, easy, and the doctors actually take their time to read your symptoms.",
    },
  },
  "gold-coast": {
    name: "Gold Coast",
    state: "QLD",
    slug: "gold-coast",
    population: "700,000",
    localTestimonial: {
      name: "Chris D.",
      quote: "Got my script while at Surfers. Picked it up from the pharmacy an hour later.",
    },
  },
  canberra: {
    name: "Canberra",
    state: "ACT",
    slug: "canberra",
    population: "460,000",
    localTestimonial: { name: "Nicole W.", quote: "Better than waiting weeks for a bulk-billing appointment." },
  },
  newcastle: {
    name: "Newcastle",
    state: "NSW",
    slug: "newcastle",
    population: "320,000",
    localTestimonial: { name: "David H.", quote: "Super convenient when you&apos;re too crook to drive to the doctor." },
  },
  hobart: {
    name: "Hobart",
    state: "TAS",
    slug: "hobart",
    population: "240,000",
    localTestimonial: { name: "Amy S.", quote: "Great option when you can&apos;t get in to see anyone locally." },
  },
  darwin: {
    name: "Darwin",
    state: "NT",
    slug: "darwin",
    population: "150,000",
    localTestimonial: { name: "Tom B.", quote: "Works perfectly even in the Top End. Fast service." },
  },
  "sunshine-coast": {
    name: "Sunshine Coast",
    state: "QLD",
    slug: "sunshine-coast",
    population: "350,000",
    localTestimonial: { name: "Kate P.", quote: "So much easier than trying to find a doctor with availability in Noosa." },
  },
  wollongong: {
    name: "Wollongong",
    state: "NSW",
    slug: "wollongong",
    population: "310,000",
    localTestimonial: { name: "Ryan C.", quote: "Got my med cert while recovering at home. Didn't have to drive to the city." },
  },
  geelong: {
    name: "Geelong",
    state: "VIC",
    slug: "geelong",
    population: "270,000",
    localTestimonial: { name: "Sophie W.", quote: "Finally a telehealth service that's quick and reliable for Geelong." },
  },
  townsville: {
    name: "Townsville",
    state: "QLD",
    slug: "townsville",
    population: "195,000",
    localTestimonial: { name: "Daniel M.", quote: "Perfect for up here in the tropics. Fast and professional." },
  },
  cairns: {
    name: "Cairns",
    state: "QLD",
    slug: "cairns",
    population: "160,000",
    localTestimonial: { name: "Jess A.", quote: "Great for when you can't get a doctor appointment in FNQ." },
  },
  toowoomba: {
    name: "Toowoomba",
    state: "QLD",
    slug: "toowoomba",
    population: "140,000",
    localTestimonial: { name: "Matt H.", quote: "Brilliant service for regional QLD. Quick turnaround." },
  },
  ballarat: {
    name: "Ballarat",
    state: "VIC",
    slug: "ballarat",
    population: "115,000",
    localTestimonial: { name: "Emily G.", quote: "So much better than waiting at a walk-in clinic." },
  },
  bendigo: {
    name: "Bendigo",
    state: "VIC",
    slug: "bendigo",
    population: "100,000",
    localTestimonial: { name: "Steve R.", quote: "Easy to use and got my certificate after doctor approval." },
  },
  launceston: {
    name: "Launceston",
    state: "TAS",
    slug: "launceston",
    population: "90,000",
    localTestimonial: { name: "Lauren T.", quote: "Great option for Tassie when local GPs are fully booked." },
  },
  mackay: {
    name: "Mackay",
    state: "QLD",
    slug: "mackay",
    population: "85,000",
    localTestimonial: { name: "Josh F.", quote: "Works great even from the mining regions. Reliable service." },
  },
  rockhampton: {
    name: "Rockhampton",
    state: "QLD",
    slug: "rockhampton",
    population: "80,000",
    localTestimonial: { name: "Tina K.", quote: "Saved me a trip to Rocky when I was feeling awful." },
  },
  bunbury: {
    name: "Bunbury",
    state: "WA",
    slug: "bunbury",
    population: "75,000",
    localTestimonial: { name: "Craig N.", quote: "Excellent for regional WA. No more driving to Perth." },
  },
  "wagga-wagga": {
    name: "Wagga Wagga",
    state: "NSW",
    slug: "wagga-wagga",
    population: "65,000",
    localTestimonial: { name: "Mel J.", quote: "Perfect for the Riverina. Quick, easy, professional." },
  },
  "albury-wodonga": {
    name: "Albury-Wodonga",
    state: "NSW/VIC",
    slug: "albury-wodonga",
    population: "95,000",
    localTestimonial: { name: "Sam L.", quote: "Great service for the border region. Very impressed." },
  },
  "hervey-bay": {
    name: "Hervey Bay",
    state: "QLD",
    slug: "hervey-bay",
    population: "55,000",
    localTestimonial: { name: "Linda B.", quote: "Fantastic for retirees. Simple to use and affordable." },
  },
  parramatta: {
    name: "Parramatta",
    state: "NSW",
    slug: "parramatta",
    population: "270,000",
    localTestimonial: { name: "Marcus T.", quote: "Got my cert sorted on the train to work. Certificate in my inbox before I reached Central." },
  },
  "bondi-beach": {
    name: "Bondi Beach",
    state: "NSW",
    slug: "bondi-beach",
    population: "12,000",
    localTestimonial: { name: "Sarah K.", quote: "No more waiting at the medical centre. Sorted from home before the school run." },
  },
  fremantle: {
    name: "Fremantle",
    state: "WA",
    slug: "fremantle",
    population: "32,000",
    localTestimonial: { name: "Jake M.", quote: "Freo local - telehealth makes so much sense when you're juggling shift work." },
  },
  "central-coast": {
    name: "Central Coast",
    state: "NSW",
    slug: "central-coast",
    population: "340,000",
    localTestimonial: { name: "Emma L.", quote: "Coastie here - way better than the drive to Gosford or Sydney for a quick cert." },
  },
  penrith: {
    name: "Penrith",
    state: "NSW",
    slug: "penrith",
    population: "220,000",
    localTestimonial: { name: "David P.", quote: "Western Sydney needs this. Got my script renewed without the 2-hour round trip." },
  },
  ipswich: {
    name: "Ipswich",
    state: "QLD",
    slug: "ipswich",
    population: "230,000",
    localTestimonial: { name: "Rachel W.", quote: "Ipswich to Brisbane for a doctor? No thanks. InstantMed sorted me from home." },
  },
  "port-macquarie": {
    name: "Port Macquarie",
    state: "NSW",
    slug: "port-macquarie",
    population: "50,000",
    localTestimonial: { name: "Tom R.", quote: "Mid North Coast - limited bulk billing. This fills a real gap." },
  },
  "coffs-harbour": {
    name: "Coffs Harbour",
    state: "NSW",
    slug: "coffs-harbour",
    population: "75,000",
    localTestimonial: { name: "Lisa M.", quote: "Regional NSW needs options. Fast and professional." },
  },
  orange: {
    name: "Orange",
    state: "NSW",
    slug: "orange",
    population: "42,000",
    localTestimonial: { name: "James O.", quote: "Central West - doctor wait times are brutal. This helps." },
  },
  dubbo: {
    name: "Dubbo",
    state: "NSW",
    slug: "dubbo",
    population: "43,000",
    localTestimonial: { name: "Kate D.", quote: "Orana region - telehealth makes so much sense for us." },
  },
  mildura: {
    name: "Mildura",
    state: "VIC",
    slug: "mildura",
    population: "55,000",
    localTestimonial: { name: "Steve M.", quote: "Sunraysia - limited specialists. Great for everyday stuff." },
  },
  shepparton: {
    name: "Shepparton",
    state: "VIC",
    slug: "shepparton",
    population: "65,000",
    localTestimonial: { name: "Anna S.", quote: "Goulburn Valley - quick turnaround when you need it." },
  },
  gladstone: {
    name: "Gladstone",
    state: "QLD",
    slug: "gladstone",
    population: "35,000",
    localTestimonial: { name: "Mike G.", quote: "Industrial town - shift workers need flexible options. This works." },
  },
  bundaberg: {
    name: "Bundaberg",
    state: "QLD",
    slug: "bundaberg",
    population: "72,000",
    localTestimonial: { name: "Sue B.", quote: "Wide Bay - simple and reliable. No more waiting weeks." },
  },
  "mount-gambier": {
    name: "Mount Gambier",
    state: "SA",
    slug: "mount-gambier",
    population: "28,000",
    localTestimonial: { name: "Peter M.", quote: "Limestone Coast - telehealth bridges the distance to Adelaide." },
  },
  "port-augusta": {
    name: "Port Augusta",
    state: "SA",
    slug: "port-augusta",
    population: "14,000",
    localTestimonial: { name: "Jenny P.", quote: "Outback SA - healthcare access is tough. This helps." },
  },
  "alice-springs": {
    name: "Alice Springs",
    state: "NT",
    slug: "alice-springs",
    population: "28,000",
    localTestimonial: { name: "Rob A.", quote: "Central Australia - distance is the enemy. Telehealth wins." },
  },
}

interface PageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params
  const cityData = cities[city]
  if (!cityData) return {}

  return {
    title: { absolute: `Online Doctor ${cityData.name} | Med Certs from ${PRICING_DISPLAY.MED_CERT} | InstantMed` },
    description: `Skip the ${cityData.name} GP queue. AHPRA-registered Australian doctors review online. Med certs from ${PRICING_DISPLAY.MED_CERT}, repeat scripts. No appointment needed.`,
    keywords: [
      `online doctor ${cityData.name.toLowerCase()}`,
      `telehealth ${cityData.name.toLowerCase()}`,
      `medical certificate ${cityData.name.toLowerCase()}`,
      `online prescription ${cityData.name.toLowerCase()}`,
      `doctor ${cityData.name.toLowerCase()}`,
    ],
    openGraph: {
      title: `Online Doctor ${cityData.name} | InstantMed`,
      description: `Skip the ${cityData.name} GP queue. AHPRA-registered Australian doctors review online. Med certs from ${PRICING_DISPLAY.MED_CERT}, repeat scripts. No appointment needed.`,
      url: `https://instantmed.com.au/locations/${city}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Online Doctor ${cityData.name} | InstantMed`,
      description: `Skip the ${cityData.name} GP queue. AHPRA-registered Australian doctors review online. Med certs from ${PRICING_DISPLAY.MED_CERT}, repeat scripts. No appointment needed.`,
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

  const deepContent = DEEP_CITY_CONTENT[city]
  const faqs = [...(CITY_FAQS[city] || DEFAULT_FAQS), ...(deepContent?.additionalFaqs ?? [])]
  const cityContent = CITY_CONTENT[city]

  // We don't operate a physical clinic in each city — describe the service
  // available in that area rather than declaring a per-city MedicalBusiness
  // (which Google can treat as misleading-location and which creates
  // multiple un-linked Organization nodes across the site).
  const localSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `https://instantmed.com.au/locations/${city}#service`,
    name: `Online Doctor in ${cityData.name}`,
    description: `Online doctor consultations, medical certificates, and prescriptions for ${cityData.name} residents. AHPRA-registered Australian doctors.`,
    url: `https://instantmed.com.au/locations/${city}`,
    provider: { "@id": "https://instantmed.com.au/#organization" },
    serviceType: "Telehealth",
    areaServed: {
      "@type": "City",
      name: cityData.name,
      containedInPlace: {
        "@type": "State",
        name: cityData.state,
        containedInPlace: { "@type": "Country", name: "Australia" }
      },
    },
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
          price: PRICING.MED_CERT.toFixed(2),
          priceCurrency: "AUD"
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "MedicalProcedure",
            name: "Online Prescription",
            description: "eScript prescription sent to your phone"
          },
          price: PRICING.REPEAT_SCRIPT.toFixed(2),
          priceCurrency: "AUD"
        }
      ]
    }
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

  const otherCities = Object.values(cities)
    .filter((c) => c.slug !== city)
    .slice(0, 8)
    .map((c) => ({ name: c.name, slug: c.slug }))

  return (
    <>
      <script
        id="local-schema"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(localSchema) }}
      />
      <script
        id="faq-schema"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Locations", url: "https://instantmed.com.au/locations" },
          { name: cityData.name, url: `https://instantmed.com.au/locations/${city}` },
        ]}
      />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <LocationPageContent
            city={city}
            cityData={cityData}
            cityContent={cityContent}
            deepContent={deepContent}
            faqs={faqs}
            otherCities={otherCities}
          />
        </main>

        <Footer />
      </div>
    </>
  )
}
