import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  FileCheck,
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
import { GUARANTEE } from '@/lib/marketing/voice'

const baseUrl = 'https://instantmed.com.au'

export const metadata: Metadata = {
  title: "Online Medical Certificate Evidence | InstantMed",
  description: "Understand how workplaces review doctor-issued online medical certificates, what details are included, and when a standard certificate may not be enough.",
  openGraph: {
    title: "Online Medical Certificate Evidence | InstantMed",
    description: "How doctor-issued online certificates can support workplace evidence processes.",
    type: 'website',
    url: `${baseUrl}/medical-certificate/employer-acceptance`,
  },
  alternates: {
    canonical: `${baseUrl}/medical-certificate/employer-acceptance`,
  },
}

const faqs = [
  {
    question: "How do workplaces usually review online certificate evidence?",
    answer: "Workplaces commonly check who issued the document, the dates covered, whether it identifies the employee, and whether it fits the workplace evidence policy. Policies and circumstances can vary.",
  },
  {
    question: "What should workplace certificate evidence include?",
    answer: "Routine evidence is strongest when it includes the patient's name, dates covered, issue date, doctor's name and signature, AHPRA registration or provider number, and practice verification details. InstantMed certificates include those standard document details.",
  },
  {
    question: "Does an online certificate decide whether I can work from home?",
    answer: "No. A standard certificate records an absence assessment. It does not set remote-work duties, modified duties, or workplace arrangements. Those decisions sit with your workplace policy and manager or HR process.",
  },
  {
    question: "What if my workplace asks for more information?",
    answer: "Ask what specific document or detail is required. Some situations need a separate form, in-person review, return-to-work clearance, capacity assessment, insurer paperwork, or formal evidence rather than a routine absence certificate.",
  },
  {
    question: "How can a workplace verify an InstantMed certificate?",
    answer: "The certificate includes doctor and practice details. Workplaces can use InstantMed's verification page or contact details to check the document without seeing diagnosis information.",
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
                Online medical certificates from AHPRA-registered doctors can support
                sick or carer&apos;s leave evidence processes. Workplace policies may vary.
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
                A certificate is one part of a workplace evidence process. InstantMed
                certificates include doctor details, dates, signature, and verification
                information a workplace can review, but they do not override workplace
                policy or replace specialist forms.
              </p>
            </div>
          </section>

          {/* What Makes It Useful */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-card/40">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-center mb-4">What makes certificate evidence useful</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Strong workplace evidence is clear about who issued it, who it relates to,
                the dates covered, and how the document can be checked.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className={iconClass} />
                    <div>
                      <h3 className="font-semibold mb-1">AHPRA-registered doctor</h3>
                      <p className="text-sm text-muted-foreground">
                        The reviewing doctor is registered with the Australian Health Practitioner Regulation Agency, and the certificate includes doctor-identifying details.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-start gap-3">
                    <FileCheck className={iconClass} />
                    <div>
                      <h3 className="font-semibold mb-1">Dates and issue details</h3>
                      <p className="text-sm text-muted-foreground">
                        The document states the patient&apos;s name, the certificate dates, and the date the certificate was issued.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-start gap-3">
                    <Building2 className={iconClass} />
                    <div>
                      <h3 className="font-semibold mb-1">Practice verification</h3>
                      <p className="text-sm text-muted-foreground">
                        Workplace teams can use the certificate reference, practice contact details, and InstantMed verification page to check a document.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-start gap-3">
                    <Shield className={iconClass} />
                    <div>
                      <h3 className="font-semibold mb-1">Diagnosis privacy</h3>
                      <p className="text-sm text-muted-foreground">
                        Routine absence certificates do not need to disclose a diagnosis for a workplace to review the document.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Doctor Review */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-center mb-4">What the doctor reviews first</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                The certificate is only created after a doctor reviews whether the request
                is clinically suitable for a short absence document.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className={cardClass}>
                  <FileCheck className={iconClass} />
                  <h3 className="mt-3 font-semibold">Reason for absence</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The doctor reviews the reported illness, injury, or caring need, when it started, and which dates need evidence.
                  </p>
                </div>

                <div className={cardClass}>
                  <Shield className={iconClass} />
                  <h3 className="mt-3 font-semibold">Online suitability</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The request is checked for red flags, urgent symptoms, or circumstances that need in-person care instead.
                  </p>
                </div>

                <div className={cardClass}>
                  <BadgeCheck className={iconClass} />
                  <h3 className="mt-3 font-semibold">Document scope</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The doctor keeps the certificate to ordinary absence evidence, not modified duties, workplace safety clearance, or administrative paperwork.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Workplace Review */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-center mb-4">How a workplace may review it</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                HR, payroll, or a manager may check the document against the relevant
                absence process. This page is general information, not legal advice.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Policy fit</h3>
                  <p className="text-sm text-muted-foreground">
                    The workplace may check the notice period, leave type, employee name, and certificate dates against its policy.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Document checks</h3>
                  <p className="text-sm text-muted-foreground">
                    The workplace can look for doctor-identifying details, practice contact details, issue date, and a certificate reference.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Context matters</h3>
                  <p className="text-sm text-muted-foreground">
                    Longer absences, repeated absences, workplace injury processes, or safety-sensitive duties may need a different document.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Limits */}
          <section className="px-4 py-16 bg-muted/30 dark:bg-card/40">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-center mb-4">When a standard certificate is not enough</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Some workplace situations need a separate process because the question is
                broader than short sick or carer&apos;s leave evidence.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Return-to-work or capacity questions</h3>
                  <p className="text-sm text-muted-foreground">
                    A short absence certificate does not assess whether someone can safely resume duties, perform manual tasks, or work with restrictions.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Workplace-specific forms</h3>
                  <p className="text-sm text-muted-foreground">
                    Some employers, education providers, insurers, or administrative processes use their own form with fields a routine certificate does not cover.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Work-from-home arrangements</h3>
                  <p className="text-sm text-muted-foreground">
                    A certificate does not decide whether remote work is available, expected, or suitable for your role. See the{' '}
                    <Link href="/medical-certificate/work-from-home" className={linkClass}>
                      work-from-home certificate guide
                    </Link>
                    {' '}for that narrower scenario.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">More detailed clinical assessment</h3>
                  <p className="text-sm text-muted-foreground">
                    Severe symptoms, injury after an accident, ongoing symptoms, or a request for detailed restrictions may need in-person review.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* If Questions Arise */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-center mb-4">If your workplace asks questions</h2>
              <p className="text-center text-muted-foreground mb-10">
                Keep the response factual and use the document details already provided.
              </p>

              <div className="space-y-4">
                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Use the verification path</h3>
                  <p className="text-sm text-muted-foreground">
                    Direct the workplace to the certificate reference, doctor details, and{' '}
                    <Link href="/verify" className={linkClass}>
                      InstantMed verification page
                    </Link>
                    {' '}rather than sharing extra health information.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Ask what is missing</h3>
                  <p className="text-sm text-muted-foreground">
                    If a workplace needs something else, ask for the specific policy, form, or detail so you know whether a standard certificate is the right document.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-semibold mb-2">Do not alter the certificate</h3>
                  <p className="text-sm text-muted-foreground">
                    The doctor-issued document should remain unchanged. If details appear incorrect, contact support so the record can be reviewed properly.
                  </p>
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
                  <span className="text-sm">Dates covered by the certificate</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Doctor&apos;s full name and signature</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Doctor-identifying details</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className={checkClass} />
                  <span className="text-sm">Certificate reference and verification details</span>
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
                Complete the secure questionnaire. A doctor reviews your request.
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
              <p className="mt-4 text-sm text-muted-foreground">{PRICING_DISPLAY.MED_CERT} • {GUARANTEE}</p>
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
                <Link href="/verify" className={linkClass}>
                  Verify a certificate
                </Link>
                {' • '}
                <Link href="/resources/medical-certificate-employer-policy" className={linkClass}>
                  Employer policy explainer
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
