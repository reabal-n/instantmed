import { ArrowRight, CheckCircle2,Clock, MapPin, Shield } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { BreadcrumbSchema } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING_DISPLAY } from "@/lib/constants"
import { getAllStateSlugs,getStateBySlug } from "@/lib/seo/data/states"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

// ============================================================================
// CITY LOOKUP (for display names/slugs in the grid)
// Kept minimal here - full city data lives in app/locations/[city]/page.tsx.
// ============================================================================

const CITY_DISPLAY_NAMES: Record<string, string> = {
  sydney: "Sydney",
  parramatta: "Parramatta",
  "central-coast": "Central Coast",
  newcastle: "Newcastle",
  wollongong: "Wollongong",
  penrith: "Penrith",
  "coffs-harbour": "Coffs Harbour",
  "port-macquarie": "Port Macquarie",
  "wagga-wagga": "Wagga Wagga",
  orange: "Orange",
  dubbo: "Dubbo",
  "bondi-beach": "Bondi Beach",
  "albury-wodonga": "Albury-Wodonga",
  melbourne: "Melbourne",
  geelong: "Geelong",
  ballarat: "Ballarat",
  bendigo: "Bendigo",
  shepparton: "Shepparton",
  mildura: "Mildura",
  brisbane: "Brisbane",
  "gold-coast": "Gold Coast",
  "sunshine-coast": "Sunshine Coast",
  townsville: "Townsville",
  cairns: "Cairns",
  ipswich: "Ipswich",
  toowoomba: "Toowoomba",
  mackay: "Mackay",
  rockhampton: "Rockhampton",
  bundaberg: "Bundaberg",
  "hervey-bay": "Hervey Bay",
  gladstone: "Gladstone",
  perth: "Perth",
  fremantle: "Fremantle",
  bunbury: "Bunbury",
  adelaide: "Adelaide",
  "mount-gambier": "Mount Gambier",
  "port-augusta": "Port Augusta",
  hobart: "Hobart",
  launceston: "Launceston",
  canberra: "Canberra",
  darwin: "Darwin",
  "alice-springs": "Alice Springs",
}

// ============================================================================
// METADATA + STATIC PARAMS
// ============================================================================

