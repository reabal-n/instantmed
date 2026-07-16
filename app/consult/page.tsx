import { CheckCircle2, ShieldCheck, Timer } from "lucide-react"
import type { Metadata } from "next"

import { Hero } from "@/components/marketing/hero"
import { HeroDoctorReviewMockup } from "@/components/marketing/hero-doctor-review-mockup"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { ServiceDecisionBoard } from "@/components/marketing/service-decision-board"
import { CTABanner } from "@/components/sections/cta-banner"
import { FAQSection } from "@/components/sections/faq-section"
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
} from "@/components/seo/healthcare-schema"
import { Navbar } from "@/components/shared/navbar"
import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { getActiveServiceDecisions } from "@/lib/marketing/service-decisions"
import { GUARANTEE_LABEL } from "@/lib/marketing/voice"

/**
 * `/consult` is an informational selector for InstantMed's active structured
 * pathways. It is not a broad general-consult entry point. Every action below
 * resolves through the canonical service catalog and into a specific intake.
 */

const ACTIVE_SERVICES = getActiveServiceDecisions()
const CLINICAL_ACCESS_SCOPE = getApprovedClaim("clinical_access_scope")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const DOCTOR_REGISTRATION = getApprovedClaim("doctor_registration")

const overviewFaqs = [
  {
    question: "Will the doctor call me?",
    answer:
      `Prescribing and specialty pathways are form-first. A doctor may call or message if more information is clinically needed before deciding. ${CLINICAL_DECISION_MODEL}`,
  },
  {
    question: "How is this different from a GP visit?",
    answer:
      `${DOCTOR_REGISTRATION} InstantMed handles a focused set of requests without a physical examination. Broader concerns, ongoing care, testing, or anything that needs an examination should go to a regular GP or in-person service.`,
  },
  {
    question: "Is my information private?",
    answer:
      `${CLINICAL_ACCESS_SCOPE} Health records use Australian-hosted primary storage, and the privacy policy explains the service providers needed to deliver care.`,
  },
  {
    question: "What if my concern does not fit these services?",
    answer:
      "See your regular GP or another service that covers the concern. If symptoms are urgent or severe, call 000 or seek urgent in-person care.",
  },
]

export const metadata: Metadata = {
  title: { absolute: "Online Doctor Services in Australia | InstantMed" },
  description:
    `Choose from five focused online services: medical certificates, repeat prescriptions, ED, hair loss, and narrow women's-health assessments. Fees from ${PRICING_DISPLAY.MED_CERT}.`,
  openGraph: {
    title: "Online Doctor Services | InstantMed",
    description:
      "Five focused online pathways with structured intake, clear fees, and doctor-owned clinical governance.",
    type: "website",
    url: "https://instantmed.com.au/consult",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Doctor Services | InstantMed",
    description:
      "Choose a medical certificate, repeat prescription, ED, hair-loss, or narrow women's-health pathway.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/consult",
  },
}

export default function ConsultOverviewPage() {
  return (
    <MarketingPageShell>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Online Doctor Services", url: "https://instantmed.com.au/consult" },
        ]}
      />
      {ACTIVE_SERVICES.map((service) => (
        <MedicalServiceSchema
          key={service.id}
          name={service.title}
          description={service.suitability}
          price={service.priceFrom.toFixed(2)}
        />
      ))}
      <FAQSchema faqs={overviewFaqs} />
      <HealthArticleSchema
        title="Online Doctor Services in Australia"
        description="Five focused online pathways with structured intake and clear clinical boundaries."
        url="/consult"
      />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main aria-label="Online doctor services" className="min-w-0 flex-1 bg-background">
          <Hero
            className="pt-14"
            pill={null}
            title="Choose a focused online service"
            primaryCta={{ text: "Choose a service", href: "#services" }}
            secondaryCta={null}
            reassuranceRow={(
              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start sm:text-sm">
                <li className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  AHPRA-registered doctors
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Requests and review 24/7
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  {GUARANTEE_LABEL}
                </li>
              </ul>
            )}
            mockup={<HeroDoctorReviewMockup />}
            mockupClassName="hidden lg:block"
            trustRow={null}
            beforeCta={(
              <p className="mx-auto max-w-xl text-sm font-medium leading-6 text-foreground/75 lg:mx-0">
                Australia only. 18+. Fees from {PRICING_DISPLAY.MED_CERT} AUD. Medical certificates
                do not require Medicare; prescribing pathways require Medicare.
              </p>
            )}
          >
            <p className="mx-auto mb-8 max-w-2xl text-pretty text-base leading-7 text-muted-foreground lg:mx-0 sm:text-lg">
              InstantMed does not offer a broad general consult. Pick the structured pathway that matches what you need, or see your regular GP for anything outside this scope.
            </p>
          </Hero>

          <ServiceDecisionBoard id="services" className="py-12 sm:py-16" />

          <div className="bg-muted/20">
            <FAQSection
              items={overviewFaqs}
              title="Common questions"
              subtitle="Doctor contact, privacy, scope, and when to use your regular GP."
            />
          </div>

          <CTABanner
            title="Choose the service that fits."
            subtitle="Five focused pathways, each with its fee and clinical boundary shown before you start."
            ctaText="Choose a service"
            ctaHref="#services"
          />
        </main>

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
