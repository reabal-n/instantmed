import { AlertTriangle, ArrowRight, CheckCircle, Clock, Pill, Shield } from "lucide-react"
import { HelpCircle } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import Script from "next/script"

import { MarketingFooter } from "@/components/marketing"
import { BreadcrumbSchema, FAQSchema } from "@/components/seo"
import { MedicalDisclaimer } from "@/components/seo"
import { Navbar } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABELS,getMedicationBySlug } from "@/lib/data/medications"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

// Generic prescription-service FAQs shown on all medication pages
const PRESCRIPTION_FAQS = [
  { q: "How does eScript work?", a: "After your doctor approves the prescription, you receive an eScript token via SMS. Take your phone to any Australian pharmacy and they'll scan it directly - no paper needed." },
  { q: "Do PBS subsidies still apply?", a: "Yes. If your medication is listed on the PBS, you'll pay the subsidised price at the pharmacy as usual. Our consultation fee is separate from your medication cost." },
  { q: "Can you prescribe Schedule 8 medications?", a: "No. We cannot prescribe Schedule 8 (S8) controlled substances such as opioids, benzodiazepines, or stimulants. These require an in-person consultation with your regular GP." },
  { q: "How long does a prescription review take?", a: "You can submit prescription requests 24/7. Most are reviewed within 1–2 hours during review hours (8am–10pm AEST, 7 days). You'll receive an email when your request has been reviewed." },
  { q: "Do I need a previous prescription?", a: "For repeat prescriptions, yes - this service is for medications you've already been prescribed. If you need a new medication, our general consult service is more appropriate." },
  { q: "What if the doctor declines my request?", a: "If a doctor determines the medication isn't appropriate, you'll receive a full refund. The doctor may suggest an alternative or recommend seeing your regular GP." },
]

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const med = getMedicationBySlug(slug)

  if (!med) {
    return { title: "Medication Not Found" }
  }

  const baseUrl = "https://instantmed.com.au"

  return {
    title: `${med.name} (${med.brandNames[0]}) | Online Consultation Australia`,
    description: `Learn about ${med.name} (${med.brandNames[0]}), including general uses and safety considerations. Prescription decisions require doctor assessment.`,
    keywords: [
      `${med.name.toLowerCase()} online consultation`,
      `${med.name.toLowerCase()} australia`,
      `${med.brandNames[0].toLowerCase()} doctor`,
      `${med.name.toLowerCase()} telehealth`,
    ],
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `${baseUrl}/prescriptions/med/${slug}`,
    },
    openGraph: {
      title: `${med.name} (${med.brandNames[0]}) | InstantMed`,
      description: `Consult an Australian doctor about ${med.name}. ${med.simpleDescription}`,
      url: `${baseUrl}/prescriptions/med/${slug}`,
    },
  }
}

export default async function MedicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const med = getMedicationBySlug(slug)

  if (!med) {
    notFound()
  }

  const baseUrl = "https://instantmed.com.au"

  const medPageSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${med.name} - Online Doctor Consultation`,
    description: med.simpleDescription,
    url: `${baseUrl}/prescriptions/med/${slug}`,
    lastReviewed: "2026-03-31",
    medicalAudience: {
      "@type": "MedicalAudience",
      audienceType: "Patient",
    },
    publisher: {
      "@type": "MedicalOrganization",
      "@id": `${baseUrl}/#organization`,
    },
    inLanguage: "en-AU",
  }

  return (
    <>
      <FAQSchema faqs={[
        ...(med.faqs || []).map(f => ({ question: f.q, answer: f.a })),
        ...PRESCRIPTION_FAQS.map(f => ({ question: f.q, answer: f.a })),
      ]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl },
          { name: "Prescriptions", url: `${baseUrl}/prescriptions` },
          { name: med.name, url: `${baseUrl}/prescriptions/med/${slug}` },
        ]}
      />
      <Script
        id={`med-page-schema-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(medPageSchema) }}
      />

    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="px-4 py-12 bg-linear-to-b from-background to-muted/30">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Info */}
              <div className="flex-1">
                <Badge variant="outline" className="mb-4">
                  {CATEGORY_LABELS[med.category]}
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-2">{med.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {med.brandNames.join(", ")} • {med.genericName}
                </p>
                <p className="text-lg mb-6">{med.simpleDescription}</p>

                {/* Quick Facts */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Same-day review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>AHPRA doctors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <span>Any pharmacy</span>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="lg:w-80 shrink-0">
                <div className="sticky top-24 p-6 rounded-2xl border bg-card shadow-lg">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">Doctor review</p>
                    <p className="text-2xl font-semibold">Prescription support</p>
                  </div>
                  <Button asChild className="w-full h-12 text-base" size="lg">
                    <Link href="/request?service=prescription">
                      Start a prescription request
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Medication details are collected securely inside the intake
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-8">
            {/* Uses */}
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                What it&apos;s used for
              </h2>
              <ul className="space-y-2">
                {med.uses.map((use) => (
                  <li key={use} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    {use}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dosages */}
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Common dosages
              </h2>
              <ul className="space-y-2">
                {med.dosages.map((dose) => (
                  <li key={dose} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    {dose}
                  </li>
                ))}
              </ul>
            </div>

            {/* Side Effects */}
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Possible side effects
              </h2>
              <ul className="space-y-2">
                {med.sideEffects.map((effect) => (
                  <li key={effect} className="flex items-start gap-2 text-sm">
                    <span className="text-warning mt-1">•</span>
                    {effect}
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Important warnings
              </h2>
              <ul className="space-y-2">
                {med.warnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-2 text-sm">
                    <span className="text-destructive mt-1">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Not suitable */}
        {med.contraindications.length > 0 && (
          <section className="px-4 py-8">
            <div className="mx-auto max-w-2xl">
              <div className="p-4 rounded-xl bg-destructive-light border border-destructive-border">
                <h3 className="font-semibold text-destructive mb-2">Who should NOT take {med.name}</h3>
                <ul className="space-y-1 text-sm text-destructive">
                  {med.contraindications.map((contra) => (
                    <li key={contra}>• {contra}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="px-4 py-12 bg-muted/30">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold mb-4">Need medication advice?</h2>
            <p className="text-muted-foreground mb-6">
              A doctor can review your existing medication history and decide what is clinically appropriate. Medication details are collected inside the secure request form.
            </p>
            <Button asChild size="lg" className="h-12 px-8">
              <Link href="/request?service=prescription">
                Start a prescription request
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* FAQs */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {med.faqs && med.faqs.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About {med.name}</h3>
                  {med.faqs.map((faq, i) => (
                    <div key={`med-${i}`} className="p-5 rounded-xl border bg-card">
                      <h4 className="font-semibold text-sm mb-2 flex items-start gap-2">
                        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {faq.q}
                      </h4>
                      <p className="text-sm text-muted-foreground pl-6">{faq.a}</p>
                    </div>
                  ))}
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-4">About the service</h3>
                </>
              )}
              {PRESCRIPTION_FAQS.map((faq, i) => (
                <div key={`svc-${i}`} className="p-5 rounded-xl border bg-card">
                  <h4 className="font-semibold text-sm mb-2 flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {faq.q}
                  </h4>
                  <p className="text-sm text-muted-foreground pl-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Medical Disclaimer */}
        <MedicalDisclaimer reviewedDate="2026-03" />
      </main>

      <MarketingFooter />
    </div>
    </>
  )
}
