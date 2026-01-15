import { notFound, redirect } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, Shield, Star, CheckCircle2, Zap } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

// Prevent static generation to avoid Clerk publishableKey issues during build
export const dynamic = "force-dynamic"

// ============================================
// SUBTYPE DATA (work, uni, carer) - redirect to main request
// ============================================

const validSubtypes = ["work", "uni", "carer"]

const subtypeInfo: Record<string, { title: string; description: string }> = {
  work: {
    title: "Work Certificate",
    description: "Medical certificate for sick leave from work",
  },
  uni: {
    title: "Uni/School Certificate",
    description: "Medical certificate for special consideration",
  },
  carer: {
    title: "Carer's Leave Certificate",
    description: "Medical certificate for caring responsibilities",
  },
}

// ============================================
// SUBURB DATA (SEO pages)
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

// ============================================
// PAGE PROPS
// ============================================

interface PageProps {
  params: Promise<{ slug: string }>
}

// ============================================
// METADATA
// ============================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  // Check if it&apos;s a subtype page
  if (validSubtypes.includes(slug)) {
    const info = subtypeInfo[slug]
    return {
      title: `${info.title} Online | InstantMed Australia`,
      description: info.description,
    }
  }

  // Check if it&apos;s a suburb SEO page
  const data = suburbs[slug]
  if (data) {
    const title = `Medical Certificate Online ${data.name} | 15 Min Turnaround | InstantMed`
    const description = `Get a medical certificate online in ${data.name}, ${data.stateShort}. Australian doctors, 15-minute turnaround. Valid for all employers.`

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
  const subtypeParams = validSubtypes.map((slug) => ({ slug }))
  const suburbParams = Object.keys(suburbs).map((slug) => ({ slug }))
  return [...subtypeParams, ...suburbParams]
}

// ============================================
// PAGE COMPONENT
// ============================================

export default async function MedCertSlugPage({ params }: PageProps) {
  const { slug } = await params

  // =========== SUBTYPE PAGES - redirect to main request page ===========
  if (validSubtypes.includes(slug)) {
    redirect(`/medical-certificate/request?type=${slug}`)
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
          text: `Yes! InstantMed provides online medical certificates to ${data.name} residents. Complete a quick questionnaire, get reviewed by an AHPRA-registered doctor, and receive your certificate — typically within 15 minutes.`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="flex min-h-screen flex-col bg-foreground text-background">
        <Navbar variant="marketing" />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative px-4 py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-purple-500/5" />
            <div className="relative mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
                <MapPin className="h-4 w-4" />
                {data.localFlair}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Medical Certificate Online
                <br />
                <span className="text-primary">{data.name}</span>
              </h1>

              <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                Get a valid medical certificate from AHPRA-registered doctors. No waiting rooms,
                no appointments. Reviewed in ~15 minutes.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Zap className="h-4 w-4 text-primary" />
                  ~15 min turnaround
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Shield className="h-4 w-4 text-primary" />
                  AHPRA verified doctors
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Valid for all employers
                </div>
              </div>

              <Link href="/medical-certificate/request">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  Get Your Certificate
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <p className="mt-4 text-sm text-gray-400">From $19.95 • No phone call required</p>
            </div>
          </section>

          {/* Testimonial */}
          {data.testimonial && (
            <section className="px-4 py-12 bg-white/5">
              <div className="mx-auto max-w-2xl text-center">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-lg text-gray-200 mb-4">
                  &ldquo;{data.testimonial.quote}&rdquo;
                </blockquote>
                <p className="text-sm text-gray-400">
                  — {data.testimonial.name}, {data.testimonial.occupation}
                </p>
              </div>
            </section>
          )}

          {/* How it works */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { step: "1", title: "Tell us what you need", desc: "Answer a few quick questions about your symptoms" },
                  { step: "2", title: "Doctor reviews", desc: "An Australian GP reviews your request" },
                  { step: "3", title: "Get your certificate", desc: "Receive your PDF certificate via email" },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-primary font-bold">{item.step}</span>
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Ready in 15 minutes</h2>
              <p className="text-gray-400 mb-6">
                Join thousands of {data.name} residents who skip the waiting room with InstantMed.
              </p>
              <Link href="/medical-certificate/request">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Your Certificate
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          {/* Other locations */}
          <section className="px-4 py-8 border-t border-white/10">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm text-gray-400 text-center">
                Also serving:{" "}
                {Object.entries(suburbs)
                  .filter(([key]) => key !== slug)
                  .slice(0, 6)
                  .map(([key, s], i, arr) => (
                    <span key={key}>
                      <Link href={`/medical-certificate/${key}`} className="text-primary hover:underline">
                        {s.name}
                      </Link>
                      {i < arr.length - 1 && " • "}
                    </span>
                  ))}
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
