import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  MessageSquareText,
  RotateCcw,
  Search,
  Star,
} from "lucide-react"
import Link from "next/link"

import { CitationFacts } from "@/components/marketing/citation-facts"
import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { IntakeResumeChip } from "@/components/marketing/intake-resume-chip"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { MedCertClientControls } from "@/components/marketing/med-cert-client-controls"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { RegulatoryPartners } from "@/components/marketing/regulatory-partners"
import { CommercialIntentLinksSection } from "@/components/marketing/sections/commercial-intent-links-section"
import { HowItWorksInline } from "@/components/marketing/sections/how-it-works-inline"
import { LimitationsSection } from "@/components/marketing/sections/limitations-section"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { TimeComparisonViz } from "@/components/marketing/sections/time-comparison-viz"
import { FAQSection } from "@/components/sections/faq-section"
import { EmployerLogoMarquee } from "@/components/shared/employer-logo-marquee"
import { Navbar } from "@/components/shared/navbar"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { Heading } from "@/components/ui/heading"
import { PRICING } from "@/lib/constants"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"
import { buildMedCertRequestHref } from "@/lib/marketing/med-cert-selector"
import { GUARANTEE, MED_CERT_WEDGE } from "@/lib/marketing/voice"
import { commercialCertificateLinks, commercialLocationLinks } from "@/lib/seo/commercial-links"
import { getPatientCount, SOCIAL_PROOF } from "@/lib/social-proof"

// =============================================================================
// DATA
// =============================================================================

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Fill a short health form",
    description: "Tell us about your symptoms and how long you have been unwell. Takes about 2 minutes.",
    time: "~2 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A real doctor reviews it",
    description: "An AHPRA-registered doctor reviews your assessment and decides whether a certificate is clinically appropriate.",
    time: "Doctor review",
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
    <span
      className="inline-flex items-center gap-0.5 text-amber-400"
      role="img"
      aria-label="Google star rating"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="w-3 h-3 fill-current" aria-hidden="true" />
      ))}
    </span>
    <span className="text-border/70" aria-hidden="true">&middot;</span>
    <span className="text-muted-foreground">No Medicare needed</span>
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
    title: "If online review is not suitable",
    body: "We refund the request and explain why, so you are not paying for a dead end.",
  },
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
        </div>
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
              Straightforward fees, no surprises. Here is exactly what your
              fee covers, and what happens if a doctor cannot help.
            </p>
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

/** Data viz: certificate turnaround vs GP visit. Thin wrapper around the
 *  shared TimeComparisonViz primitive — same pattern is used on prescriptions
 *  with different copy + numbers. */
function CertComparisonViz() {
  return (
    <TimeComparisonViz
      // Pill clarifies the 20-min figure is total turnaround end-to-end
      // (form → doctor review → inbox), not just one stage of it
      // (Tier 1 review 2026-05-26 /medical-certificate #6).
      pill="Total turnaround"
      heading="Back on the couch in minutes. Not hours."
      ours={{ label: "InstantMed", value: `~${SOCIAL_PROOF.certTurnaroundMinutes}`, unit: "min" }}
      theirs={{ label: "GP clinic", value: "2", valueSuffix: "+", unit: "hrs" }}
      ourSteps={["2 min form", "Doctor reviews your request", "Certificate in your inbox"]}
      theirSteps={["Call to book appointment", "Travel to clinic", "Waiting room and consult"]}
      primaryFillPercent={18}
    />
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
                {MED_CERT_WEDGE} AHPRA-registered Australian doctors review every request. PDF in your inbox, ready to forward. {GUARANTEE}
              </p>
            </div>

            <div className="hero-cta-enter mb-6 sm:mb-7">
              <p className="mx-auto inline-flex max-w-xl items-start gap-2 text-left text-[13px] leading-snug text-foreground sm:items-center sm:text-center lg:mx-0 lg:text-left">
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
                Get your certificate · ${PRICING.MED_CERT.toFixed(2)}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="hero-trust-enter flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pt-1 lg:justify-start">
              <GoogleAdsCert size="sm" />
              <LegitScriptSeal size="sm" />
            </div>
          </div>

          <div className="relative mt-12 shrink-0 self-center lg:mt-0">
            <MedCertHeroMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

function MedCertFinalCta() {
  const patientCount = getPatientCount()

  return (
    <section className="px-4 py-8 sm:py-10 lg:py-16">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/50 bg-white p-6 text-center shadow-lg shadow-primary/[0.06] dark:bg-card sm:p-8 lg:p-16">
        <Heading level="h1" as="h2">
          Back to bed in two minutes.
        </Heading>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground">
          Fill the form, a real doctor reviews it, and your certificate lands in your inbox. Trusted by {patientCount.toLocaleString()}+ Australians.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={MED_CERT_START_HREF}
            data-med-cert-cta="final_cta"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 dark:focus-visible:ring-dawn-500/40"
          >
            Get your certificate · ${PRICING.MED_CERT.toFixed(2)}
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
          <CitationFacts variant="muted" />
          <WorkplaceProofPanel />

          {/* Day-selector was retired 2026-05-26 (Tier 1 review #5). The
              pre-form 1/2/3-day chooser forced a decision before the form
              and duplicated work the intake wizard already does. The
              wizard now defaults to 1 day and lets users adjust inline. */}

          <CertComparisonViz />

          <CommercialIntentLinksSection
            title="Common certificate searches"
            body="Useful routes for patients comparing same-day, work, carer, student, and local certificate options before starting a request."
            links={commercialCertificateLinks.slice(0, 6)}
            compactLinks={[
              ...commercialCertificateLinks.slice(6),
              ...commercialLocationLinks,
            ]}
            // Quiet inline links instead of a wall of pills. The pill
            // row was reading as SEO directory bait mid-funnel (Tier 1
            // review 2026-05-25 /medical-certificate #4).
            compactStyle="inline"
            className="bg-muted/30 dark:bg-white/[0.02]"
          />

          <div data-track-section="how_it_works">
            <HowItWorksInline
              steps={HOW_IT_WORKS_STEPS}
              ctaHref={MED_CERT_START_HREF}
              ctaText={`Get your certificate · $${PRICING.MED_CERT.toFixed(2)}`}
              ctaDataAttributes={{ "data-med-cert-cta": "how_it_works" }}
              heading="How it works"
              subheading="No appointment, no waiting room. Fill a form, a doctor reviews it, and your certificate lands in your inbox."
            />
          </div>

          <FeeSuitabilityPanel />
          <LimitationsSection />

          <div data-track-section="faq">
            <FAQSection
              pill="FAQ"
              title="Before you start"
              subtitle="Everything you need to know about getting your certificate."
              items={MED_CERT_FAQ}
              initialCount={4}
              viewAllHref="/faq"
            />
          </div>

          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              The Fair Work Act 2009 (Cth), s 107 allows employers to request evidence for personal leave. Fair Work guidance says the evidence should satisfy a reasonable person. All InstantMed certificates are issued by AHPRA-registered practitioners.
            </p>
          </div>

          <div data-track-section="final_cta">
            <MedCertFinalCta />
          </div>

          <RegulatoryPartners />
        </main>

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
