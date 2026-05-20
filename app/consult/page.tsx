import { AlertCircle, ArrowRight, Stethoscope } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { FaqCtaSection } from "@/components/marketing/sections/faq-cta-section"
import { ServiceCards } from "@/components/marketing/service-cards"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
} from "@/components/seo/healthcare-schema"
import { Button } from "@/components/ui/button"
import { PRICING_DISPLAY } from "@/lib/constants"

/**
 * What replaced the old General Consult landing page.
 *
 * Background: General Consult was retired from the public service catalog
 * on 2026-05-20 because it served as a back-channel for services we have
 * explicitly gated (weight loss, women's health) and high-risk cases that
 * async telehealth should not handle. Google Ads never targeted this
 * route, so removal carries no acquisition cost.
 *
 * This page keeps the /consult URL alive so we don't lose the SEO surface
 * for "online doctor" queries, but it now routes the visitor to one of
 * the four structured services we actually accept.
 */

const overviewFaqs = [
  {
    question: "Why don't you offer a general consult anymore?",
    answer:
      "We're a focused telehealth service. Structured intake for each condition lets a doctor decide faster and avoids the back-and-forth of an open-ended consult. If your concern doesn't fit one of the services below, your GP is the right next step.",
  },
  {
    question: "What if my concern doesn't fit any of these?",
    answer:
      "See your regular GP. We don't currently offer general consultations, weight loss treatment, or women's health treatment. Sending you to the right person beats taking your money for something we can't help with.",
  },
  {
    question: "Will the doctor call me?",
    answer:
      "Our services are form-first. The doctor reviews your questionnaire and responds in writing with a decision, a prescription, or a referral. We only interrupt you if something clinically important is missing.",
  },
  {
    question: "Can I get a prescription online?",
    answer:
      "Yes, through the specific services above. Repeat Prescription for medication you already take. ED Assessment or Hair Loss Assessment for those conditions. Medical Certificate doesn't involve prescribing.",
  },
  {
    question: "How is this different from a GP visit?",
    answer:
      "You get an AHPRA-registered doctor without the waiting room, for the conditions we treat. The doctor can't physically examine you, so concerns that need an exam still need a GP in person.",
  },
  {
    question: "Is my information private?",
    answer:
      "Doctor-patient confidentiality applies fully. Health information is encrypted and never shared with employers, insurers, or third parties. This is a private service, so nothing appears on your Medicare statement.",
  },
  {
    question: "How much does it cost?",
    answer: `Medical certificates from ${PRICING_DISPLAY.MED_CERT}. Repeat prescriptions ${PRICING_DISPLAY.REPEAT_SCRIPT}. ED and hair loss assessments ${PRICING_DISPLAY.CONSULT}. Flat fee, no Medicare rebate, full refund if we can't help.`,
  },
  {
    question: "What about referrals or pathology requests?",
    answer:
      "Not offered as a standalone service yet. If a referral or test is clinically appropriate during one of our active services, the doctor will include it at no extra charge.",
  },
]

export const metadata: Metadata = {
  title: "Online Doctor Services | InstantMed",
  description:
    "See an Australian doctor online for medical certificates, repeat prescriptions, ED, or hair loss. Form-first review, no waiting room, AHPRA-registered.",
  openGraph: {
    title: "Online Doctor Services | InstantMed",
    description:
      "See an Australian doctor online for medical certificates, repeat prescriptions, ED, or hair loss. Form-first review, no waiting room.",
    type: "website",
    url: "https://instantmed.com.au/consult",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Doctor Services | InstantMed",
    description:
      "See an Australian doctor online for medical certificates, repeat prescriptions, ED, or hair loss. Form-first review, no waiting room.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/consult",
  },
}

export default function ConsultOverviewPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Online Doctor Services", url: "https://instantmed.com.au/consult" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Doctor Services"
        description="Australian doctors review structured forms for medical certificates, repeat prescriptions, ED, and hair loss."
        price="19.95"
      />
      <FAQSchema faqs={overviewFaqs} />
      <HealthArticleSchema
        title="Online Doctor Services in Australia"
        description="See what we treat online: medical certificates, repeat prescriptions, ED, and hair loss. Form-first review by AHPRA-registered doctors."
        url="/consult"
      />

      <section className="border-b border-border/40 bg-background pt-12 pb-8 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            See an Australian doctor online
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            We treat specific things, properly. Pick the service that fits and a doctor will respond in writing.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/request">
                Start a request
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#services">See all services</Link>
            </Button>
          </div>
        </div>
      </section>

      <div id="services">
        <ServiceCards />
      </div>

      <section className="border-t border-border/40 bg-muted/20 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Not finding your concern?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We don't currently take general consults, weight loss treatment, or women's health treatment. We're a focused service, and we'd rather route you to the right care than charge for something we can't help with.
                </p>
                <p className="mt-3 text-sm text-foreground">
                  For anything outside the services above, see your regular GP. If it's urgent, call your GP, after-hours service, or 000.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FaqCtaSection
        faqs={overviewFaqs}
        subtitle="Everything about our online doctor services."
      />
    </>
  )
}
