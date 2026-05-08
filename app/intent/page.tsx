import { ArrowRight, Search } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { MarketingFooter } from "@/components/marketing"
import { AccordionSection } from "@/components/sections"
import { BreadcrumbSchema, FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import {
  type CommercialIntentCluster,
  intentPages,
} from "@/lib/seo/intents"

export const metadata: Metadata = {
  title: "Commercial Telehealth Pages | InstantMed",
  description: "Find InstantMed's highest-intent service pages: medical certificates, repeat prescription review, city pages, and service comparisons.",
  openGraph: {
    title: "Commercial Telehealth Pages | InstantMed",
    description: "Medical certificate, repeat prescription, city, and comparison pages reviewed for compliant commercial intent.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/intent",
  },
}

const clusterLabels: Record<CommercialIntentCluster, string> = {
  "medical-certificate": "Medical certificates",
  "repeat-prescription": "Repeat prescriptions",
  location: "City and state pages",
  comparison: "Service comparisons",
}

const clusterOrder: CommercialIntentCluster[] = [
  "medical-certificate",
  "location",
  "repeat-prescription",
  "comparison",
]

const intentFaqs = [
  {
    question: "Why only 25 pages?",
    answer: "These pages target high-commercial-intent searches where InstantMed can answer clearly, show price upfront, and route patients into the right service without publishing thin health content.",
  },
  {
    question: "Why avoid drug-led SEO pages?",
    answer: "Prescription-only medicine suitability belongs inside a private clinical request. Public prescription pages stay service-level to reduce TGA advertising risk.",
  },
  {
    question: "Do these replace guides?",
    answer: "No. Guides can still exist for education, but acquisition should be led by focused service pages that answer the commercial question immediately.",
  },
  {
    question: "What must every page include?",
    answer: "Each page needs an answer in the first screen, clear price, compliant CTA, source references, local visual, and internal links into service or related commercial pages.",
  },
  {
    question: "Can these pages be expanded later?",
    answer: "Yes, but only after the top 25 prove traction in Search Console. Expansion should follow query evidence, not a generic content calendar.",
  },
]

export default function IntentPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://instantmed.com.au" },
        { name: "Services", url: "https://instantmed.com.au/intent" },
      ]} />
      <FAQSchema faqs={intentFaqs} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <section className="px-4 py-12 sm:py-16">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
                  <Search className="h-4 w-4" />
                  Find what you need
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                  What Can We Help With?
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  The top 25 pages worth ranking for: clear price, answer in the first screen,
                  compliant CTA, sources, and service-level prescription language.
                </p>
              </div>

              <div className="space-y-10">
                {clusterOrder.map((cluster) => {
                  const pages = intentPages
                    .filter((intent) => intent.commercial.cluster === cluster)
                    .sort((a, b) => a.commercial.priority - b.commercial.priority)

                  return (
                    <section key={cluster}>
                      <div className="mb-4 flex items-end justify-between gap-4">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                          {clusterLabels[cluster]}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                          {pages.length} pages
                        </span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {pages.map((intent) => (
                          <Link
                            key={intent.slug}
                            href={`/intent/${intent.slug}`}
                            className="group rounded-lg border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-colors hover:border-primary/35 dark:border-white/15 dark:bg-card dark:shadow-none"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                                {intent.h1}
                              </h3>
                              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                {intent.commercial.price}
                              </span>
                            </div>
                            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                              {intent.commercial.answer}
                            </p>
                            <span className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
                              Open page <ArrowRight className="h-3 w-3" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>

              {/* FAQ Section */}
              <div className="mt-16">
                <AccordionSection
                  groups={[{ items: intentFaqs }]}
                  title="Common Questions"
                  subtitle="Finding the right service for your situation"
                />
              </div>

              <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Need the service rather than the research page?
                </p>
                <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
                  <Link href="/request">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm">
                <Link href="/conditions" className="text-primary hover:underline">Browse conditions</Link>
                <span className="text-muted-foreground">·</span>
                <Link href="/symptoms" className="text-primary hover:underline">Check symptoms</Link>
                <span className="text-muted-foreground">·</span>
                <Link href="/guides" className="text-primary hover:underline">Read guides</Link>
                <span className="text-muted-foreground">·</span>
                <Link href="/locations" className="text-primary hover:underline">Find your city</Link>
              </div>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
