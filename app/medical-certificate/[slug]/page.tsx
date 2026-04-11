import { notFound, redirect } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { ArrowRight, Shield, Star, CheckCircle2, Zap } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import {
  medCertIntentConfigs,
  isMedCertIntentSlug,
  MED_CERT_INTENT_SLUGS,
} from "@/lib/marketing/med-cert-intent-config"
import { MedCertIntentPage } from "@/components/marketing/med-cert-intent-page"
import { BreadcrumbSchema, FAQSchema, MedicalServiceSchema } from "@/components/seo/healthcare-schema"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { MedicalDisclaimer } from "@/components/seo/medical-disclaimer"
import { PRICING_DISPLAY } from "@/lib/constants"

export const revalidate = 3600 // ISR: revalidate every hour

// ============================================
// SUBURB DATA (SEO pages) - location-based
// ============================================

const suburbs: Record<
  string,
  {
    name: string
    state: string
    stateShort: string
    region?: string
    population?: string
    localFlair: string
    testimonial?: { name: string; quote: string; occupation: string }
  }
> = {
  sydney: {
    name: "Sydney",
    state: "New South Wales",
    stateShort: "NSW",
    population: "5.3 million",
    localFlair: "From Bondi to Parramatta",
    testimonial: {
      name: "Marcus T.",
      quote: "Got my cert sorted on the train to work. Certificate in my inbox before I reached Central.",
      occupation: "Project Manager",
    },
  },
  parramatta: {
    name: "Parramatta",
    state: "New South Wales",
    stateShort: "NSW",
    region: "Western Sydney",
    localFlair: "Serving all of Western Sydney",
  },
  melbourne: {
    name: "Melbourne",
    state: "Victoria",
    stateShort: "VIC",
    population: "5.1 million",
    localFlair: "From St Kilda to the outer suburbs",
    testimonial: {
      name: "Sarah L.",
      quote: "Way easier than waiting 3 weeks for a GP appointment in the inner north.",
      occupation: "Marketing Coordinator",
    },
  },
  brisbane: {
    name: "Brisbane",
    state: "Queensland",
    stateShort: "QLD",
    population: "2.5 million",
    localFlair: "From the Valley to the bayside",
    testimonial: {
      name: "Emma T.",
      quote: "Perfect for when you need something quick without leaving Fortitude Valley.",
      occupation: "Hospitality Worker",
    },
  },
  perth: {
    name: "Perth",
    state: "Western Australia",
    stateShort: "WA",
    population: "2.1 million",
    localFlair: "Fremantle to Joondalup",
  },
  adelaide: {
    name: "Adelaide",
    state: "South Australia",
    stateShort: "SA",
    population: "1.4 million",
    localFlair: "From Glenelg to the hills",
  },
  "gold-coast": {
    name: "Gold Coast",
    state: "Queensland",
    stateShort: "QLD",
    population: "700,000",
    localFlair: "Surfers to Coolangatta",
  },
  canberra: {
    name: "Canberra",
    state: "Australian Capital Territory",
    stateShort: "ACT",
    population: "460,000",
    localFlair: "Serving the capital",
  },
  hobart: {
    name: "Hobart",
    state: "Tasmania",
    stateShort: "TAS",
    population: "240,000",
    localFlair: "Serving all of Tasmania",
  },
  darwin: {
    name: "Darwin",
    state: "Northern Territory",
    stateShort: "NT",
    population: "150,000",
    localFlair: "Top End telehealth",
  },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

// ============================================
// METADATA
// ============================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  // Redirect legacy "uni" to "university"
  if (slug === "uni") {
    return {}
  }

  // Intent pages
  if (isMedCertIntentSlug(slug)) {
    const config = medCertIntentConfigs[slug]
    const baseUrl = "https://instantmed.com.au"
    return {
      title: config.metadata.title,
      description: config.metadata.description,
      keywords: config.metadata.keywords,
      openGraph: {
        title: config.metadata.title,
        description: config.metadata.description,
        type: "website",
        url: `${baseUrl}/medical-certificate/${slug}`,
        locale: "en_AU",
      },
      twitter: {
        card: "summary_large_image",
        title: config.metadata.title,
        description: config.metadata.description,
      },
      alternates: {
        canonical: `${baseUrl}/medical-certificate/${slug}`,
      },
    }
  }

  // Suburb pages
  const data = suburbs[slug]
  if (data) {
    const title = `Medical Certificate Online ${data.name}`
    const description = `Get a medical certificate online in ${data.name}, ${data.stateShort}. Reviewed by AHPRA-registered Australian doctors. Valid for all employers. ${PRICING_DISPLAY.FROM_MED_CERT}.`
    return {
      title,
      description,
      keywords: [
        `medical certificate online ${data.name.toLowerCase()}`,
        `online medical certificate ${data.name.toLowerCase()}`,
        `sick certificate ${data.name.toLowerCase()}`,
        `telehealth medical certificate ${data.name.toLowerCase()}`,
      ],
      openGraph: {
        title,
        description,
        url: `https://instantmed.com.au/medical-certificate/${slug}`,
      },
      alternates: {
        canonical: `https://instantmed.com.au/medical-certificate/${slug}`,
      },
    }
  }

  return {}
}

// ============================================
// STATIC PARAMS
// ============================================

