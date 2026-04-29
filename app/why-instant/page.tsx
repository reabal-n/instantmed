import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { MarketingFooter } from "@/components/marketing"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { ComparisonBar } from "@/components/marketing/shared"
import type { FeatureItem } from "@/components/sections"
import { AccordionSection, CTABanner, FeatureGrid, ProcessSteps } from "@/components/sections"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// =============================================================================
// METADATA
// =============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"

export const metadata: Metadata = {
  title: { absolute: "Why InstantMed is faster than your GP | The math behind the brand line" },
  description:
    "Faster than your GP. Substantiation page: median GP wait time vs InstantMed median delivery time, with sources.",
  alternates: { canonical: "/why-instant" },
  openGraph: {
    title: "Why InstantMed is faster than your GP",
    description: "The math behind the brand line. Sources: RACGP Health of the Nation 2024, ABS Patient Experience Survey 2022-23.",
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
      "Yes, but specifically: faster than the wait to see your GP. Most Australians wait several days for a non-urgent GP appointment (RACGP Health of the Nation 2024). InstantMed reviews most medical certificate requests in well under an hour, 24/7. We're comparing wait times for what we offer (forms reviewed by a doctor) against the wait to book a GP appointment, not clinical depth or scope.",
  },
  {
    question: "Are you cutting corners to be faster?",
    answer:
      "No. The form is structured to capture the same clinical information a doctor would gather in a 14-minute appointment. Every request is reviewed by an AHPRA-registered doctor, not an algorithm. The speed comes from removing the booking, the waiting room, and the small talk, not from removing clinical review.",
  },
  {
    question: "Will my GP appointment ever be replaced by InstantMed?",
    answer:
      "No, and that is not the goal. InstantMed handles a specific set of common requests that do not require a physical exam (medical certificates, repeat medication, straightforward consults). For anything that needs an in-person assessment, our doctor will tell you so and you pay nothing.",
  },
  {
    question: "What if my request is more complicated than your form covers?",
    answer:
      "Our doctor will message you for more information, or recommend you see someone in person. Either is on us. The full refund applies the moment the doctor records the decision.",
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
    title: "Real doctor, every request",
    description:
      "Every request is reviewed by an AHPRA-registered Australian GP. No algorithmic auto-approval, no AI-only decisions.",
  },
  {
    icon: <StickerIcon name="clock" size={48} />,
    title: "Median, not best-case",
    description:
      `Our published delivery time (~${SOCIAL_PROOF.averageResponseMinutes} min) is the median across recent requests, not a marketing minimum. Half are faster, half are slower.`,
  },
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Same standard of care",
    description:
      "AHPRA registration, evidence-based protocols, full clinical accountability. Speed comes from the absence of booking friction, not the absence of rigour.",
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
      "Three to five minutes for most patients. The form is built to capture what a doctor needs to make a clinical decision, in your own words and at your own pace.",
  },
  {
    number: 2,
    title: "An AHPRA-registered doctor reviews it",
    description:
      "Med certs: 24/7. Prescriptions and consults: 8am to 10pm AEST, 7 days. Median review time: well under an hour.",
  },
  {
    number: 3,
    title: "Outcome lands in your inbox",
    description:
      "Issued, declined, or follow-up question. If declined, the refund fires automatically the same instant the doctor records the decision.",
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
            pill="The math behind the brand line"
            title="Faster than your GP."
            highlightWords={["GP."]}
            subtitle="We say it because it's true and substantiable. Below, the sources, the comparison, and the honest caveats. No fine print."
          />

          {/* Comparison: GP wait vs InstantMed delivery */}
          <section className="px-4 pb-12 sm:pb-20">
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-md shadow-primary/[0.06]">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Median wait, like for like
                </p>
                <ComparisonBar
                  us={{
                    label: "InstantMed: form to outcome",
                    value: `~${SOCIAL_PROOF.averageResponseMinutes} min`,
                    subtext: "Median across recent medical certificate requests, 24/7.",
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
                  . InstantMed median sourced from internal request telemetry, recalculated quarterly.
                </p>
              </div>
            </div>
          </section>

          {/* The honest framing */}
          <ServiceClaimSection
            eyebrow="What 'faster' means here"
            headline={
              <>
                Faster than the <span className="text-primary">wait</span>. Same standard of care.
              </>
            }
            body="We're not a faster doctor. We're a faster path to the same kind of doctor. AHPRA-registered, evidence-based, fully accountable. The speed comes from removing booking friction, not from cutting clinical corners."
          />

          <ProcessSteps
            title="How the timing actually works"
            subtitle="Three steps. The form does the heavy lifting so the doctor can review it efficiently."
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
            subtitle="Straight answers on the comparison, the methodology, and the limits."
            groups={[{ items: whyInstantFaqs }]}
          />

          <CTABanner
            title="Ready when you are."
            subtitle="Three minutes. Done. Full refund if our doctor can't help."
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
