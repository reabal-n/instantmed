import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  FileText,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema, HealthArticleSchema } from "@/components/seo/healthcare-schema"
import { MedicalDisclaimer } from "@/components/seo/medical-disclaimer"
import { PageBreadcrumbs } from "@/components/uix"
import { conditionsData } from "@/lib/seo/data/conditions"
import { PRICING_DISPLAY } from "@/lib/constants"
import {
  getConditionLocationCombo,
  getAllConditionLocationComboSlugs,
} from "@/lib/seo/data/condition-location-combos"

const CITY_DISPLAY_NAMES: Record<string, string> = {
  sydney: "Sydney",
  melbourne: "Melbourne",
  brisbane: "Brisbane",
  "gold-coast": "Gold Coast",
}

interface PageProps {
  params: Promise<{ slug: string; city: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, city } = await params
  const condition = conditionsData[slug]
  const combo = getConditionLocationCombo(slug, city)
  const cityName = CITY_DISPLAY_NAMES[city] ?? city

  if (!condition || !combo) return {}

  const title = `${condition.name} in ${cityName} | Medical Certificate Online`
  const description = `${condition.description} Get a medical certificate for ${condition.name.toLowerCase()} in ${cityName}. Australian doctors, same-day assessment. ${PRICING_DISPLAY.FROM_MED_CERT}.`

  return {
    title,
    description,
    keywords: [
      `${condition.name.toLowerCase()} ${cityName.toLowerCase()}`,
      `medical certificate ${cityName.toLowerCase()}`,
      `${condition.name.toLowerCase()} certificate online`,
    ],
    openGraph: {
      title: `${condition.name} in ${cityName} | InstantMed`,
      description: `Get a medical certificate for ${condition.name.toLowerCase()} in ${cityName}. Australian doctors, same-day assessment.`,
      url: `https://instantmed.com.au/conditions/${slug}/${city}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/conditions/${slug}/${city}`,
    },
  }
}

export async function generateStaticParams() {
  return getAllConditionLocationComboSlugs().map(({ slug, city }) => ({
    slug,
    city,
  }))
}

export default async function ConditionLocationPage({ params }: PageProps) {
  const { slug, city } = await params
  const condition = conditionsData[slug]
  const combo = getConditionLocationCombo(slug, city)
  const cityName = CITY_DISPLAY_NAMES[city] ?? city

  if (!condition || !combo) {
    notFound()
  }

  // Merge condition FAQs with local FAQs (local first for relevance)
  const allFaqs = [...combo.localFaqs, ...condition.commonQuestions]
  const faqSchemaData = allFaqs.map((faq) => ({
    question: faq.q,
    answer: faq.a,
  }))

  const baseUrl = "https://instantmed.com.au"

  return (
    <>
      <HealthArticleSchema title={`${condition.name} in ${cityName}`} description={condition.description} url={`/conditions/${slug}/${city}`} />
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl },
          { name: "Conditions", url: `${baseUrl}/conditions` },
          { name: condition.name, url: `${baseUrl}/conditions/${slug}` },
          { name: cityName, url: `${baseUrl}/conditions/${slug}/${city}` },
        ]}
      />

      <div className="flex min-h-screen flex-col bg-linear-to-b from-muted/50 to-white dark:from-background dark:to-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <div className="px-4 pt-6">
            <div className="mx-auto max-w-4xl">
              <PageBreadcrumbs
                links={[
                  { label: "Conditions", href: "/conditions" },
                  { label: condition.name, href: `/conditions/${slug}` },
                  { label: cityName },
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero with local angle */}
          <section className="relative px-4 py-12 sm:py-16 overflow-hidden">
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-info-light rounded-full blur-3xl" />
            </div>

            <div className="mx-auto max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
                <MapPin className="h-4 w-4" />
                {condition.name} in {cityName}
              </div>

              <h1 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6 tracking-tight">
                {condition.name} in {cityName}
              </h1>

              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {combo.localIntro}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AHPRA Registered</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success-light border border-success-border/20">
                  <Clock className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">~{condition.stats.avgTime} response</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-8 text-base font-semibold rounded-full shadow-lg shadow-primary/25"
                >
                  <Link href={condition.ctaHref}>
                    {condition.ctaText}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">{PRICING_DISPLAY.FROM_MED_CERT} · No appointment needed</p>
              </div>
            </div>
          </section>

          {/* Symptoms */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
                Common Symptoms of {condition.name}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {condition.symptoms.map((symptom, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm shadow-primary/[0.04]"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{symptom}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Can We Help */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
                How We Can Help
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-success-light/30 border border-success-border rounded-2xl p-6">
                  <h3 className="font-semibold text-success mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    What we can help with
                  </h3>
                  <ul className="space-y-3">
                    {condition.canWeHelp.yes.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-success"
                      >
                        <CheckCircle2 className="w-4 h-4 mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-warning-light/30 border border-warning-border rounded-2xl p-6">
                  <h3 className="font-semibold text-warning mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    What needs in-person care
                  </h3>
                  <ul className="space-y-3">
                    {condition.canWeHelp.no.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-warning"
                      >
                        <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* When to Seek / Emergency */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/5">
            <div className="mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    When to see a doctor
                  </h2>
                  <ul className="space-y-3">
                    {condition.whenToSeek.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-primary">{i + 1}</span>
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Seek emergency care if
                  </h2>
                  <div className="bg-destructive-light border border-destructive-border rounded-xl p-4">
                    <ul className="space-y-3">
                      {condition.whenEmergency.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-destructive"
                        >
                          <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-destructive-border">
                      <p className="text-sm font-medium text-destructive">
                        Call 000 or go to your nearest emergency department
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
                Common Questions About {condition.name} in {cityName}
              </h2>
              <div className="space-y-4">
                {allFaqs.map((faq, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04] rounded-xl p-6"
                  >
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-20 bg-linear-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                Ready to get help in {cityName}?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our Australian-registered doctors are available now. Most consultations completed
                within an hour.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-10 text-base font-semibold rounded-full shadow-lg shadow-primary/25"
                >
                  <Link href={condition.ctaHref}>
                    {condition.ctaText}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Valid certificates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>~{condition.stats.avgTime} response</span>
                </div>
              </div>
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
