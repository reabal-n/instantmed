import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Heart,
  Pill,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { MarketingFooter, MarketingPageShell } from "@/components/marketing"
import { TestimonialsSection } from "@/components/marketing/sections"
import type { ChecklistItem,StatItem } from "@/components/sections"
import {
  AccordionSection,
  CTABanner,
  IconChecklist,
  SectionHeader,
  StatStrip,
} from "@/components/sections"
import { BreadcrumbSchema, FAQSchema, MedicalConditionSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { PageBreadcrumbs } from "@/components/uix"
import { PRICING_DISPLAY } from "@/lib/constants"
import { getTestimonialsForColumns } from "@/lib/data/testimonials"
import { conditionsData } from "@/lib/seo/data/conditions"
import { SOCIAL_PROOF } from "@/lib/social-proof"

const conditions = conditionsData

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const condition = conditions[slug]
  if (!condition) return {}

  const title = `${condition.name} | Online Doctor Assessment | InstantMed`
  const description = `${condition.description} Get assessed by an Australian doctor online. Medical certificates available. Fast, confidential telehealth.`

  return {
    title: { absolute: title },
    description,
    keywords: [
      `${condition.name.toLowerCase()} medical certificate`,
      `${condition.name.toLowerCase()} doctor online`,
      `${condition.name.toLowerCase()} telehealth`,
      `${condition.name.toLowerCase()} treatment`,
      `${condition.name.toLowerCase()} symptoms`,
    ],
    openGraph: {
      title: `${condition.name} - Online Doctor Assessment | InstantMed`,
      description: `Get professional medical advice for ${condition.name.toLowerCase()}. Australian doctors available now.`,
      url: `https://instantmed.com.au/conditions/${slug}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/conditions/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(conditions).map((slug) => ({ slug }))
}

const PLATFORM_STATS: StatItem[] = [
  { value: SOCIAL_PROOF.certTurnaroundMinutes, suffix: " min", label: "avg cert turnaround" },
  { value: SOCIAL_PROOF.averageResponseMinutes, suffix: " min", label: "avg doctor review" },
  { value: SOCIAL_PROOF.certApprovalPercent, suffix: "%", label: "approval rate" },
  { value: SOCIAL_PROOF.refundPercent, suffix: "%", label: "refund if we can't help" },
]

export default async function ConditionPage({ params }: PageProps) {
  const { slug } = await params
  const condition = conditions[slug]

  if (!condition) notFound()

  const testimonials = getTestimonialsForColumns().slice(0, 9)

  const faqSchemaData = condition.commonQuestions.map(faq => ({
    question: faq.q,
    answer: faq.a,
  }))

  const symptomItems: ChecklistItem[] = condition.symptoms.map(s => ({ text: s }))

  const selfCareItems: ChecklistItem[] = (condition.selfCareTips ?? []).map(t => ({ text: t }))

  const faqGroups = [{
    items: condition.commonQuestions.map(q => ({ question: q.q, answer: q.a })),
  }]

  const fromPrice = condition.serviceType === "consult" ? PRICING_DISPLAY.CONSULT : PRICING_DISPLAY.MED_CERT
  const serviceLabel = condition.serviceType === "med-cert" ? "certificates" : "consultations"

  return (
    <>
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Conditions", url: "https://instantmed.com.au/conditions" },
          { name: condition.name, url: `https://instantmed.com.au/conditions/${slug}` },
        ]}
      />
      <MedicalConditionSchema
        name={condition.name}
        description={condition.description}
        url={`/conditions/${slug}`}
        symptoms={condition.symptoms}
        medications={condition.treatmentInfo?.medications.map(med => ({
          genericName: med.genericName,
          brandNames: med.brandNames,
          drugClass: med.drugClass,
          typicalDose: med.typicalDose,
          prescriptionRequired: med.prescriptionRequired,
        }))}
        guidelineSource={condition.treatmentInfo?.guidelineSource}
        reviewedDate={condition.reviewedDate}
      />

      <MarketingPageShell>
        <div className="flex min-h-screen flex-col">
          <Navbar variant="marketing" />

          <main className="flex-1 pt-20">

            {/* Breadcrumbs */}
            <div className="px-4 pt-6">
              <div className="mx-auto max-w-4xl">
                <PageBreadcrumbs
                  links={[
                    { label: "Conditions", href: "/conditions" },
                    { label: condition.name },
                  ]}
                  showHome
                />
              </div>
            </div>

            {/* Hero */}
            <CenteredHero
              pill="Conditions"
              title={condition.name}
              subtitle={condition.description}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-8 text-base font-semibold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                  <Link href={condition.ctaHref}>
                    {condition.ctaText}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  From {fromPrice} · No appointment needed
                </p>
              </div>
            </CenteredHero>

            {/* Platform Stats */}
            <StatStrip stats={PLATFORM_STATS} />

            {/* Symptoms */}
            {symptomItems.length > 0 && (
              <IconChecklist
                pill="Symptoms"
                title={`Common symptoms of ${condition.name}`}
                subtitle="An AHPRA-registered doctor assesses these symptoms online - no in-person visit required."
                items={symptomItems}
                columns={2}
                className="bg-muted/30 dark:bg-white/[0.04]"
              />
            )}

            {/* Can We Help */}
            <section className="py-16 lg:py-24 px-4">
              <SectionHeader
                pill="Our Scope"
                title="How we can help"
                subtitle="InstantMed handles many common conditions entirely online. Here's what fits our service."
              />
              <div className="mx-auto max-w-4xl mt-10 grid md:grid-cols-2 gap-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    What we can help with
                  </h3>
                  <ul className="space-y-3">
                    {condition.canWeHelp.yes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 rounded-2xl p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    What needs in-person care
                  </h3>
                  <ul className="space-y-3">
                    {condition.canWeHelp.no.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* When to Seek Help */}
            <section className="py-16 lg:py-24 px-4 bg-muted/30 dark:bg-white/[0.04]">
              <SectionHeader
                pill="Clinical Guidance"
                title="When to see a doctor"
                subtitle="These indicators suggest you should seek professional medical advice promptly."
              />
              <div className="mx-auto max-w-4xl mt-10 grid md:grid-cols-2 gap-8">
                {/* Numbered list */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    Signs you need a doctor
                  </p>
                  <ul className="space-y-3">
                    {condition.whenToSeek.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-primary">{i + 1}</span>
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Emergency card */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Seek emergency care if
                  </p>
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl p-5">
                    <ul className="space-y-3">
                      {condition.whenEmergency.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-red-200/60 dark:border-red-800/60">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                        Call 000 or go to your nearest emergency department
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Doctor Perspective (optional) */}
            {condition.doctorPerspective && (
              <section className="py-16 lg:py-24 px-4">
                <div className="mx-auto max-w-3xl">
                  <SectionHeader
                    pill="Clinical Insight"
                    title={`A doctor's perspective on ${condition.name}`}
                  />
                  <div className="mt-10 rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-8 lg:p-10">
                    <div className="flex gap-4">
                      <div className="shrink-0">
                        <StickerIcon name="stethoscope" size={40} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-0.5">InstantMed Clinical Team</p>
                        <p className="text-xs text-muted-foreground mb-5">
                          AHPRA Registered
                          {condition.reviewedDate ? ` · Reviewed ${condition.reviewedDate}` : " · Medically reviewed"}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {condition.doctorPerspective}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Treatment Information (optional) */}
            {condition.treatmentInfo && (
              <section className="py-16 lg:py-24 px-4 bg-muted/30 dark:bg-white/[0.04]">
                <SectionHeader
                  pill="Treatment"
                  title={`Treating ${condition.name}`}
                  subtitle={condition.treatmentInfo.overview}
                />
                <div className="mx-auto max-w-4xl mt-10 grid sm:grid-cols-2 gap-5">
                  {condition.treatmentInfo.medications.map((med, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-6"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Pill className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              {med.genericName}
                            </h3>
                            {med.brandNames.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {med.brandNames.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        {med.pbsListed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                            <ShieldCheck className="w-3 h-3" />
                            PBS
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                            Non-PBS
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">Class:</span>
                          {med.drugClass}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">Typical dose:</span>
                          {med.typicalDose}
                        </div>
                        {med.pbsNote && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">PBS:</span>
                            {med.pbsNote}
                          </div>
                        )}
                      </div>

                      <ul className="space-y-1.5">
                        {med.keyPoints.map((point, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>

                      {med.availableOnline && (
                        <div className="mt-4 pt-3 border-t border-border/50 dark:border-white/10">
                          <Link
                            href={condition.ctaHref}
                            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            Available via InstantMed
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Guideline source + specialist guidance */}
                <div className="mx-auto max-w-4xl mt-8 space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/60" />
                    <span>
                      <span className="font-medium">Source:</span> {condition.treatmentInfo.guidelineSource}.
                      This information is educational only and does not replace clinical assessment.
                    </span>
                  </div>
                  {condition.treatmentInfo.whenToSeeSpecialist && (
                    <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <Stethoscope className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span>
                        <span className="font-medium">Specialist referral:</span> {condition.treatmentInfo.whenToSeeSpecialist}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* AU Stats strip (optional) */}
            {condition.auStats && condition.auStats.length > 0 && (
              <section className="py-10 px-4 bg-muted/30 dark:bg-white/[0.04]">
                <div className="mx-auto max-w-4xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5 text-center">
                    {condition.name} in Australia
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {condition.auStats.map((stat, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-sm shadow-primary/[0.04] dark:shadow-none text-sm text-muted-foreground"
                      >
                        <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{stat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Recovery Timeline (optional) */}
            {condition.recoveryTimeline && (
              <section className="py-16 lg:py-24 px-4">
                <SectionHeader
                  pill="Recovery"
                  title="What to expect"
                  subtitle="Typical recovery timeline and return-to-work guidance for most patients."
                />
                <div className="mx-auto max-w-4xl mt-10 grid sm:grid-cols-3 gap-5">
                  <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Typical recovery</p>
                    <p className="text-sm text-foreground leading-relaxed">{condition.recoveryTimeline.typical}</p>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <RotateCcw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Return to work</p>
                    <p className="text-sm text-foreground leading-relaxed">{condition.recoveryTimeline.returnToWork}</p>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">When to reassess</p>
                    <p className="text-sm text-foreground leading-relaxed">{condition.recoveryTimeline.whenToReassess}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Self-Care Tips (optional) */}
            {selfCareItems.length > 0 && (
              <IconChecklist
                pill="Self-Care"
                title={`Managing ${condition.name} at home`}
                subtitle="Evidence-based tips to support your recovery alongside medical treatment."
                items={selfCareItems}
                columns={2}
                className="bg-muted/30 dark:bg-white/[0.04]"
              />
            )}

            {/* FAQs */}
            <AccordionSection
              pill="FAQ"
              title={`Common questions about ${condition.name}`}
              subtitle="Answers to the most common questions from patients."
              groups={faqGroups}
            />

            {/* Testimonials */}
            <TestimonialsSection
              testimonials={testimonials}
              title="What patients say"
              subtitle="Real experiences from Australians who've used InstantMed"
              className="bg-muted/30 dark:bg-white/[0.04]"
            />

            {/* CTA Banner */}
            <CTABanner
              title={`Ready to get help with ${condition.name}?`}
              subtitle={`Australian-registered doctors available now. Most ${serviceLabel} completed within an hour.`}
              ctaText={condition.ctaText}
              ctaHref={condition.ctaHref}
              secondaryText="Learn how it works"
              secondaryHref="/how-it-works"
            />

          </main>

          <MarketingFooter />
        </div>
      </MarketingPageShell>
    </>
  )
}
