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
  Users,
  Zap
} from "@/lib/icons"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { PageBreadcrumbs } from "@/components/uix"
import { conditionsData } from "@/lib/seo/data/conditions"

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
    title,
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

export default async function ConditionPage({ params }: PageProps) {
  const { slug } = await params
  const condition = conditions[slug]

  if (!condition) {
    notFound()
  }

  // Transform FAQs for schema
  const faqSchemaData = condition.commonQuestions.map(faq => ({
    question: faq.q,
    answer: faq.a
  }))

  return (
    <>
      {/* SEO Structured Data */}
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Conditions", url: "https://instantmed.com.au/conditions" },
          { name: condition.name, url: `https://instantmed.com.au/conditions/${slug}` }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-gradient-to-b from-muted/50 to-white dark:from-background dark:to-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6">
            <div className="mx-auto max-w-4xl">
              <PageBreadcrumbs
                links={[
                  { label: "Conditions", href: "/conditions" },
                  { label: condition.name }
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero Section */}
          <section className="relative px-4 py-12 sm:py-16 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div className="mx-auto max-w-4xl">
              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Shield className="w-4 h-4 text-primary icon-premium" />
                  <span className="text-sm font-medium">AHPRA Registered Doctors</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Clock className="w-4 h-4 text-emerald-600 icon-premium" />
                  <span className="text-sm font-medium">Avg. {condition.stats.avgTime} response</span>
                </div>
              </div>

              {/* Main heading */}
              <h1 className="text-4xl sm:text-5xl font-bold text-center text-foreground mb-6 tracking-tight">
                {condition.name}
              </h1>

              <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-8 leading-relaxed">
                {condition.description}
              </p>

              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Button asChild size="lg" className="h-14 px-8 text-base font-semibold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  <Link href={condition.ctaHref}>
                    {condition.ctaText}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  From $19.95 · No appointment needed
                </p>
              </div>

              {/* Social proof */}
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary icon-premium" />
                  <span>AHPRA-registered doctors</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600 icon-premium" />
                  <span>Response in ~{condition.stats.avgTime}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Symptoms Section */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/[0.06]">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Common Symptoms of {condition.name}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {condition.symptoms.map((symptom, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none rounded-xl border border-border/50 dark:border-white/15"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary icon-premium" />
                    </div>
                    <span className="text-foreground">{symptom}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Can We Help Section */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                How We Can Help
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* What we can help with */}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 icon-premium" />
                    What we can help with
                  </h3>
                  <ul className="space-y-3">
                    {condition.canWeHelp.yes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What needs in-person care */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 icon-premium" />
                    What needs in-person care
                  </h3>
                  <ul className="space-y-3">
                    {condition.canWeHelp.no.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* When to Seek Help */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/[0.06]">
            <div className="mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* When to see a doctor */}
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary icon-premium" />
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

                {/* Emergency warning */}
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 icon-premium" />
                    Seek emergency care if
                  </h2>
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                    <ul className="space-y-3">
                      {condition.whenEmergency.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Call 000 or go to your nearest emergency department
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Common Questions About {condition.name}
              </h2>

              <div className="space-y-4">
                {condition.commonQuestions.map((faq, i) => (
                  <div 
                    key={i}
                    className="bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none border border-border/50 dark:border-white/15 rounded-xl p-6"
                  >
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="px-4 py-20 bg-gradient-to-b from-primary/5 to-transparent">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to get help?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our Australian-registered doctors are available now. Most consultations completed within an hour.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="h-14 px-10 text-base font-semibold rounded-full shadow-lg shadow-primary/25">
                  <Link href={condition.ctaHref}>
                    {condition.ctaText}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>

              {/* Trust signals */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary icon-premium" />
                  <span>AHPRA registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary icon-premium" />
                  <span>Valid certificates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary icon-premium" />
                  <span>~{condition.stats.avgTime} response</span>
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