interface PageProps {
  params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state } = await params
  const data = getStateBySlug(state)
  if (!data) return {}

  const canonical = `https://instantmed.com.au/locations/state/${data.slug}`

  return {
    title: `Online Doctor ${data.fullName} | Telehealth ${data.shortName}`,
    description: `Medical certificates, prescriptions, and consultations for ${data.fullName} residents. AHPRA-registered doctors serving ${data.cities.length}+ cities across ${data.shortName}.`,
    keywords: [
      `online doctor ${data.fullName.toLowerCase()}`,
      `telehealth ${data.fullName.toLowerCase()}`,
      `telehealth ${data.shortName.toLowerCase()}`,
      `medical certificate ${data.fullName.toLowerCase()}`,
      `online prescription ${data.fullName.toLowerCase()}`,
      `${data.fullName.toLowerCase()} doctor online`,
    ],
    openGraph: {
      title: `Online Doctor ${data.fullName} | InstantMed`,
      description: `Telehealth medical certificates and prescriptions for every ${data.shortName} postcode. Reviewed by AHPRA-registered doctors in minutes.`,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Online Doctor ${data.fullName} | InstantMed`,
      description: `Telehealth for ${data.fullName} residents - same-day med certs, eScripts, consultations.`,
    },
    alternates: { canonical },
  }
}

export async function generateStaticParams() {
  return getAllStateSlugs().map((state) => ({ state }))
}

// ============================================================================
// PAGE
// ============================================================================

export default async function StatePage({ params }: PageProps) {
  const { state } = await params
  const data = getStateBySlug(state)

  if (!data) {
    notFound()
  }

  const canonical = `https://instantmed.com.au/locations/state/${data.slug}`

  // JSON-LD: MedicalBusiness with areaServed = State
  const localSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `${canonical}#business`,
    name: `InstantMed - Online Doctor ${data.fullName}`,
    description: `Online doctor consultations, medical certificates, and prescriptions for ${data.fullName} residents. AHPRA-registered Australian doctors serving all ${data.shortName} postcodes.`,
    url: canonical,
    logo: "https://instantmed.com.au/branding/logo.png",
    image: "https://instantmed.com.au/branding/logo.png",
    telephone: "+61-450-722-549",
    areaServed: {
      "@type": "State",
      name: data.fullName,
      containedInPlace: { "@type": "Country", name: "Australia" },
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "AU",
      addressRegion: data.shortName,
    },
    priceRange: "$$",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
        description: "Requests accepted 24/7. Prescription and consultation reviews usually occur 08:00-22:00 AEST.",
      },
    ],
    medicalSpecialty: "General Practice",
    isAcceptingNewPatients: true,
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }

  return (
    <>
      <script
        id="state-local-schema"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(localSchema) }}
      />
      <script
        id="state-faq-schema"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Locations", url: "https://instantmed.com.au/locations" },
          { name: data.fullName, url: canonical },
        ]}
      />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* ─────────────── Hero ─────────────── */}
          <section className="px-4 py-12 sm:py-16 bg-linear-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6">
                <SectionPill>Serving all of {data.shortName}</SectionPill>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                {data.heroHeadline}
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                {data.heroSubtitle}
              </p>

              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/request">
                    Get started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-8 bg-transparent">
                  <Link href="/medical-certificate">Medical certificates</Link>
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" />
                  AHPRA registered doctors
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  ~30 min med certs, 24/7
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  Every {data.shortName} postcode
                </span>
              </div>
            </div>
          </section>

          {/* ─────────────── Stats Strip ─────────────── */}
          <section className="px-4 py-10 bg-white dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white dark:bg-card border border-border/50 dark:border-white/10 rounded-2xl p-5 shadow-md shadow-primary/[0.06] dark:shadow-none text-center"
                  >
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1 font-medium">
                      {stat.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 leading-snug">{stat.context}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─────────────── Healthcare Context (unique per state) ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">
                Healthcare access in {data.fullName}
              </h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none space-y-5">
                {data.healthcareContext.map((para, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </section>

          {/* ─────────────── Cities Grid ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                  Cities we serve in {data.shortName}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Dedicated location pages for the major {data.fullName} population centres.
                  Every {data.shortName} postcode has access regardless of whether a city page exists here.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.cities.map((citySlug) => {
                  const displayName = CITY_DISPLAY_NAMES[citySlug] || citySlug
                  return (
                    <Link
                      key={citySlug}
                      href={`/locations/${citySlug}`}
                      className="group bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary shrink-0" />
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {displayName}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-[transform,color]" />
                    </Link>
                  )
                })}
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Not in one of these cities? No problem - our service covers every {data.shortName} postcode
                at the same price and turnaround time.{" "}
                <Link href="/request" className="text-primary hover:underline font-medium">
                  Start your request
                </Link>
                .
              </p>
            </div>
          </section>

          {/* ─────────────── Local Context (employment, uni, regional) ─────────────── */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                  {data.shortName} specifics
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  What to know about using telehealth for work, study, and everyday healthcare in {data.fullName}.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {data.localContext.map((item) => (
                  <div
                    key={item.title}
                    className="bg-white dark:bg-card border border-border/50 dark:border-white/10 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <h3 className="font-semibold text-foreground leading-snug">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─────────────── FAQs ─────────────── */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground text-center mb-10">
                {data.shortName} telehealth FAQs
              </h2>
              <div className="space-y-4">
                {data.faqs.map((faq, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-card border border-border/50 dark:border-white/10 rounded-2xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none"
                  >
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─────────────── CTA ─────────────── */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
                Start your request from anywhere in {data.shortName}
              </h2>
              <p className="text-muted-foreground mb-8">
                A short form, a doctor review, and your certificate or prescription - without leaving home.
              </p>
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/request">
                  Get started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                {PRICING_DISPLAY.FROM_MED_CERT} · AHPRA-registered doctors · Refund if we can&apos;t help
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
