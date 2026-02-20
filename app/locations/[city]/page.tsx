import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, Clock, Shield, Star, CheckCircle2, HelpCircle } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"
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
}

// City-specific content paragraphs for unique SEO value
const CITY_CONTENT: Record<string, string> = {
  sydney: "Sydney residents can skip crowded CBD clinics and long waits at bulk-billing practices. Whether you're in the Eastern Suburbs, Inner West or out in Parramatta, InstantMed connects you with a doctor from anywhere with phone signal.",
  melbourne: "From Brunswick to Brighton, Melbourne's notoriously long doctor wait times are a thing of the past. InstantMed lets you see a doctor without braving the weather or the traffic — perfect for those days when you really can't leave the house.",
  brisbane: "Brisbane's growing population means longer doctor wait times across the city. From the CBD to the suburbs, InstantMed gives you access to Australian-registered doctors without the queue — even during school holidays and peak flu season.",
  perth: "Perth's isolation means fewer doctor options, especially in outer suburbs. InstantMed works on WA time and connects you with doctors who understand the unique needs of Western Australian patients, no matter where you are in the metro area.",
  adelaide: "Adelaide patients can avoid the scramble for same-day doctor appointments. InstantMed is ideal for when you need a quick med cert or script without driving across the city — from Glenelg to the Adelaide Hills.",
  "gold-coast": "Whether you're a local or visiting the Gold Coast, getting a doctor appointment at short notice can be tricky. InstantMed lets you sort a med cert or script from Broadbeach, Burleigh or anywhere along the coast.",
  canberra: "Canberra's limited bulk-billing options and long wait times make telehealth a practical choice for public servants and students alike. InstantMed is available across the ACT, from Civic to Tuggeranong.",
  newcastle: "Newcastle and the Hunter Valley can face long waits for same-day doctor availability. InstantMed gives you access to Australian doctors from anywhere in the region — from Merewether to Maitland.",
  hobart: "Hobart and Southern Tasmania have limited after-hours doctor options. InstantMed bridges the gap, giving you access to Australian-registered doctors seven days a week without leaving your home.",
  darwin: "In the Top End, extreme weather and distance can make doctor visits difficult. InstantMed works on NT time and is available whether you're in the CBD, Palmerston, or further afield.",
  "sunshine-coast": "The Sunshine Coast's popularity means doctor clinics are often overloaded, especially in peak season. From Noosa to Caloundra, InstantMed offers a quick alternative to long clinic waits.",
  wollongong: "Illawarra residents often face the choice of a long wait locally or driving to Sydney for a doctor. InstantMed lets you stay in the Gong and get sorted from your couch.",
  geelong: "Geelong is growing fast, and doctor availability hasn't kept up. InstantMed gives you same-day access to doctors without the drive to Melbourne or the wait at a walk-in clinic.",
  townsville: "North Queensland's limited specialist availability makes telehealth essential. InstantMed connects Townsville patients with Australian doctors for everyday health needs, rain or shine.",
  cairns: "Far North Queensland can be challenging for doctor access, especially in the wet season. InstantMed keeps you connected to healthcare from anywhere in the Cairns region.",
  toowoomba: "Toowoomba and the Darling Downs can face doctor shortages, especially outside business hours. InstantMed gives you flexible access to Australian doctors when you need them.",
  ballarat: "Ballarat and regional Victoria have fewer doctor options than Melbourne. InstantMed lets you get medical certificates and scripts without the drive or the wait.",
  bendigo: "Bendigo's growing population means doctor wait times are increasing. InstantMed provides an alternative that works around your schedule — no appointments needed.",
  launceston: "Northern Tasmania's doctor availability can be limited. InstantMed bridges the gap with same-day access to Australian-registered doctors, seven days a week.",
  mackay: "The Mackay region, including the mining communities of the Bowen Basin, can face limited doctor access. InstantMed is designed to work around shift patterns and remote schedules.",
  rockhampton: "Central Queensland's vast distances make doctor visits time-consuming. InstantMed lets Rockhampton residents get healthcare sorted without the drive.",
  bunbury: "South-West WA has fewer doctor options than Perth. InstantMed gives Bunbury and surrounding area residents access to doctors without a trip to the city.",
  "wagga-wagga": "The Riverina's doctor shortages are well documented. InstantMed gives Wagga residents the same access to healthcare as metro patients — fast and from home.",
  "albury-wodonga": "Straddling the NSW-Victoria border can complicate healthcare. InstantMed serves the whole Albury-Wodonga region regardless of which side of the Murray you're on.",
  "hervey-bay": "Hervey Bay and the Fraser Coast have a growing retiree population and limited doctor availability. InstantMed offers a simple, affordable alternative for everyday health needs.",
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
    { q: "How much does a medical certificate cost in Adelaide?", a: "Medical certificates start from $19.95. The same price applies regardless of your location." },
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
    localTestimonial: { name: "Steve R.", quote: "Easy to use and got my certificate within the hour." },
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
}

