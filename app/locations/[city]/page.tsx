import { notFound } from "next/navigation"

import { LocationPageContent } from "@/components/marketing/location-page-content"
import {
  defineProgrammaticSeoRoute,
  ProgrammaticPageSchemas,
} from "@/components/seo"
import { JsonLdScript } from "@/components/seo/schemas/json-ld-script"
import { Footer } from "@/components/shared/footer"
import { Navbar } from "@/components/shared/navbar"
import { DEFAULT_APP_URL, PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { DEEP_CITY_CONTENT } from "@/lib/seo/data/deep-city-content"
import { shouldIndexLocation } from "@/lib/seo/index-policy"

const AVAILABILITY = getApprovedClaim("availability_24_7")
const CERTIFICATE_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")
const PRESCRIBING_IDENTITY_REQUIRED = getApprovedClaim("prescribing_identity_required")
const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")
const PRESCRIPTION_IF_APPROVED = getApprovedClaim("prescription_if_approved")

// City-specific content paragraphs for unique SEO value
const CITY_CONTENT: Record<string, string> = {
  sydney: "Sydney residents can submit a medical certificate or repeat prescription review request online, from the Eastern Suburbs and Inner West to Parramatta.",
  melbourne: "Melbourne residents can submit a medical certificate or repeat prescription review request online, from Brunswick and Brighton to the outer suburbs.",
  brisbane: "Brisbane residents can submit a medical certificate or repeat prescription review request online, from the CBD to the suburbs.",
  perth: "Perth residents can submit a medical certificate or repeat prescription review request online, including across WA time zones.",
  adelaide: "Adelaide residents can submit a medical certificate or repeat prescription review request without driving across the city, from Glenelg to the Adelaide Hills.",
  "gold-coast": "Whether you're a local or visiting the Gold Coast, getting a doctor appointment at short notice can be tricky. InstantMed lets you submit medical-certificate requests and repeat-prescription review requests from Broadbeach, Burleigh, or anywhere along the coast.",
  canberra: "Canberra residents can submit a medical certificate or repeat prescription review request online, from Civic to Tuggeranong and across the ACT.",
  newcastle: "Newcastle and Hunter Valley residents can submit a medical certificate or repeat prescription review request online, from Merewether to Maitland.",
  hobart: "Hobart and Southern Tasmania have limited after-hours doctor options. InstantMed lets you submit medical-certificate requests and repeat-prescription review requests online without leaving home.",
  darwin: "In the Top End, extreme weather and distance can make doctor visits difficult. InstantMed lets you submit medical-certificate requests and repeat-prescription review requests from the CBD, Palmerston, or further afield.",
  "sunshine-coast": "The Sunshine Coast's popularity means doctor clinics are often overloaded, especially in peak season. From Noosa to Caloundra, InstantMed lets you submit medical-certificate requests and repeat-prescription review requests online.",
  wollongong: "Illawarra residents often face long local waits or a drive to Sydney for a doctor. InstantMed lets you submit medical-certificate requests and repeat-prescription review requests from home.",
  geelong: "Geelong is growing fast, and doctor availability hasn't kept up. InstantMed lets you submit medical-certificate requests and repeat-prescription review requests without the drive to Melbourne.",
  townsville: "North Queensland's limited specialist availability makes telehealth valuable. InstantMed lets Townsville residents submit medical-certificate requests and repeat-prescription review requests online.",
  cairns: "Far North Queensland can be challenging for doctor access, especially in the wet season. InstantMed lets Cairns residents submit medical-certificate requests and repeat-prescription review requests online.",
  toowoomba: "Toowoomba and the Darling Downs can face doctor shortages, especially outside business hours. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online.",
  ballarat: "Ballarat and regional Victoria have fewer doctor options than Melbourne. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests without the drive.",
  bendigo: "Bendigo's growing population means doctor wait times are increasing. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online around their schedule.",
  launceston: "Northern Tasmania's doctor availability can be limited. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online.",
  mackay: "The Mackay region, including the mining communities of the Bowen Basin, can face limited doctor access. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests around shift patterns and remote schedules.",
  rockhampton: "Central Queensland's vast distances make doctor visits time-consuming. InstantMed lets Rockhampton residents submit medical-certificate requests and repeat-prescription review requests without the drive.",
  bunbury: "South-West WA has fewer doctor options than Perth. InstantMed lets Bunbury and surrounding-area residents submit medical-certificate requests and repeat-prescription review requests online without a trip to the city.",
  "wagga-wagga": "The Riverina's doctor shortages are well documented. InstantMed lets Wagga residents submit medical-certificate requests and repeat-prescription review requests from home.",
  "albury-wodonga": "Straddling the NSW-Victoria border can complicate healthcare. InstantMed lets Albury-Wodonga residents submit medical-certificate requests and repeat-prescription review requests from either side of the Murray.",
  "hervey-bay": "Hervey Bay and the Fraser Coast have a growing retiree population and limited doctor availability. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online.",
  parramatta: "Parramatta and Western Sydney face some of the longest GP wait times in the country. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online without the commute.",
  "bondi-beach": "Eastern suburbs medical centres can have long waits. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests without joining a clinic queue.",
  fremantle: "Fremantle and the port city have distinct healthcare challenges. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online without the trip into Perth.",
  "central-coast": "The Central Coast stretches from Gosford to The Entrance, and doctor availability varies. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online without driving to Sydney.",
  penrith: "Western Sydney's growth has outpaced healthcare infrastructure. InstantMed lets Penrith, St Marys, and greater-west residents submit medical-certificate requests and repeat-prescription review requests from home.",
  ipswich: "Ipswich is one of Australia's fastest-growing cities, and doctor availability has not kept up. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests without driving to Brisbane.",
  "port-macquarie": "The Mid North Coast has a significant retiree population and limited after-hours options. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online.",
  "coffs-harbour": "Coffs Harbour and the Coffs Coast attract tourists and families alike, while doctor wait times can stretch. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online.",
  orange: "The Central West has fewer doctor options than metro areas. InstantMed lets Orange and surrounding-town residents submit medical-certificate requests and repeat-prescription review requests without driving to Sydney.",
  dubbo: "Dubbo is the hub of the Orana region, where healthcare access can be challenging. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests from anywhere with internet access.",
  mildura: "Sunraysia's isolation makes telehealth valuable. InstantMed lets Mildura and Mallee residents submit medical-certificate requests and repeat-prescription review requests online without the long drive to Melbourne.",
  shepparton: "The Goulburn Valley has a strong agricultural base and growing population. InstantMed lets Shepparton residents submit medical-certificate requests and repeat-prescription review requests online.",
  gladstone: "Gladstone's industrial workforce often works shifts. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests around irregular hours.",
  bundaberg: "The Wide Bay-Burnett region has a mix of agriculture, tourism, and retirees. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests when local clinics are booked out.",
  "mount-gambier": "Mount Gambier and the Limestone Coast are a long way from Adelaide. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests without travelling to the city.",
  "port-augusta": "Port Augusta is a key regional centre for outback South Australia, where healthcare access is limited. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online.",
  "alice-springs": "Central Australia faces unique healthcare challenges, including vast distances and extreme weather. InstantMed lets residents submit medical-certificate requests and repeat-prescription review requests online.",
}

// City-specific FAQ items
const CITY_FAQS: Record<string, Array<{ q: string; a: string }>> = {
  sydney: [
    { q: "Can I use InstantMed if I live in Western Sydney?", a: "Yes - InstantMed is available anywhere in Greater Sydney, from Penrith to Bondi. All you need is an internet connection." },
    { q: "Can NSW employers use InstantMed certificates as evidence?", a: `${CERTIFICATE_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
    { q: "When can I submit a medical certificate request in Sydney?", a: `${AVAILABILITY} If approved, the certificate is emailed as a PDF.` },
  ],
  melbourne: [
    { q: "Is InstantMed available across all of Melbourne?", a: "Yes - from the CBD to the outer suburbs. We serve all of Greater Melbourne and regional Victoria." },
    { q: "What happens if a prescription is approved in Melbourne?", a: PRESCRIPTION_IF_APPROVED },
    { q: "Do I need a Medicare card to use InstantMed in Victoria?", a: `Medical certificates do not require Medicare. ${PRESCRIBING_IDENTITY_REQUIRED} InstantMed is a private service with transparent flat-fee pricing.` },
  ],
  brisbane: [
    { q: "Does InstantMed work in Greater Brisbane?", a: "Yes - we serve all Brisbane suburbs, from the CBD to Logan, Ipswich and Redcliffe." },
    { q: "Can Queensland employers use these certificates as evidence?", a: `${CERTIFICATE_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
    { q: "Can I get a repeat script through InstantMed in Brisbane?", a: PRESCRIPTION_IF_APPROVED },
  ],
  perth: [
    { q: "Does InstantMed account for WA time zones?", a: "Yes. Our platform is available 7 days a week and clinical reviews are available across all Australian time zones, including AWST." },
    { q: "Can I use InstantMed in regional WA?", a: "Yes - anywhere in Western Australia with internet access. We serve Perth metro and all regional areas." },
    { q: "What happens if a prescription is approved in Western Australia?", a: PRESCRIPTION_IF_APPROVED },
  ],
  adelaide: [
    { q: "Is InstantMed available in South Australia?", a: "Yes - we serve all of Adelaide and regional SA. All you need is an internet connection." },
    { q: "Is your doctor registered in South Australia?", a: "Our AHPRA-registered Medical Director can practise anywhere in Australia, including SA. AHPRA registration is national." },
    { q: "How much does a medical certificate cost in Adelaide?", a: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}. The same price applies regardless of your location.` },
  ],
}

// Fallback FAQs for cities without specific ones
const DEFAULT_FAQS = [
  { q: "Is InstantMed available in my area?", a: `Yes. InstantMed works anywhere in Australia with an internet connection. ${CLINICAL_REVIEW_SEQUENCE}` },
  { q: "Can employers use your medical certificates as evidence?", a: `${CERTIFICATE_SCOPE} ${EMPLOYER_POLICY_CAVEAT}` },
  { q: "When can I submit a medical certificate request?", a: `${AVAILABILITY} If approved, the certificate is emailed as a PDF.` },
]

// Local SEO Pages - Top 25 Australian cities & regions
const cities: Record<
  string,
  {
    name: string
    state: string
    slug: string
    population: string
  }
> = {
  sydney: {
    name: "Sydney",
    state: "NSW",
    slug: "sydney",
    population: "5.3 million",
  },
  melbourne: {
    name: "Melbourne",
    state: "VIC",
    slug: "melbourne",
    population: "5.1 million",
  },
  brisbane: {
    name: "Brisbane",
    state: "QLD",
    slug: "brisbane",
    population: "2.5 million",
  },
  perth: {
    name: "Perth",
    state: "WA",
    slug: "perth",
    population: "2.1 million",
  },
  adelaide: {
    name: "Adelaide",
    state: "SA",
    slug: "adelaide",
    population: "1.4 million",
  },
  "gold-coast": {
    name: "Gold Coast",
    state: "QLD",
    slug: "gold-coast",
    population: "700,000",
  },
  canberra: {
    name: "Canberra",
    state: "ACT",
    slug: "canberra",
    population: "460,000",
  },
  newcastle: {
    name: "Newcastle",
    state: "NSW",
    slug: "newcastle",
    population: "320,000",
  },
  hobart: {
    name: "Hobart",
    state: "TAS",
    slug: "hobart",
    population: "240,000",
  },
  darwin: {
    name: "Darwin",
    state: "NT",
    slug: "darwin",
    population: "150,000",
  },
  "sunshine-coast": {
    name: "Sunshine Coast",
    state: "QLD",
    slug: "sunshine-coast",
    population: "350,000",
  },
  wollongong: {
    name: "Wollongong",
    state: "NSW",
    slug: "wollongong",
    population: "310,000",
  },
  geelong: {
    name: "Geelong",
    state: "VIC",
    slug: "geelong",
    population: "270,000",
  },
  townsville: {
    name: "Townsville",
    state: "QLD",
    slug: "townsville",
    population: "195,000",
  },
  cairns: {
    name: "Cairns",
    state: "QLD",
    slug: "cairns",
    population: "160,000",
  },
  toowoomba: {
    name: "Toowoomba",
    state: "QLD",
    slug: "toowoomba",
    population: "140,000",
  },
  ballarat: {
    name: "Ballarat",
    state: "VIC",
    slug: "ballarat",
    population: "115,000",
  },
  bendigo: {
    name: "Bendigo",
    state: "VIC",
    slug: "bendigo",
    population: "100,000",
  },
  launceston: {
    name: "Launceston",
    state: "TAS",
    slug: "launceston",
    population: "90,000",
  },
  mackay: {
    name: "Mackay",
    state: "QLD",
    slug: "mackay",
    population: "85,000",
  },
  rockhampton: {
    name: "Rockhampton",
    state: "QLD",
    slug: "rockhampton",
    population: "80,000",
  },
  bunbury: {
    name: "Bunbury",
    state: "WA",
    slug: "bunbury",
    population: "75,000",
  },
  "wagga-wagga": {
    name: "Wagga Wagga",
    state: "NSW",
    slug: "wagga-wagga",
    population: "65,000",
  },
  "albury-wodonga": {
    name: "Albury-Wodonga",
    state: "NSW/VIC",
    slug: "albury-wodonga",
    population: "95,000",
  },
  "hervey-bay": {
    name: "Hervey Bay",
    state: "QLD",
    slug: "hervey-bay",
    population: "55,000",
  },
  parramatta: {
    name: "Parramatta",
    state: "NSW",
    slug: "parramatta",
    population: "270,000",
  },
  "bondi-beach": {
    name: "Bondi Beach",
    state: "NSW",
    slug: "bondi-beach",
    population: "12,000",
  },
  fremantle: {
    name: "Fremantle",
    state: "WA",
    slug: "fremantle",
    population: "32,000",
  },
  "central-coast": {
    name: "Central Coast",
    state: "NSW",
    slug: "central-coast",
    population: "340,000",
  },
  penrith: {
    name: "Penrith",
    state: "NSW",
    slug: "penrith",
    population: "220,000",
  },
  ipswich: {
    name: "Ipswich",
    state: "QLD",
    slug: "ipswich",
    population: "230,000",
  },
  "port-macquarie": {
    name: "Port Macquarie",
    state: "NSW",
    slug: "port-macquarie",
    population: "50,000",
  },
  "coffs-harbour": {
    name: "Coffs Harbour",
    state: "NSW",
    slug: "coffs-harbour",
    population: "75,000",
  },
  orange: {
    name: "Orange",
    state: "NSW",
    slug: "orange",
    population: "42,000",
  },
  dubbo: {
    name: "Dubbo",
    state: "NSW",
    slug: "dubbo",
    population: "43,000",
  },
  mildura: {
    name: "Mildura",
    state: "VIC",
    slug: "mildura",
    population: "55,000",
  },
  shepparton: {
    name: "Shepparton",
    state: "VIC",
    slug: "shepparton",
    population: "65,000",
  },
  gladstone: {
    name: "Gladstone",
    state: "QLD",
    slug: "gladstone",
    population: "35,000",
  },
  bundaberg: {
    name: "Bundaberg",
    state: "QLD",
    slug: "bundaberg",
    population: "72,000",
  },
  "mount-gambier": {
    name: "Mount Gambier",
    state: "SA",
    slug: "mount-gambier",
    population: "28,000",
  },
  "port-augusta": {
    name: "Port Augusta",
    state: "SA",
    slug: "port-augusta",
    population: "14,000",
  },
  "alice-springs": {
    name: "Alice Springs",
    state: "NT",
    slug: "alice-springs",
    population: "28,000",
  },
}

interface PageProps {
  params: Promise<{ city: string }>
}

const getCityBySlug = (slug: string) => cities[slug]

const seoRoute = defineProgrammaticSeoRoute({
  basePath: "/locations",
  breadcrumb: {
    current: ({ entry }) => entry.name,
    parent: { name: "Locations", pathname: "/locations" },
  },
  faqs: ({ slug }) => [
    ...(CITY_FAQS[slug] || DEFAULT_FAQS),
    ...(DEEP_CITY_CONTENT[slug]?.additionalFaqs ?? []),
  ],
  getEntry: getCityBySlug,
  getSlugs: () => Object.keys(cities),
  indexable: ({ slug }) => shouldIndexLocation(slug),
  metadata: ({ entry }) => {
    const description = `InstantMed serves ${entry.name} with routine medical certificate requests and repeat medication reviews online. Secure form, no booked appointment, from ${PRICING_DISPLAY.MED_CERT}.`

    return {
      description,
      keywords: [
        `medical certificate ${entry.name.toLowerCase()}`,
        `online medical certificate ${entry.name.toLowerCase()}`,
        `medical certificate online ${entry.name.toLowerCase()}`,
        `online doctor ${entry.name.toLowerCase()}`,
        `online prescription ${entry.name.toLowerCase()}`,
        `telehealth ${entry.name.toLowerCase()}`,
      ],
      openGraph: {
        description,
        title: `Online Medical Certificate ${entry.name} | InstantMed`,
      },
      title: {
        absolute: `Online Medical Certificate ${entry.name} | From ${PRICING_DISPLAY.MED_CERT} | InstantMed`,
      },
      twitter: {
        card: "summary_large_image",
        description,
        title: `Online Medical Certificate ${entry.name} | InstantMed`,
      },
    }
  },
  param: "city",
})

export const generateMetadata = seoRoute.generateMetadata
export const generateStaticParams = seoRoute.generateStaticParams

export default async function CityPage({ params }: PageProps) {
  const resolved = await seoRoute.resolve(params)

  if (!resolved) {
    notFound()
  }

  const { canonical: cityUrl, entry: cityData, slug: city } = resolved

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
    "@id": `${cityUrl}#service`,
    name: `Online Medical Certificates in ${cityData.name}`,
    description: `Online medical-certificate requests and repeat medication reviews for ${cityData.name} residents. ${CLINICAL_REVIEW_SEQUENCE}`,
    url: cityUrl,
    provider: { "@id": `${DEFAULT_APP_URL}/#organization` },
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
            name: "Repeat Prescription Review",
            description: PRESCRIPTION_IF_APPROVED
          },
          price: PRICING.REPEAT_SCRIPT.toFixed(2),
          priceCurrency: "AUD"
        }
      ]
    }
  }

  const otherCities = Object.values(cities)
    .filter((c) => c.slug !== city)
    .slice(0, 8)
    .map((c) => ({ name: c.name, slug: c.slug }))

  return (
    <>
      <JsonLdScript
        data={localSchema}
        id="local-schema"
      />
      <ProgrammaticPageSchemas page={resolved} />

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
