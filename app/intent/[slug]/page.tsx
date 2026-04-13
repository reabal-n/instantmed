import {
  ArrowRight,
  Clock,
  FileText,
  Shield,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { BreadcrumbSchema,FAQSchema } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { PageBreadcrumbs } from "@/components/uix"
import {
  getAllIntentSlugs,
  getIntentPageBySlug,
} from "@/lib/seo/intents"
import type { ContentBlock } from "@/lib/seo/registry"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getIntentPageBySlug(slug)
  if (!page) return {}

  return {
    title: page.title,
    description: page.description,
    keywords: page.metadata.keywords,
    openGraph: {
      title: page.title,
      description: page.description,
      url: `https://instantmed.com.au/intent/${slug}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/intent/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return getAllIntentSlugs().map((slug) => ({ slug }))
}

function renderContentBlock(block: ContentBlock) {
  if (block.type === "text") {
    return (
      <p key={block.id} className="text-muted-foreground leading-relaxed">
        {block.content as string}
      </p>
    )
  }
  if (block.type === "list") {
    const items = block.content as string[]
    return (
      <ul key={block.id} className="space-y-2 list-disc list-inside text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
  }
  if (block.type === "callout") {
    return (
      <div
        key={block.id}
        className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
      >
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Important:</strong> {block.content as string}
        </p>
      </div>
    )
  }
  return null
}

export default async function IntentPage({ params }: PageProps) {
  const { slug } = await params
  const page = getIntentPageBySlug(slug)

  if (!page) {
    notFound()
  }

  const faqSchemaData = (page.structured.faqs || []).map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }))

  return (
    <>
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Telehealth", url: "https://instantmed.com.au/consult" },
          {
            name: page.h1,
            url: `https://instantmed.com.au/intent/${slug}`,
          },
        ]}
      />

      <div className="flex min-h-screen flex-col bg-linear-to-b from-muted/50 to-white dark:from-background dark:to-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <div className="px-4 pt-6">
            <div className="mx-auto max-w-4xl">
              <PageBreadcrumbs
                links={[
                  { label: "Telehealth", href: "/consult" },
                  { label: page.h1 },
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero */}
          <section className="relative px-4 py-12 sm:py-16 overflow-hidden">
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div className="mx-auto max-w-4xl">
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <SectionPill>AHPRA Registered Doctors</SectionPill>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Usually under 1 hour</span>
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-center text-foreground mb-6 tracking-tight">
                {page.h1}
              </h1>

              <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-8 leading-relaxed">
                {page.content.intro}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-8 text-base font-semibold rounded-full shadow-lg shadow-primary/25"
                >
                  <Link href={page.conversion.ctaUrl}>
                    {page.conversion.primaryCTA}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                {page.conversion.secondaryCTA && page.conversion.secondaryCTAUrl && (
                  <Button asChild variant="outline" size="lg" className="rounded-full">
                    <Link href={page.conversion.secondaryCTAUrl}>
                      {page.conversion.secondaryCTA}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Content blocks */}
          <section className="px-4 py-16 bg-white dark:bg-card">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                What You Need to Know
              </h2>

              <div className="space-y-8">
                {page.content.uniqueBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="p-6 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none rounded-xl border border-border/50 dark:border-white/15"
                  >
                    {renderContentBlock(block)}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {(page.structured.faqs || []).map((faq, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none border border-border/50 dark:border-white/15 rounded-xl p-6"
                  >
                    <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Related links */}
          {page.links.related.length > 0 && (
            <section className="px-4 py-12 bg-muted/30">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-xl font-bold text-foreground mb-6 text-center">
                  Related Resources
                </h2>
                <div className="flex flex-wrap justify-center gap-4">
                  {page.links.related.map((link) => {
                    const href =
                      link.type === "condition"
                        ? `/conditions/${link.slug}`
                        : link.type === "audience"
                          ? `/for/${link.slug}`
                          : link.type === "intent"
                            ? `/intent/${link.slug}`
                            : link.type === "medication"
                              // Canonical med pages live at /prescriptions/med/[slug].
                              // /medications/* was deprecated and now 308s to /.
                              ? `/prescriptions/med/${link.slug}`
                              : link.type === "category"
                                ? `/${link.slug}`
                                : `/intent/${link.slug}`
                    return (
                      <Link
                        key={`${link.type}-${link.slug}`}
                        href={href}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none border border-border hover:border-primary transition-colors text-sm font-medium"
                      >
                        <FileText className="w-4 h-4 text-primary" />
                        {link.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Final CTA */}
          <section className="px-4 py-20 bg-linear-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our Australian-registered doctors are available 7 days a week. Most
                requests reviewed within an hour.
              </p>

              <Button
                asChild
                size="lg"
                className="h-14 px-10 text-base font-semibold rounded-full shadow-lg shadow-primary/25"
              >
                <Link href={page.conversion.ctaUrl}>
                  {page.conversion.primaryCTA}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>~1 hour response</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
