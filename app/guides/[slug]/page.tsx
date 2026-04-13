import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Shield,
  Zap} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { BreadcrumbSchema, FAQSchema, HealthArticleSchema, HowToSchema, MedicalDisclaimer } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { PageBreadcrumbs } from "@/components/uix"
import { GUIDE_INDEX,guides } from "@/lib/seo/data/guides"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const guide = guides[slug]
  if (!guide) return {}

  return {
    title: guide.title,
    description: guide.description,
    keywords: [
      guide.slug.split('-').join(' '),
      'medical certificate australia',
      'telehealth australia',
      'online doctor',
    ],
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `https://instantmed.com.au/guides/${slug}`,
      type: 'article',
    },
    alternates: {
      canonical: `https://instantmed.com.au/guides/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(guides).map((slug) => ({ slug }))
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params
  const guide = guides[slug]

  if (!guide) {
    notFound()
  }

  const faqSchemaData = guide.faqs.map(faq => ({
    question: faq.q,
    answer: faq.a
  }))

  return (
    <>
      <HealthArticleSchema title={guide.title} description={guide.description} url={`/guides/${slug}`} />
      <FAQSchema faqs={faqSchemaData} />
      <HowToSchema
        name={guide.title}
        description={guide.description}
        totalTime={`PT${parseInt(guide.readTime) * 2}M`}
        steps={guide.steps.map(step => ({
          name: step.title,
          text: step.content,
        }))}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Guides", url: "https://instantmed.com.au/guides" },
          { name: guide.title, url: `https://instantmed.com.au/guides/${slug}` }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-background dark:bg-black">
        <Navbar variant="marketing" />
        <ContentPageTracker pageType="guide" slug={slug} />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6">
            <div className="mx-auto max-w-3xl">
              <PageBreadcrumbs
                links={[
                  { label: "Guides", href: "/guides" },
                  { label: guide.title }
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero */}
          <section className="px-4 py-8 sm:py-12 border-b border-border dark:border-border">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4 leading-tight">
                {guide.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {guide.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{guide.readTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>Updated {guide.lastUpdated}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Intro */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <p className="text-lg text-foreground leading-relaxed">
                {guide.intro}
              </p>
            </div>
          </section>

          {/* Steps */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <div className="space-y-12">
                {guide.steps.map((step, i) => (
                  <div key={i} className="relative">
                    {/* Step number */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary text-background flex items-center justify-center font-semibold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <h2 className="text-xl font-semibold text-foreground mb-4">
                          {step.title}
                        </h2>
                        <p className="text-foreground leading-relaxed mb-4">
                          {step.content}
                        </p>
                        {step.tips && (
                          <div className="bg-white dark:bg-card rounded-xl p-4 border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                              <Info className="w-4 h-4 text-primary" />
                              Tips
                            </p>
                            <ul className="space-y-2">
                              {step.tips.map((tip, j) => (
                                <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Important Notes */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <div className="bg-warning-light/30 border border-warning-border rounded-2xl p-6">
                <h2 className="font-semibold text-warning mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Important Things to Know
                </h2>
                <ul className="space-y-3">
                  {guide.importantNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-warning">
                      <CheckCircle2 className="w-4 h-4 mt-1 shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="px-4 py-12 bg-muted/50 dark:bg-white/[0.06]">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {guide.faqs.map((faq, i) => (
                  <div key={i} className="bg-white dark:bg-card rounded-xl p-6 border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none">
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Related Guides & Cross-Links */}
          {(() => {
            const currentGuide = GUIDE_INDEX.find(g => g.slug === guide.slug)
            const currentCategory = currentGuide?.category
            // Same category first, then other guides, exclude current
            const relatedGuides = GUIDE_INDEX
              .filter(g => g.slug !== guide.slug)
              .sort((a, b) => {
                if (a.category === currentCategory && b.category !== currentCategory) return -1
                if (a.category !== currentCategory && b.category === currentCategory) return 1
                return 0
              })
              .slice(0, 4)

            // Map categories to relevant service/condition links
            const categoryLinks: Record<string, Array<{ href: string; label: string }>> = {
              "Medical Certificates": [
                { href: "/medical-certificate", label: "Medical certificate service" },
                { href: "/conditions/cold-and-flu", label: "Cold & flu certificates" },
                { href: "/conditions/back-pain", label: "Back pain certificates" },
              ],
              "Prescriptions": [
                { href: "/prescriptions", label: "Prescription service" },
                { href: "/conditions/hay-fever", label: "Hay fever treatment" },
                { href: "/conditions/uti", label: "UTI treatment" },
              ],
              "Telehealth": [
                { href: "/consult", label: "Online consultations" },
                { href: "/how-it-works", label: "How InstantMed works" },
                { href: "/trust", label: "Trust & safety" },
              ],
            }

            const serviceLinks = categoryLinks[currentCategory || ""] || categoryLinks["Telehealth"]

            return (
              <section className="px-4 py-12">
                <div className="mx-auto max-w-3xl">
                  <h2 className="text-2xl font-semibold text-foreground mb-8 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-primary" />
                    Related Guides
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 mb-8">
                    {relatedGuides.map((g) => (
                      <Link
                        key={g.slug}
                        href={`/guides/${g.slug}`}
                        className="group bg-white dark:bg-card rounded-xl p-5 border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:border-primary/30 transition-all"
                      >
                        <span className="text-xs font-medium text-primary/70 mb-1 block">{g.category}</span>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm leading-snug mb-1">
                          {g.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">{g.readTime}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="bg-muted/50 dark:bg-white/[0.06] rounded-xl p-5 border border-border/50 dark:border-white/15">
                    <h3 className="font-semibold text-foreground text-sm mb-3">Related services</h3>
                    <div className="flex flex-wrap gap-2">
                      {serviceLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50 dark:border-white/10">
                      <Link
                        href="/guides"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        View all guides <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )
          })()}

          {/* CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-8">
                {guide.cta.subtext}
              </p>
              <Button asChild size="lg" className="h-14 px-10 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Link href={guide.cta.href}>
                  {guide.cta.text}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Fast response</span>
                </div>
              </div>
            </div>
          </section>

          {/* Medical Disclaimer */}
          <MedicalDisclaimer reviewedDate="2026-04" />
        </main>

        <Footer />
      </div>
    </>
  )
}