export async function generateStaticParams() {
  const intentParams = MED_CERT_INTENT_SLUGS.map((slug) => ({ slug }))
  const suburbParams = Object.keys(suburbs).map((slug) => ({ slug }))
  return [...intentParams, ...suburbParams]
}

// ============================================
// PAGE COMPONENT
// ============================================

export default async function MedCertSlugPage({ params }: PageProps) {
  const { slug } = await params

  // Redirect legacy slugs to canonical intent pages
  if (slug === "uni") redirect("/medical-certificate/university")
  if (slug === "carers") redirect("/medical-certificate/carer")

  // =========== INTENT PAGES (work, study, carer, sick-leave, university, school, return-to-work) ===========
  if (isMedCertIntentSlug(slug)) {
    const config = medCertIntentConfigs[slug]
    const baseUrl = "https://instantmed.com.au"
    return (
      <>
        <BreadcrumbSchema
          items={[
            { name: "Home", url: baseUrl },
            { name: "Medical Certificate", url: `${baseUrl}/medical-certificate` },
            { name: config.h1.replace(/\.$/, ""), url: `${baseUrl}/medical-certificate/${slug}` },
          ]}
        />
        <MedicalServiceSchema
          name={config.metadata.title.split("|")[0]?.trim() ?? config.h1}
          description={config.metadata.description}
          price="19.95"
        />
        <FAQSchema faqs={config.faqs} />
        <MedCertIntentPage config={config} />
      </>
    )
  }

  // =========== SUBURB SEO PAGES ===========
  const data = suburbs[slug]
  if (!data) {
    notFound()
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Can I get a medical certificate online in ${data.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes! InstantMed provides online medical certificates to ${data.name} residents. Complete a quick questionnaire, get reviewed by an AHPRA-registered doctor, and receive your certificate - typically in under 30 minutes, available 24/7.`,
        },
      },
      {
        "@type": "Question",
        name: "Will my employer accept an online medical certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Absolutely. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers in Australia, including those in ${data.name}.`,
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      <div className="flex min-h-screen flex-col bg-foreground text-background">
        <Navbar variant="marketing" />

        <main className="flex-1">
          <section className="relative px-4 py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-blue-500/5" />
            <div className="relative mx-auto max-w-4xl text-center">
              <div className="mb-6">
                <SectionPill>{data.localFlair}</SectionPill>
              </div>

              <h1 className="text-4xl md:text-5xl font-semibold mb-4">
                Medical Certificate Online
                <br />
                <span className="text-primary">{data.name}</span>
              </h1>

              <p className="text-lg text-background/70 mb-8 max-w-2xl mx-auto">
                Get a valid medical certificate from AHPRA-registered doctors. No waiting rooms, no
                appointments. Reviewed in ~15 minutes.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-background/70">
                  <Zap className="h-4 w-4 text-primary" />
                  ~15 min turnaround
                </div>
                <div className="flex items-center gap-2 text-sm text-background/70">
                  <Shield className="h-4 w-4 text-primary" />
                  AHPRA verified doctors
                </div>
                <div className="flex items-center gap-2 text-sm text-background/70">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Valid for all employers
                </div>
              </div>

              <Link href="/request?service=med-cert">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  Get Your Certificate
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <p className="mt-4 text-sm text-background/60">{PRICING_DISPLAY.FROM_MED_CERT} • No phone call required</p>
            </div>
          </section>

          {data.testimonial && (
            <section className="px-4 py-12 bg-white/5">
              <div className="mx-auto max-w-2xl text-center">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-lg text-background/80 mb-4">
                  &ldquo;{data.testimonial.quote}&rdquo;
                </blockquote>
                <p className="text-sm text-background/60">
                  - {data.testimonial.name}, {data.testimonial.occupation}
                </p>
              </div>
            </section>
          )}

          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-center mb-12">How it works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: "1",
                    title: "Tell us what you need",
                    desc: "Answer a few quick questions about your symptoms",
                  },
                  {
                    step: "2",
                    title: "Doctor reviews",
                    desc: "An Australian GP reviews your request",
                  },
                  {
                    step: "3",
                    title: "Get your certificate",
                    desc: "Receive your PDF certificate via email",
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-primary font-semibold">{item.step}</span>
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-background/60">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 py-12">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold mb-4">Ready in 15 minutes</h2>
              <p className="text-background/60 mb-6">
                Join hundreds of {data.name} residents who skip the waiting room with InstantMed.
              </p>
              <Link href="/request?service=med-cert">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Your Certificate
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          <section className="px-4 py-8 border-t border-border/10">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm text-background/60 text-center">
                Also serving:{" "}
                {Object.entries(suburbs)
                  .filter(([key]) => key !== slug)
                  .slice(0, 6)
                  .map(([key, s], i, arr) => (
                    <span key={key}>
                      <Link
                        href={`/medical-certificate/${key}`}
                        className="text-primary hover:underline"
                      >
                        {s.name}
                      </Link>
                      {i < arr.length - 1 && " • "}
                    </span>
                  ))}
              </p>
            </div>
          </section>

          {/* Medical Disclaimer */}
          <MedicalDisclaimer reviewedDate="2026-03" />
        </main>

        <Footer />
      </div>
    </>
  )
}