const services = [
  { name: "Medical Certificates", href: "/medical-certificate", price: "From $19.95" },
  { name: "Prescriptions", href: "/prescriptions", price: "From $29.95" },
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
      description: `Telehealth consultations for ${cityData.name} residents. Fast, affordable, and convenient.`,
      url: `https://instantmed.com.au/locations/${city}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Online Doctor ${cityData.name} | InstantMed`,
      description: `Telehealth consultations for ${cityData.name} residents. Fast, affordable, and convenient.`,
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
    logo: "https://instantmed.com.au/branding/logo.svg",
    image: "https://instantmed.com.au/branding/logo.svg",
    telephone: "+61-2-8005-0000",
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

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:py-16 bg-linear-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
                <MapPin className="h-4 w-4" />
                Serving {cityData.name}, {cityData.state}
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Online Doctor in {cityData.name}
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Skip the waiting room. Get medical certificates and prescriptions online — reviewed by
                Australian doctors, delivered to your phone.
              </p>

              <Link href="/request">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8">
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
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-primary" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>
          </section>

          {/* City-specific content */}
          {cityContent && (
            <section className="px-4 py-10">
              <div className="mx-auto max-w-2xl">
                <p className="text-muted-foreground leading-relaxed text-center">
                  {cityContent}
                </p>
              </div>
            </section>
          )}

          {/* Services */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">Services Available in {cityData.name}</h2>
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
                    <Star key={i} className="h-5 w-5 fill-dawn-400 text-dawn-400" />
                  ))}
                </div>
                <blockquote className="text-lg mb-4">&quot;{cityData.localTestimonial.quote}&quot;</blockquote>
                <p className="text-sm text-muted-foreground">
                  — {cityData.localTestimonial.name}, {cityData.name}
                </p>
              </div>
            </section>
          )}

          {/* How It Works */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">How It Works for {cityData.name} Patients</h2>
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
                      <span className="font-bold text-primary">{item.step}</span>
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
              <h2 className="text-xl font-bold mb-6 text-center">Why {cityData.name} Residents Choose InstantMed</h2>
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
              <h2 className="text-xl font-bold mb-6 text-center flex items-center justify-center gap-2">
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
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-6">
                Join hundreds of {cityData.name} residents who trust InstantMed for their telehealth needs.
              </p>
              <Link href="/request">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          {/* Related Blog Posts - internal linking */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 text-center">Related Resources</h3>
              <div className="flex flex-wrap justify-center gap-3 text-sm">
                <Link href="/blog/how-to-get-medical-certificate-online-australia" className="text-primary hover:underline">
                  How to Get a Med Cert Online
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/blog/telehealth-vs-gp-when-to-use-each" className="text-primary hover:underline">
                  Telehealth vs Doctor
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/medical-certificate" className="text-primary hover:underline">
                  Medical Certificates
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/prescriptions" className="text-primary hover:underline">
                  Prescriptions
                </Link>
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
