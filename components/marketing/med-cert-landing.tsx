import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  MessageSquareText,
  RotateCcw,
  Search,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { IntakeResumeChip } from "@/components/marketing/intake-resume-chip"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { MedCertClientControls } from "@/components/marketing/med-cert-client-controls"
import { MedCertReasonLinks } from "@/components/marketing/med-cert-reason-links"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { RegulatoryPartners } from "@/components/marketing/regulatory-partners"
import { HowItWorksInline } from "@/components/marketing/sections/how-it-works-inline"
import { LimitationsSection } from "@/components/marketing/sections/limitations-section"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { EmployerLogoMarquee } from "@/components/shared/employer-logo-marquee"
import { Navbar } from "@/components/shared/navbar"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { Heading } from "@/components/ui/heading"
import { PRICING_DISPLAY } from "@/lib/constants"
import { MED_CERT_LANDING_FAQ } from "@/lib/data/med-cert-faq"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { buildMedCertRequestHref } from "@/lib/marketing/med-cert-selector"
import { GUARANTEE, MED_CERT_WEDGE } from "@/lib/marketing/voice"

// FAQ sits below the fold — lazy-load its client chunk to trim initial JS / TBT.
// ssr stays on (default) so the FAQ content stays server-rendered for SEO.
// Matches the ED / hair-loss / women's-health landing pattern.
const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((m) => m.FAQSection),
  { loading: () => <div className="min-h-[300px]" /> },
)

const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")

// =============================================================================
// DATA
// =============================================================================

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Fill a short health form",
    description: "Tell us about your symptoms and how long you have been unwell. Takes about 3 minutes.",
    time: "~3 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "The clinical pathway checks your request",
    description: CLINICAL_DECISION_MODEL,
    time: "Doctor-owned pathway",
  },
  {
    sticker: "certificate" as const,
    step: 3,
    title: "Certificate sent to you",
    description: "If approved, your medical certificate is emailed to you as a PDF with verification details.",
    time: "Digital delivery",
  },
]

const MED_CERT_START_HREF = buildMedCertRequestHref({ duration: "1" })
const MED_CERT_HERO_CTA_ID = "med-cert-hero-cta"

const MED_CERT_PILL = (
  <div className="inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-card border border-border/60 shadow-sm shadow-primary/[0.04]">
    <span className="text-muted-foreground">Routine short absences</span>
    <span className="text-border/70 hidden sm:inline" aria-hidden="true">&middot;</span>
    <span className="hidden sm:inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-500"
        style={{ animation: "pulse 3s ease-in-out infinite" }}
        aria-hidden="true"
      />
      Open now
    </span>
  </div>
)

const FEE_DETAILS = [
  {
    icon: CreditCard,
    title: "What your fee covers",
    body: "The doctor review, certificate decision, secure PDF delivery, and verification details. No subscription.",
  },
  {
    icon: MessageSquareText,
    title: "If the doctor needs more",
    body: "They can message you through the secure platform. In rare cases, a quick call may be needed.",
  },
  {
    icon: RotateCcw,
    title: "Payment and refund",
    body: REFUND_PAYMENT_PROCESS,
  },
] as const

const CERTIFICATE_FEES = [
  { label: "1 day", price: PRICING_DISPLAY.MED_CERT },
  { label: "2 days", price: PRICING_DISPLAY.MED_CERT_2DAY },
  { label: "3 days", price: PRICING_DISPLAY.MED_CERT_3DAY },
] as const

// =============================================================================
// UNIQUE SECTIONS
// =============================================================================

/**
 * Workplace evidence — explains verification without implying employer
 * endorsement, partnership, or guaranteed acceptance.
 *
 * Wraps the shared <ServiceClaimSection> primitive with med-cert-specific
 * footer links to /employers and /verify.
 */
