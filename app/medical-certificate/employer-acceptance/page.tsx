import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  FileCheck,
  Scale,
  Shield,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { BreadcrumbSchema, FAQSchema } from '@/components/seo/healthcare-schema'
import { Navbar } from '@/components/shared/navbar'
import { Button } from '@/components/ui/button'
import { SectionPill } from '@/components/ui/section-pill'
import { PRICING_DISPLAY } from '@/lib/constants'

const baseUrl = 'https://instantmed.com.au'

export const metadata: Metadata = {
  title: "Online Medical Certificate Evidence | InstantMed",
  description: "Learn how Australian employers assess online medical certificates from AHPRA-registered doctors, and what makes a certificate useful as workplace evidence.",
  openGraph: {
    title: "Online Medical Certificate Evidence | InstantMed",
    description: "How AHPRA-registered telehealth certificates can support workplace evidence requirements.",
    type: 'website',
    url: `${baseUrl}/medical-certificate/employer-acceptance`,
  },
  alternates: {
    canonical: `${baseUrl}/medical-certificate/employer-acceptance`,
  },
}

const faqs = [
  {
    question: "Can online medical certificates be used as workplace evidence?",
    answer: "Yes. Medical certificates issued by AHPRA-registered doctors via telehealth can support workplace evidence requirements. Employer policies may vary.",
  },
  {
    question: "What should workplace certificate evidence include?",
    answer: "Routine workplace evidence is usually strongest when it includes the doctor's name, AHPRA registration or provider number, stated absence dates, and the doctor's signature. InstantMed certificates include those standard details.",
  },
  {
    question: "Can my employer refuse an online medical certificate?",
    answer: "Under Fair Work guidance, employers can ask for evidence that would satisfy a reasonable person. A certificate from an AHPRA-registered doctor is commonly used for this purpose, but specific workplace policies may vary.",
  },
  {
    question: "What if my employer questions the certificate?",
    answer: "You can point out that the certificate includes the doctor's AHPRA registration and provider number, which can be verified. Every clinician on our platform is registered with the Australian Health Practitioner Regulation Agency.",
  },
  {
    question: "Is the doctor's provider number on the certificate?",
    answer: "Yes. Every certificate includes the doctor's name, signature, AHPRA registration, and Medicare provider number. This allows employers to verify the certificate if needed.",
  },
]

const cardClass =
  "rounded-xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
const iconClass = "h-6 w-6 shrink-0 text-primary mt-0.5"
const checkClass = "h-5 w-5 text-primary"
const linkClass = "text-primary hover:underline"

