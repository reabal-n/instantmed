import { Navbar } from "@/components/shared/navbar"
import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  ThermometerSun,
  Activity
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema, MedicalConditionSchema } from "@/components/seo/healthcare-schema"
import { PageBreadcrumbs } from "@/components/uix"
import { symptoms } from "@/lib/seo/data/symptoms"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const symptom = symptoms[slug]
  if (!symptom) return {}

  const title = `${symptom.name} | Causes, When to See a Doctor | InstantMed`
  const description = `${symptom.description} Learn about possible causes, self-care tips, and when you should see a doctor. Get assessed online by Australian doctors.`

  return {
    title,
    description,
    keywords: [
      `${symptom.name.toLowerCase()} causes`,
      `${symptom.name.toLowerCase()} when to see doctor`,
      `${symptom.name.toLowerCase()} treatment`,
      `${symptom.name.toLowerCase()} symptoms`,
      `what causes ${symptom.name.toLowerCase()}`,
    ],
    openGraph: {
      title: `${symptom.name} - Causes & When to See a Doctor | InstantMed`,
      description: `Understand your ${symptom.name.toLowerCase()} symptoms. Learn possible causes and when to seek medical advice.`,
      url: `https://instantmed.com.au/symptoms/${slug}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/symptoms/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(symptoms).map((slug) => ({ slug }))
}

export default async function SymptomPage({ params }: PageProps) {
  const { slug } = await params
  const symptom = symptoms[slug]

  if (!symptom) {
    notFound()
  }

  // Transform FAQs for schema
  const faqSchemaData = symptom.faqs.map(faq => ({
    question: faq.q,
    answer: faq.a
  }))

  return (
    <>
      {/* SEO Structured Data */}
      <MedicalConditionSchema
        name={symptom.name}
        description={symptom.description}
        url={`/symptoms/${slug}`}
      />
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Symptom Checker", url: "https://instantmed.com.au/symptoms" },
          { name: symptom.name, url: `https://instantmed.com.au/symptoms/${slug}` }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-background dark:bg-black">
        <Navbar variant="marketing" />
        <ContentPageTracker pageType="symptom" slug={slug} serviceRecommendation={symptom.serviceRecommendation.type === "both" ? "med-cert" : symptom.serviceRecommendation.type === "med-cert" ? "med-cert" : "consult"} />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6 bg-white dark:bg-card">
            <div className="mx-auto max-w-4xl">
              <PageBreadcrumbs
                links={[
                  { label: "Symptoms", href: "/symptoms" },
                  { label: symptom.name }
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero Section */}
          <section className="relative px-4 py-8 sm:py-12 bg-white dark:bg-card border-b border-border dark:border-border">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ThermometerSun className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-2">
                    {symptom.name}
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {symptom.description}
                  </p>
                </div>
              </div>

              {/* Quick CTA */}
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  <Link href={symptom.serviceRecommendation.href}>
                    {symptom.serviceRecommendation.text}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground">
                  Australian doctors · Response in ~45 mins
                </span>
              </div>
            </div>
          </section>

          {/* Possible Causes Section */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                What Could Be Causing Your {symptom.name}?
              </h2>
              <p className="text-muted-foreground mb-8">
                There are several possible causes. Here are the most common ones:
              </p>

              <div className="space-y-6">
                {symptom.possibleCauses.map((cause, i) => (
                  <div 
                    key={i}
                    className="bg-white dark:bg-card rounded-2xl border border-border dark:border-border p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-lg text-foreground">{cause.name}</h3>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        cause.likelihood === 'common' 
                          ? 'bg-success-light text-success'
                          : cause.likelihood === 'less-common'
                          ? 'bg-warning-light text-warning'
                          : 'bg-white text-foreground dark:bg-white/[0.06] dark:text-muted-foreground'
                      }`}>
                        {cause.likelihood === 'common' ? 'Common' : cause.likelihood === 'less-common' ? 'Less common' : 'Rare'}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">{cause.description}</p>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">You might suspect this if you have:</p>
                      <div className="flex flex-wrap gap-2">
                        {cause.whenToSuspect.map((sign, j) => (
                          <span 
                            key={j}
                            className="text-sm px-3 py-1 bg-white dark:bg-white/[0.06] rounded-full text-muted-foreground"
                          >
                            {sign}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-primary/5 dark:bg-primary/5 border border-primary/20 dark:border-primary/20 rounded-xl">
                <p className="text-sm text-primary dark:text-primary">
                  <strong>Important:</strong> This information is for general guidance only and should not be used to self-diagnose. 
                  A doctor can properly assess your symptoms and provide appropriate advice.
                </p>
              </div>
            </div>
          </section>

          {/* Self-Care Advice */}
          <section className="px-4 py-16 bg-white dark:bg-card">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8">
                Self-Care Tips for {symptom.name}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {symptom.selfCareAdvice.map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 bg-white dark:bg-card rounded-xl"
                  >
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <span className="text-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* When to See a Doctor */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* See a doctor */}
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    See a Doctor If
                  </h2>
                  <div className="space-y-3">
                    {symptom.whenToSeeDoctor.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 text-foreground">
                        <Activity className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <Button asChild className="mt-6 rounded-full">
                    <Link href={symptom.serviceRecommendation.href}>
                      {symptom.serviceRecommendation.text}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* Emergency signs */}
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Seek Emergency Care If
                  </h2>
                  <div className="bg-destructive-light border border-destructive-border rounded-xl p-5">
                    <div className="space-y-3">
                      {symptom.emergencySigns.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-destructive">
                          <AlertTriangle className="w-4 h-4 mt-1 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-destructive-border">
                      <p className="text-sm font-semibold text-destructive">
                        Call 000 or go to Emergency immediately
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Doctor's Perspective — unique clinical triage insight */}
          {symptom.doctorPerspective && (
            <section className="px-4 py-16">
              <div className="mx-auto max-w-3xl">
                <div className="bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none border border-border/50 dark:border-white/15 rounded-2xl p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Doctor&apos;s perspective</span>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    How a GP Assesses {symptom.name}
                  </h2>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-3">
                    <p>{symptom.doctorPerspective}</p>
                    {symptom.certGuidance && (
                      <p className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                        <strong className="text-foreground">Medical certificate guidance:</strong>{" "}
                        {symptom.certGuidance}
                      </p>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/50 dark:border-white/10 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Clinically reviewed by the InstantMed Medical Team
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Last updated: March 2026
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* E-E-A-T fallback for symptoms without doctor perspective */}
          {!symptom.doctorPerspective && (
            <section className="px-4 py-16">
              <div className="mx-auto max-w-3xl">
                <div className="bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none border border-border/50 dark:border-white/15 rounded-2xl p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Medically reviewed</span>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    Next Steps for {symptom.name}
                  </h2>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-3">
                    <p>{symptom.description}</p>
                    <p>
                      If you&apos;re experiencing {symptom.name.toLowerCase()} and need medical advice, an Australian telehealth
                      consultation can help determine whether your symptoms require further investigation, a medical certificate,
                      or a referral to a specialist.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/50 dark:border-white/10 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Clinically reviewed by the InstantMed Medical Team
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Last updated: March 2026
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Related Reading */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground font-medium">Related reading:</span>
                <Link href="/guides/telehealth-guide-australia" className="text-primary hover:underline">
                  Telehealth guide
                </Link>
                <Link href="/guides/when-to-use-telehealth" className="text-primary hover:underline">
                  When to use telehealth
                </Link>
                <Link href="/guides/how-to-get-medical-certificate-for-work" className="text-primary hover:underline">
                  Med cert for work
                </Link>
                <Link href="/blog/telehealth-vs-gp-when-to-use-each" className="text-primary hover:underline">
                  Telehealth vs GP
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/[0.06]">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {symptom.faqs.map((faq, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-card rounded-xl p-6 shadow-md shadow-primary/[0.06] dark:shadow-none border border-border/50 dark:border-white/15"
                  >
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Related Symptoms & Conditions */}
          {symptom.relatedSymptoms.length > 0 && (
            <section className="px-4 py-16">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
                  Related Health Topics
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  {symptom.relatedSymptoms
                    .filter((relSlug) => symptoms[relSlug])
                    .map((relSlug) => {
                      const related = symptoms[relSlug]
                      return (
                        <Link
                          key={relSlug}
                          href={`/symptoms/${relSlug}`}
                          className="flex items-start gap-3 p-4 bg-white dark:bg-card rounded-xl border border-border dark:border-border hover:border-primary/30 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Activity className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {related.name}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {related.description}
                            </p>
                          </div>
                        </Link>
                      )
                    })}

                  {/* Link to condition pages where slug matches a condition */}
                  {symptom.relatedSymptoms
                    .filter((relSlug) => !symptoms[relSlug])
                    .slice(0, 4)
                    .map((conditionSlug) => (
                      <Link
                        key={conditionSlug}
                        href={`/conditions/${conditionSlug}`}
                        className="flex items-center gap-3 p-4 bg-white dark:bg-card rounded-xl border border-border dark:border-border hover:border-primary/30 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-info-light flex items-center justify-center shrink-0">
                          <Stethoscope className="w-4 h-4 text-info" />
                        </div>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors capitalize">
                          {conditionSlug.replace(/-/g, " ")}
                        </span>
                      </Link>
                    ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Link href="/medical-certificate" className="text-primary hover:underline font-medium">
                    Medical certificates →
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/general-consult" className="text-primary hover:underline font-medium">
                    GP consultations →
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/prescriptions" className="text-primary hover:underline font-medium">
                    Repeat prescriptions →
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/symptoms" className="text-primary hover:underline font-medium">
                    All symptoms →
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/conditions" className="text-primary hover:underline font-medium">
                    Browse conditions →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Cross-links fallback when no related symptoms */}
          {symptom.relatedSymptoms.length === 0 && (
            <section className="px-4 py-8">
              <div className="mx-auto max-w-4xl">
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Link href="/medical-certificate" className="text-primary hover:underline font-medium">
                    Medical certificates →
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/general-consult" className="text-primary hover:underline font-medium">
                    GP consultations →
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/prescriptions" className="text-primary hover:underline font-medium">
                    Repeat prescriptions →
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/symptoms" className="text-primary hover:underline font-medium">
                    All symptoms →
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link href="/conditions" className="text-primary hover:underline font-medium">
                    Browse conditions →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* CTA Section */}
          <section className="px-4 py-20 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                Concerned About Your Symptoms?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our Australian-registered doctors can assess your symptoms and provide advice, treatment, or medical certificates if needed.
              </p>

              <Button asChild size="lg" className="h-14 px-10 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Link href={symptom.serviceRecommendation.href}>
                  {symptom.serviceRecommendation.text}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>

              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Response in ~45 mins</span>
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
