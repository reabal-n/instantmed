import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  ShieldCheck,
} from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { CommercialIntentTracker } from "@/components/analytics/commercial-intent-tracker"
import { BreadcrumbSchema, FAQSchema } from "@/components/seo"
import { Footer, Navbar } from "@/components/shared"
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
  let body: ReactNode = null

  if (block.type === "text") {
    body = (
      <p className="text-muted-foreground leading-relaxed">
        {block.content as string}
      </p>
    )
  } else if (block.type === "list") {
    const items = block.content as string[]
    body = (
      <ul className="space-y-3 text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  } else if (block.type === "callout") {
    body = (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
      >
        <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">{block.content as string}</p>
      </div>
    )
  }

  if (!body) return null

  return (
    <div
      key={block.id}
      className="rounded-lg border border-border/60 bg-white p-6 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
    >
      {block.title && (
        <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
          {block.title}
        </h3>
      )}
      {body}
    </div>
  )
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
      <CommercialIntentTracker
        slug={page.slug}
        cluster={page.commercial.cluster}
        priority={page.commercial.priority}
        primaryQuery={page.intent.searchQuery}
      />
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

          <section className="px-4 py-10 sm:py-14">
            <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
              <div>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <SectionPill>AHPRA-registered doctor review</SectionPill>
                  <span className="rounded-full border border-border/70 bg-white px-3 py-1.5 text-sm font-medium text-foreground shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                    {page.commercial.price}
                  </span>
                </div>

                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {page.h1}
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  {page.content.intro}
                </p>

                <div className="mt-7 rounded-lg border border-primary/20 bg-primary/5 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-primary">
                    Quick answer
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-foreground">
                    {page.commercial.answer}
                  </p>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 px-6 text-base font-semibold"
                  >
                    <Link
                      href={page.conversion.ctaUrl}
                      data-commercial-intent-event="primary_cta"
                      data-commercial-intent-placement="hero"
                    >
                      {page.conversion.primaryCTA}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  {page.conversion.secondaryCTA && page.conversion.secondaryCTAUrl && (
                    <Button asChild variant="outline" size="lg" className="h-12">
                      <Link
                        href={page.conversion.secondaryCTAUrl}
                        data-commercial-intent-event="secondary_cta"
                        data-commercial-intent-placement="hero"
                      >
                        {page.conversion.secondaryCTA}
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Doctor reviewed
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Price before payment
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Australia only
                  </div>
                </div>
              </div>

              <figure className="overflow-hidden rounded-lg border border-border/60 bg-white shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                <Image
                  src={page.commercial.visual.src}
                  alt={page.commercial.visual.alt}
                  width={760}
                  height={560}
                  priority
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="border-t border-border/60 p-4 text-sm leading-relaxed text-muted-foreground dark:border-white/15">
                  {page.commercial.visual.caption}
                </figcaption>
              </figure>
            </div>
          </section>

          <section className="border-y border-border/60 bg-muted/20 px-4 py-14 dark:border-white/10">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
              <div>
                <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
                  What you need to know
                </h2>
                <div className="space-y-4">
                  {page.content.uniqueBlocks.map(renderContentBlock)}
                </div>
              </div>

              <aside className="space-y-4">
                <div
                  className="rounded-lg border border-border/60 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
                  data-commercial-intent-price-card
                  data-commercial-intent-placement="sidebar"
                >
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    {page.commercial.price}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Final checkout shows the exact service price before payment.
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <h2 className="text-base font-semibold text-foreground">Sources</h2>
                  <div className="mt-4 space-y-3">
                    {page.commercial.sources.map((source) => (
                      <a
                        key={source.href}
                        href={source.href}
                        target="_blank"
                        rel="noreferrer"
                        data-commercial-intent-event="source"
                        data-commercial-intent-placement="sources"
                        className="flex items-start gap-2 text-sm leading-relaxed text-primary hover:underline"
                      >
                        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                        {source.label}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                  <h2 className="text-base font-semibold text-foreground">Next steps</h2>
                  <div className="mt-4 space-y-2">
                    {page.commercial.internalLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        data-commercial-intent-event="internal_link"
                        data-commercial-intent-placement="next_steps"
                        className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary dark:border-white/10"
                      >
                        {link.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>

          {page.links.related.length > 0 && (
            <section className="px-4 py-12">
              <div className="mx-auto max-w-6xl">
                <h2 className="mb-5 text-xl font-semibold tracking-tight text-foreground">
                  Related commercial pages
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {page.links.related.map((link) => {
                    const href =
                      link.type === "condition"
                        ? `/conditions/${link.slug}`
                        : link.type === "audience"
                          ? `/for/${link.slug}`
                          : link.type === "intent"
                            ? `/intent/${link.slug}`
                            : link.type === "medication"
                              ? "/prescriptions"
                              : link.type === "category"
                                ? `/${link.slug}`
                                : `/intent/${link.slug}`
                    return (
                      <Link
                        key={`${link.type}-${link.slug}`}
                        href={href}
                        data-commercial-intent-event="related_link"
                        data-commercial-intent-placement="related"
                        className="group rounded-lg border border-border/60 bg-white p-4 shadow-sm shadow-primary/[0.04] transition-colors hover:border-primary/40 dark:border-white/15 dark:bg-card dark:shadow-none"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
                          <FileText className="h-4 w-4" />
                          {link.title}
                        </span>
                        {link.description && (
                          <span className="mt-2 block text-sm text-muted-foreground">
                            {link.description}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
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

          {/* Final CTA */}
          <section className="px-4 py-20 bg-linear-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                Start with the right service
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Clear price, secure request, and doctor review before any certificate
                or prescription decision.
              </p>

              <Button
                asChild
                size="lg"
                className="h-14 px-10 text-base font-semibold rounded-full shadow-lg shadow-primary/25"
              >
                <Link
                  href={page.conversion.ctaUrl}
                  data-commercial-intent-event="primary_cta"
                  data-commercial-intent-placement="footer"
                >
                  {page.conversion.primaryCTA}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>AHPRA-registered review</span>
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