function WorkplaceProofPanel() {
  return (
    <div data-track-section="employer">
      <ServiceClaimSection
        eyebrow="Workplace documentation"
        headline={
          <>
            Doctor-issued certificate with verification built in.
          </>
        }
        body="Issued by AHPRA-registered Australian doctors with standard sick-leave evidence details."
      >
        <div className="overflow-hidden rounded-2xl border border-border/45 bg-muted/25 dark:bg-white/[0.04]">
          <EmployerLogoMarquee className="border-0 bg-transparent py-5 sm:py-6" />
        </div>
        <div className="pt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/employers"
            data-med-cert-cta="employer_link"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            For Employers and HR
          </Link>
          <span className="h-3 w-px bg-border/60" aria-hidden="true" />
          <Link
            href="/verify"
            data-med-cert-cta="verify_link"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Verify a Certificate
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border/40 pt-4 text-xs text-muted-foreground dark:border-white/10">
          <span className="font-medium text-foreground">Source-backed references:</span>
          <Link
            href="/resources/medical-certificate-employer-policy"
            className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
          >
            Employer policy explainer
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            href="/resources/online-medical-certificate-verification"
            className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
          >
            Verification guide
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            href="/medical-certificate-online"
            className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
          >
            Online certificate guide
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <p className="border-t border-border/40 pt-4 text-center text-xs leading-relaxed text-muted-foreground dark:border-white/10">
          The Fair Work Act 2009 (Cth), s 107 allows employers to request evidence for personal leave. Fair Work guidance says the evidence should satisfy a reasonable person. Employer and institution policies may vary.
        </p>
      </ServiceClaimSection>
    </div>
  )
}

