import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { AccordionSection } from "@/components/sections/accordion-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { ProcessSteps } from "@/components/sections/process-steps"
import type { FeatureItem } from "@/components/sections/types"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared/navbar"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE, ICONIC_HOOK } from "@/lib/marketing/voice"

// =============================================================================
// METADATA
// =============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"
const AVAILABILITY_24_7 = getApprovedClaim("availability_24_7")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")
const DOCTOR_REGISTRATION = getApprovedClaim("doctor_registration")
const REFUND_PAYMENT_PROCESS = getApprovedClaim("refund_payment_process")

export const metadata: Metadata = {
  title: { absolute: "Why InstantMed can be faster than waiting for a GP" },
  description:
    "How focused online requests remove booking and waiting-room friction, with GP-wait sources and clear clinical limits.",
  alternates: { canonical: "/why-instant" },
  openGraph: {
    title: "Why InstantMed can be faster than waiting for a GP",
    description: "The access comparison behind the brand line, with sources and clinical limits.",
    url: `${SITE_URL}/why-instant`,
    siteName: "InstantMed",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why InstantMed is faster than your GP",
    description: "The math behind the brand line.",
  },
}

export const revalidate = 86400

// =============================================================================
// FAQ DATA
// =============================================================================

const whyInstantFaqs = [
  {
    question: "Faster than my GP, really?",
    answer:
      "Yes, but specifically: faster than the wait to see your GP. Most Australians wait several days for a non-urgent GP appointment (RACGP Health of the Nation 2024). InstantMed lets patients submit routine requests online without waiting for a clinic appointment. We're comparing access friction for what we offer (forms reviewed by a doctor) against the wait to book a GP appointment, not clinical depth or scope.",
  },
  {
    question: "Are you cutting corners to be faster?",
    answer:
      "No. The form captures the information needed for the relevant clinical pathway. AHPRA-registered doctors make prescribing decisions. Eligible low-risk medical certificates may follow a logged doctor-owned protocol and are individually reviewed afterward. The speed comes from removing booking and waiting-room friction, not accountability.",
  },
  {
    question: "Will my GP appointment ever be replaced by InstantMed?",
    answer:
      `No, and that is not the goal. InstantMed handles a focused set of form-first requests: medical certificates, repeat prescriptions, and selected ED, hair-loss, and women's-health assessments. For anything that needs an in-person assessment, the doctor will tell you so. ${GUARANTEE}`,
  },
  {
    question: "What if my request is more complicated than your form covers?",
    answer:
      `Our doctor will message you for more information, or recommend you see someone in person. ${GUARANTEE}`,
  },
  {
    question: "What sources are these GP wait times from?",
    answer:
      "RACGP Health of the Nation 2024 (annual report on Australian general practice), ABS Patient Experience Survey 2022-23 (national household survey), and the Cleanbill 2024 Blue Report (bulk-billing availability and new-patient wait times). Links in the sources section above the FAQ.",
  },
]

// =============================================================================
// CONTENT
// =============================================================================

const honestFastFeatures: FeatureItem[] = [
  {
    icon: <StickerIcon name="user-check" size={48} />,
    title: "Doctor-owned clinical process",
    description: CLINICAL_DECISION_MODEL,
  },
  {
    icon: <StickerIcon name="clock" size={48} />,
    title: "No fixed turnaround promise",
    description: AVAILABILITY_24_7,
  },
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Registered and accountable",
    description:
      `${DOCTOR_REGISTRATION} Speed comes from removing booking friction, not clinical boundaries.`,
  },
  {
    icon: <StickerIcon name="speech-bubble" size={48} />,
    title: "Honest about limits",
    description:
      "Some things still need an in-person doctor. When that's the case, our doctor tells you and refunds your fee. We do not stretch the form to cover what it shouldn't.",
  },
]

const timingSteps = [
  {
    number: 1,
    title: "You complete a structured form",
    description:
      "About 3 minutes for most patients. The form is built to capture what the clinical pathway needs, in your own words and at your own pace.",
  },
  {
    number: 2,
    title: "Your request follows its clinical pathway",
    description: `${CLINICAL_REVIEW_SEQUENCE} ${AVAILABILITY_24_7}`,
  },
  {
    number: 3,
    title: "Outcome lands in your inbox",
    description: `Issued, declined, or a follow-up question. ${REFUND_PAYMENT_PROCESS}`,
  },
]

export default function WhyInstantPage() {
  return (
    <>
      <FAQSchema faqs={whyInstantFaqs} />
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1">
          <CenteredHero
            pill="The access comparison"
            title="Faster than your GP."
            highlightWords={["GP."]}
            subtitle="We mean faster than waiting for a non-urgent appointment, not faster clinical care. Here are the sources, comparison, and limits."
          />

          {/* Comparison: GP wait vs InstantMed delivery */}
          <section className="px-4 pb-12 sm:pb-20">
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-md shadow-primary/[0.06]">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Access path compared with booking wait
                </p>
                <ComparisonBar
                  us={{
                    label: "InstantMed: form to outcome",
                    value: "No booking",
                    subtext: AVAILABILITY_24_7,
                  }}
                  them={{
                    label: "Wait for a non-urgent GP appointment",
                    value: "3+ days",
                    subtext: "More than half of patients wait three or more days. Capital-city averages run two to three weeks.",
                  }}
                  ratio={0.05}
                />
                <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
                  Sources:{" "}
                  <a
                    href="https://www.racgp.org.au/general-practice-health-of-the-nation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    RACGP Health of the Nation 2024
                  </a>
                  ,{" "}
                  <a
                    href="https://www.abs.gov.au/statistics/health/health-services/patient-experiences/latest-release"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    ABS Patient Experience Survey 2022-23
                  </a>
                  ,{" "}
                  <a
                    href="https://cleanbill.com.au"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Cleanbill 2024 Blue Report
                  </a>
                  . These sources describe GP access waits; InstantMed does not use them to promise a review time.
                </p>
              </div>
            </div>
          </section>

          {/* The honest framing */}
          <ServiceClaimSection
            eyebrow="What 'faster' means here"
            headline={
              <>
                Faster than the <span className="text-primary">wait</span>. Clear about the limits.
              </>
            }
            body="We're not a faster doctor. We're a faster path into a focused, doctor-owned service. The speed comes from removing booking friction while keeping remote-assessment limits visible."
          />

          <ProcessSteps
            title="How the timing actually works"
            subtitle="Three steps. The structured form captures relevant details before the request follows its service-specific pathway."
            steps={timingSteps}
          />

          <FeatureGrid
            title="What we won't pretend"
            subtitle="If 'faster than your GP' is going to be the brand line, the caveats need to be just as visible."
            features={honestFastFeatures}
            columns={2}
          />

          <AccordionSection
            title="Reasonable questions about the brand line"
            subtitle="Straight answers on the comparison, the sources, and the limits."
            groups={[{ items: whyInstantFaqs }]}
          />

          <CTABanner
            title="Ready when you are."
            subtitle={`${ICONIC_HOOK} ${GUARANTEE}`}
            ctaText="Get started"
            ctaHref="/request"
            secondaryText="See our guarantee"
            secondaryHref="/guarantee"
          />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
