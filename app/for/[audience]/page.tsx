import { Navbar } from "@/components/shared/navbar"
import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { MarketingFooter, LiveWaitTime, StatsStrip, MediaMentions } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { ArrowRight, Shield, Zap, Clock, Star } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getAudiencePageConfig, getAllAudiencePageSlugs } from "@/lib/seo/data/audience-pages"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { PRICING_DISPLAY } from "@/lib/constants"

interface PageProps {
  params: Promise<{ audience: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { audience } = await params
  const config = getAudiencePageConfig(audience)
  if (!config) return {}

  const baseUrl = "https://instantmed.com.au"
  return {
    title: config.metadata.title,
    description: config.metadata.description,
    keywords: config.metadata.keywords,
    openGraph: {
      title: `${config.h1} | InstantMed`,
      description: config.metadata.description,
      url: `${baseUrl}/for/${config.slug}`,
    },
    alternates: {
      canonical: `${baseUrl}/for/${config.slug}`,
    },
  }
}

export async function generateStaticParams() {
  return getAllAudiencePageSlugs().map((audience) => ({ audience }))
}

export default async function AudiencePage({ params }: PageProps) {
  const { audience } = await params
  const config = getAudiencePageConfig(audience)

  if (!config) {
    notFound()
  }

  const baseUrl = "https://instantmed.com.au"

  const faqSchemaData = config.faqs.map((faq) => ({
    question: faq.q,
    answer: faq.a,
  }))

  return (
    <>
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl },
          { name: "For", url: `${baseUrl}/for` },
          { name: config.h1, url: `${baseUrl}/for/${config.slug}` },
        ]}
      />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />
        <ContentPageTracker pageType="audience" slug={audience} />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="max-w-3xl mx-auto text-center">
                  <div className="mb-4"><SectionPill>{config.badgeLabel}</SectionPill></div>

                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    {config.h1}
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4">
                    {config.heroSubtext}
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">{config.heroTagline}</p>

                  <Link href="/request?service=med-cert">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-background text-sm px-6"
                    >
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>

                  <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-border/50">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">8am-10pm, 7 days</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-border/50">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">15 min turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-border/50">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-muted-foreground">All employers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Why Choose */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">
                  Why {config.badgeLabel.replace("For ", "").toLowerCase()} choose InstantMed
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {config.whyChoose.map((item) => (
                    <div
                      key={item.title}
                      className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-4"
                    >
                      <h3 className="text-sm font-semibold mb-1.5">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">
                  What people say
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {config.testimonials.map((item) => (
                    <div
                      key={item.name}
                      className="p-4 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15"
                    >
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs mb-2">&quot;{item.quote}&quot;</p>
                      <p className="text-xs text-muted-foreground">
                        — {item.name}, {item.role}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Individual experiences may vary. All requests are subject to doctor assessment.
                </p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">
                  How it works
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      step: "1",
                      title: "Quick questionnaire",
                      desc: "Tell us why you need a certificate. Takes 2 minutes.",
                      time: "2 min",
                    },
                    {
                      step: "2",
                      title: "Doctor reviews",
                      desc: "An AHPRA-registered GP assesses your request.",
                      time: "~15 min",
                    },
                    {
                      step: "3",
                      title: "Certificate delivered",
                      desc: "Secure PDF sent to your email. Forward to your manager.",
                      time: "Instant",
                    },
                  ].map((item) => (
                    <div key={item.step} className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl text-center p-4">
                      <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
                        <span className="font-semibold text-lg text-primary-foreground">{item.step}</span>
                      </div>
                      <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                      <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <h2 className="text-xl sm:text-2xl font-semibold text-center mb-6">
                  Quick answers
                </h2>
                <div className="space-y-3 max-w-2xl mx-auto">
                  {config.faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15"
                    >
                      <h3 className="text-sm font-semibold mb-1.5">{faq.q}</h3>
                      <p className="text-xs text-muted-foreground">{faq.a}</p>
                    </div>
                  ))}
                  <div className="p-4 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15">
                    <h3 className="text-sm font-semibold mb-1.5">What does it cost?</h3>
                    <p className="text-xs text-muted-foreground">
                      Medical certificates from {PRICING_DISPLAY.MED_CERT} (1 day) or {PRICING_DISPLAY.MED_CERT_2DAY} (2 days). Scripts from
                      {" "}{PRICING_DISPLAY.REPEAT_SCRIPT}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-12 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-xl mx-auto text-center">
                <div className="bg-primary/5 dark:bg-card border border-primary/20 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-3xl p-6 lg:p-8 relative overflow-hidden">
                  <h2 className="text-2xl font-semibold mb-3">Get your certificate in 15 minutes</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    No appointments. No waiting rooms. Just results.
                  </p>
                  <Link href="/request?service=med-cert">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-12 px-8"
                    >
                      Get Certificate Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {PRICING_DISPLAY.FROM_MED_CERT} • 8am-10pm, 7 days
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Related Resources & Cross-Links */}
          <section className="px-4 py-12 border-t">
            <div className="mx-auto max-w-3xl">
              <div className="grid gap-6 sm:grid-cols-2 mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Helpful Guides</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/guides/how-to-get-medical-certificate-for-work" className="text-sm text-primary hover:underline">
                        How to get a med cert for work
                      </Link>
                    </li>
                    <li>
                      <Link href="/guides/how-to-get-sick-note-for-uni" className="text-sm text-primary hover:underline">
                        Getting a sick note for uni
                      </Link>
                    </li>
                    <li>
                      <Link href="/guides/telehealth-guide-australia" className="text-sm text-primary hover:underline">
                        Telehealth guide for Australians
                      </Link>
                    </li>
                    <li>
                      <Link href="/blog/how-to-get-medical-certificate-online-australia" className="text-sm text-primary hover:underline">
                        How to get a med cert online
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Common Conditions</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/conditions/cold-and-flu" className="text-sm text-primary hover:underline">
                        Cold & Flu
                      </Link>
                    </li>
                    <li>
                      <Link href="/conditions/back-pain" className="text-sm text-primary hover:underline">
                        Back Pain
                      </Link>
                    </li>
                    <li>
                      <Link href="/conditions/migraine" className="text-sm text-primary hover:underline">
                        Migraine
                      </Link>
                    </li>
                    <li>
                      <Link href="/conditions/mental-health-day" className="text-sm text-primary hover:underline">
                        Mental Health
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  <Link href="/for/students" className="text-primary hover:underline">Students</Link>
                  {" • "}
                  <Link href="/for/tradies" className="text-primary hover:underline">Tradies</Link>
                  {" • "}
                  <Link href="/for/corporate" className="text-primary hover:underline">Corporate</Link>
                  {" • "}
                  <Link href="/for/shift-workers" className="text-primary hover:underline">Shift Workers</Link>
                  {" • "}
                  <Link href="/medical-certificate" className="text-primary hover:underline">Medical Certificates</Link>
                  {" • "}
                  <Link href="/prescriptions" className="text-primary hover:underline">Prescriptions</Link>
                </p>
              </div>
            </div>
          </section>

          <LiveWaitTime variant="strip" services={["med-cert"]} />
          <StatsStrip className="bg-muted/20 border-y border-border/30" />
          <MediaMentions variant="strip" className="bg-muted/30" />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