function FeeSuitabilityPanel() {
  return (
    <section aria-label="Medical certificate fee and suitability" className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-[1.75rem] border border-border/50 bg-white p-4 shadow-lg shadow-primary/[0.07] dark:border-white/15 dark:bg-card dark:shadow-none sm:p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
          <div className="rounded-2xl bg-muted/35 p-5 dark:bg-white/[0.04]">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Before payment
            </p>
            <Heading level="h2" className="mb-3 text-balance">
              Clear fee. Clear fallback.
            </Heading>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Choose the absence length in the form. The request fee, what it
              covers, and the fallback are clear before checkout.
            </p>
            <dl className="mt-5 divide-y divide-border/50 rounded-xl border border-border/50 bg-white px-4 dark:divide-white/10 dark:border-white/10 dark:bg-card">
              {CERTIFICATE_FEES.map((fee) => (
                <div key={fee.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{fee.label}</dt>
                  <dd className="font-semibold text-foreground">{fee.price}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {FEE_DETAILS.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-border/50 bg-white p-4 shadow-sm shadow-primary/[0.04] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] dark:border-white/10 dark:bg-card dark:shadow-none"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8 text-primary transition-transform duration-200 group-hover:scale-105">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MedCertHero() {
  return (
    <section className="relative overflow-x-clip pt-6 pb-12 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center lg:flex-row lg:items-start lg:gap-12 xl:gap-14">
          <div className="min-w-0 flex-1 text-center lg:text-left">
            <div className="hero-availability-enter mb-5 flex justify-center sm:mb-7 lg:justify-start">
              {MED_CERT_PILL}
            </div>

            <div
              className="hero-availability-enter mb-4 flex justify-center lg:justify-start"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-brand-coral" />
            </div>

            <Heading level="display" className="mb-5 sm:mb-7">
              Medical certificate. From your bed.
            </Heading>

            <div className="hero-subheadline-enter">
              <p className="mx-auto mb-6 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:mb-7 sm:text-base lg:mx-0 lg:text-lg">
                For suitable form-only requests: {MED_CERT_WEDGE} Tell us what kept you from work, study, or caring duties. If suitable, your certificate is delivered as a secure PDF. {GUARANTEE}
              </p>
            </div>

            <div className="hero-cta-enter mb-6 sm:mb-7">
              <ul aria-label="Medical certificate eligibility" className="mx-auto flex max-w-xl flex-wrap justify-center gap-x-3 gap-y-1 text-[13px] text-foreground lg:mx-0 lg:justify-start">
                <li>Australia only</li>
                <li aria-hidden="true" className="text-border">&middot;</li>
                <li>Ages 18+</li>
                <li aria-hidden="true" className="text-border">&middot;</li>
                <li>No Medicare needed</li>
              </ul>
              <p className="mx-auto mt-3 inline-flex max-w-xl items-start gap-2 text-left text-[13px] leading-snug text-foreground sm:items-center sm:text-center lg:mx-0 lg:text-left">
                <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-success sm:mt-0" aria-hidden="true" />
                <span>
                  Issued by AHPRA-registered Australian doctors.
                  <span className="text-muted-foreground"> Employer and institution policies may vary.</span>
                </span>
              </p>
            </div>

            <div
              id={MED_CERT_HERO_CTA_ID}
              className="hero-cta-enter mb-6 flex flex-col justify-center gap-3 sm:mb-7 sm:flex-row lg:justify-start"
            >
              <Link
                href={MED_CERT_START_HREF}
                data-med-cert-cta="hero"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 dark:focus-visible:ring-dawn-500/40"
              >
                Get your certificate · {PRICING_DISPLAY.FROM_MED_CERT}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="hero-trust-enter flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pt-1 lg:justify-start">
              <GoogleAdsCert size="sm" />
              <LegitScriptSeal size="sm" />
            </div>
          </div>

          <div className="relative mt-12 shrink-0 self-center max-[240px]:hidden lg:mt-0">
            <MedCertHeroMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

function MedCertFinalCta() {
  return (
    <section className="px-4 py-8 sm:py-10 lg:py-16">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/50 bg-white p-6 text-center shadow-lg shadow-primary/[0.06] dark:bg-card sm:p-8 lg:p-16">
        <Heading level="h1" as="h2">
          Back to bed without a waiting room.
        </Heading>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground">
          Start with a short health form. If the pathway can help, your certificate is delivered as a secure PDF.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={MED_CERT_START_HREF}
            data-med-cert-cta="final_cta"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 dark:focus-visible:ring-dawn-500/40"
          >
            Get your certificate · {PRICING_DISPLAY.FROM_MED_CERT}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          {GUARANTEE}
        </p>
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function MedCertLanding() {
  return (
    <MarketingPageShell>
      <div className="min-h-screen overflow-x-hidden">
        <MedCertClientControls stickyTargetId={MED_CERT_HERO_CTA_ID} />
        <ReturningPatientBanner className="mx-4 mt-2" />
        <Navbar variant="marketing" />

        <main className="relative">
          <IntakeResumeChip className="mx-4 mt-3 max-w-5xl sm:mx-auto" />
          <MedCertHero />
          <LimitationsSection />
          <WorkplaceProofPanel />

          <div data-track-section="how_it_works">
            <HowItWorksInline
              steps={HOW_IT_WORKS_STEPS}
              ctaHref={MED_CERT_START_HREF}
              ctaText={`Get your certificate · ${PRICING_DISPLAY.FROM_MED_CERT}`}
              ctaDataAttributes={{ "data-med-cert-cta": "how_it_works" }}
              heading="How it works"
              subheading="Fill a short form, follow the doctor-owned certificate pathway, and receive a secure PDF if the request is suitable."
            />
          </div>

          <FeeSuitabilityPanel />

          <div data-track-section="faq">
            <FAQSection
              pill="FAQ"
              title="Before you start"
              subtitle="A few practical details that are not covered above."
              items={MED_CERT_LANDING_FAQ}
              viewAllHref="/faq"
            />
          </div>

          <div data-track-section="final_cta">
            <MedCertFinalCta />
          </div>

          <RegulatoryPartners />

          <MedCertReasonLinks />
        </main>

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