export default function EmployerAcceptancePage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: baseUrl },
          { name: 'Medical Certificate', url: `${baseUrl}/medical-certificate` },
          { name: 'Employer Evidence', url: `${baseUrl}/medical-certificate/employer-acceptance` }
        ]}
      />
      <FAQSchema faqs={faqs} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6">
                <SectionPill>Common Question</SectionPill>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl mb-4">
                How workplace certificate evidence works
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Online medical certificates from AHPRA-registered doctors can be used as
                evidence for sick or carer&apos;s leave. Employer policies may vary.
              </p>
            </div>
          </section>

          {/* Employer Evidence Context */}
          <section className="px-4 py-12 border-b border-border/30 dark:border-white/10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-widest">
                Evidence, not promises
              </p>
              <p className="text-sm text-muted-foreground">
                Employers can ask for evidence that would satisfy a reasonable person.
                InstantMed certificates include the doctor details, dates, signature, and
                verification information an employer can review.
              </p>
            </div>
          </section>

          {/* What Makes It Valid */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-card/40">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-center mb-4">What makes certificate evidence useful</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                InstantMed certificates include the details workplaces commonly review.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className={iconClass} />
                    <div>
                      <h3 className="font-semibold mb-1">AHPRA-registered doctor</h3>
                      <p className="text-sm text-muted-foreground">
                        Every certificate is issued by a doctor registered with the Australian Health Practitioner Regulation Agency. Their registration number is included on the certificate.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-start gap-3">
                    <FileCheck className={iconClass} />
                    <div>
                      <h3 className="font-semibold mb-1">Medicare provider number</h3>
                      <p className="text-sm text-muted-foreground">
                        The doctor&apos;s Medicare provider number is printed on every certificate. This is a unique identifier that can be verified.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-start gap-3">
                    <Building2 className={iconClass} />
                    <div>
                      <h3 className="font-semibold mb-1">Australian-based practice</h3>
                      <p className="text-sm text-muted-foreground">
                        Our operations are based in Australia, with certificate verification handled through InstantMed records.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-start gap-3">
                    <Shield className={iconClass} />
                    <div>
                      <h3 className="font-semibold mb-1">Doctor&apos;s Signature</h3>
                      <p className="text-sm text-muted-foreground">
                        Each certificate includes the doctor&apos;s digital signature, name, and the date of issue.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Fair Work Context */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-center mb-4">What the Fair Work Act says</h2>
              <p className="text-center text-muted-foreground mb-10">
                Fair Work guidance focuses on evidence that would satisfy a reasonable person.
              </p>

              <div className="rounded-xl border border-border/50 bg-white p-6 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                <div className="flex items-start gap-4">
                  <Scale className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div className="space-y-4">
                    <p className="text-sm">
                      Under the <strong>Fair Work Act 2009</strong>, employees are entitled to paid personal/carer&apos;s leave.
                      Employers may request evidence of illness. Fair Work guidance refers to evidence that would
                      satisfy a reasonable person, such as a medical certificate from a registered health practitioner.
                    </p>
                    <p className="text-sm">
                      A certificate from an AHPRA-registered doctor can be used as evidence for this purpose.
                      The <strong>Medical Board of Australia</strong> recognises telehealth as a mode of healthcare delivery
                      when clinically appropriate, while also making clear that not every request is suitable online.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Note: This is general information, not legal advice. Specific workplace policies may vary.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Certificate Preview */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-card/40">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-center mb-4">What your certificate includes</h2>
              <p className="text-center text-muted-foreground mb-10">
                Each certificate includes standard document details for workplace review.
              </p>

              <div className="rounded-xl border border-border/50 bg-white p-6 shadow-sm shadow-primary/[0.04] space-y-4 dark:border-white/15 dark:bg-card dark:shadow-none">
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Patient&apos;s full name</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Dates the patient was unfit for work</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Doctor&apos;s full name and signature</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">AHPRA registration number</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Medicare provider number</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Date of issue</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Practice contact details</span>
                </div>
              </div>
            </div>
          </section>

          {/* What To Say */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-center mb-4">If your employer questions it</h2>
              <p className="text-center text-muted-foreground mb-10">
                If questions arise, the certificate gives your workplace clear information to review.
              </p>

              <div className="space-y-4">
                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Point to the doctor&apos;s credentials</h3>
                  <p className="text-sm text-muted-foreground">
                    The certificate includes the doctor&apos;s AHPRA registration number. Anyone can verify this is a real,
                    registered doctor by searching the AHPRA register at ahpra.gov.au.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Telehealth is recognised healthcare</h3>
                  <p className="text-sm text-muted-foreground">
                    The Medical Board of Australia and Medicare both recognise telehealth consultations.
                    The important point for workplaces is that the certificate is issued by an AHPRA-registered doctor.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Check workplace policy timing</h3>
                  <p className="text-sm text-muted-foreground">
                    If your workplace has specific evidence requirements, check the relevant policy,
                    award, enterprise agreement, or HR guidance.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-card/40">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-center mb-10">Frequently asked questions</h2>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className={cardClass}>
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16 bg-primary/5 dark:bg-primary/10">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold mb-4">Ready to get your certificate?</h2>
              <p className="text-muted-foreground mb-8">
                Complete the questionnaire in about 2 minutes. A doctor reviews your request.
              </p>
              <Button
                asChild
                size="lg"
                className="rounded-full px-8"
              >
                <Link href="/request?service=med-cert">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">{PRICING_DISPLAY.MED_CERT} • Refund if we can&apos;t help</p>
            </div>
          </section>

          {/* Related Links */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/medical-certificate/work" className={linkClass}>
                  Certificates for work
                </Link>
                {' • '}
                <Link href="/medical-certificate/study" className={linkClass}>
                  Certificates for study
                </Link>
                {' • '}
                <Link href="/medical-certificate" className={linkClass}>
                  All certificate types
                </Link>
              </p>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
