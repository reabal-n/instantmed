import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  Stethoscope,
  ThermometerSun} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { BreadcrumbSchema, FAQSchema, MedicalConditionSchema, MedicalDisclaimer } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { PageBreadcrumbs } from "@/components/uix"
import { symptoms } from "@/lib/seo/data/symptoms"

const SHARED_SYMPTOM_FAQS: Array<{ q: string; a: string }> = [
  {
    q: "When should I get a medical certificate for my symptoms?",
    a: "If your symptoms are keeping you from work or study, you can request a medical certificate through InstantMed. A doctor will review your symptoms and issue a certificate if clinically appropriate - typically for 1 to 3 days depending on severity. You don't need to be dramatically unwell; feeling genuinely too rough to function is reason enough.",
  },
  {
    q: "Can I get a medical certificate without seeing a doctor in person?",
    a: "Yes. Australian-registered doctors can assess your symptoms and issue valid medical certificates via telehealth. You fill in a detailed health questionnaire, a doctor reviews it, and if appropriate, your certificate is delivered digitally. No waiting room required.",
  },
  {
    q: "How does a doctor assess my symptoms through telehealth?",
    a: "You complete a structured health questionnaire covering your symptoms, duration, severity, and relevant medical history. The reviewing doctor uses this information - the same clinical reasoning they'd apply in a face-to-face consult - to determine whether a certificate, advice, or referral is appropriate.",
  },
  {
    q: "What if my symptoms get worse after getting a certificate?",
    a: "A medical certificate covers the period stated on the document. If your symptoms worsen or don't improve as expected, you should see a GP in person or visit your nearest emergency department if it's urgent. Your certificate doesn't replace ongoing care - it's a point-in-time clinical assessment.",
  },
  {
    q: "Can I get a prescription through InstantMed for my symptoms?",
    a: "In some cases, yes. If a doctor reviewing your request determines that a common, non-restricted treatment is appropriate, they may issue a prescription as part of a consultation. Not all symptoms require or qualify for a prescription - the doctor will advise you on next steps.",
  },
  {
    q: "How long does the doctor's review take?",
    a: "Medical certificates are typically issued in about 20 minutes, available 24/7. Other requests are reviewed within 1–2 hours during operating hours (8am–10pm AEST, 7 days). You'll receive an email notification once your request has been reviewed.",
  },
  {
    q: "What happens if the doctor thinks I need in-person care?",
    a: "If your symptoms suggest something that requires a physical examination, diagnostic tests, or specialist referral, the doctor will let you know and recommend appropriate next steps. Your safety is the priority - telehealth is a great option for many things, but it's not a replacement for hands-on assessment when that's what's needed.",
  },
  {
    q: "Do I need a Medicare card to use InstantMed?",
    a: "No Medicare card is required for medical certificates. If you're requesting a prescription or consultation, a valid Medicare card is needed. Our service is private and does not attract a Medicare rebate, though any prescriptions issued can still attract PBS subsidies at the pharmacy.",
  },
]

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const symptom = symptoms[slug]
  if (!symptom) return {}

  const title = `${symptom.name} | Causes & When to See a Doctor`
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

  // Merge symptom-specific FAQs (first, more relevant) with shared FAQs
  const allFaqs = [...symptom.faqs, ...SHARED_SYMPTOM_FAQS]

  // Transform FAQs for schema
  const faqSchemaData = allFaqs.map(faq => ({
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

          {/* Doctor's Perspective - unique clinical triage insight */}
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

          {/* Related Reading - contextual per symptom's service type */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground font-medium">Related reading:</span>
                {(symptom.serviceRecommendation.type === "med-cert" || symptom.serviceRecommendation.type === "both") && (
                  <Link href="/guides/how-to-get-medical-certificate-for-work" className="text-primary hover:underline">
                    Med cert for work
                  </Link>
                )}
                {(symptom.serviceRecommendation.type === "med-cert" || symptom.serviceRecommendation.type === "both") && (
                  <Link href="/blog/medical-certificate-online-australia" className="text-primary hover:underline">
                    Online med certs in Australia
                  </Link>
                )}
                {(symptom.serviceRecommendation.type === "consult" || symptom.serviceRecommendation.type === "both") && (
                  <Link href="/blog/telehealth-vs-gp-australia" className="text-primary hover:underline">
                    Telehealth vs GP
                  </Link>
                )}
                {(symptom.serviceRecommendation.type === "consult" || symptom.serviceRecommendation.type === "both") && (
                  <Link href="/guides/when-to-use-telehealth" className="text-primary hover:underline">
                    When to use telehealth
                  </Link>
                )}
                <Link href="/guides/telehealth-guide-australia" className="text-primary hover:underline">
                  Telehealth guide
                </Link>
              </div>
            </div>
          </section>

          {/* Clinical Governance */}
          <div className="mx-auto max-w-3xl px-4 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              All clinical decisions are made by AHPRA-registered doctors following{" "}
              <Link href="/clinical-governance" className="text-primary hover:underline">
                our clinical governance framework
              </Link>
              . We never automate clinical decisions.
            </p>
          </div>

          {/* FAQ Section */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/[0.06]">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {allFaqs.map((faq, i) => (
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
                  <Link href="/consult" className="text-primary hover:underline font-medium">
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
                  <Link href="/consult" className="text-primary hover:underline font-medium">
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

          {/* Medical Disclaimer */}
          <MedicalDisclaimer reviewedDate="2026-03" />
        </main>

        <Footer />
      </div>
    </>
  )
}
