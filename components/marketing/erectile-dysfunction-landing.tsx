"use client"

import dynamic from "next/dynamic"

// Hero is above-fold - not lazy loaded
import { EDHeroSection } from "@/components/marketing/heroes/ed-hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import {
  type LandingPageConfig,
  LandingPageShell,
  ReferralStrip,
} from "@/components/marketing/shared"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { ContentHubLinks } from "@/components/seo"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { ED_FAQ } from "@/lib/data/ed-faq"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

// Below-fold lazy loads - keep initial bundle small
const TestimonialsSection = dynamic(
  () => import("@/components/marketing/sections/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const HowItWorksSection = dynamic(
  () => import("@/components/marketing/sections/how-it-works-section").then((m) => m.HowItWorksSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
const EDGuideSection = dynamic(
  () => import("@/components/marketing/sections/ed-guide-section").then((m) => m.EDGuideSection),
  { loading: () => <div className="min-h-[600px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const FaqCtaSection = dynamic(
  () => import("@/components/marketing/sections/faq-cta-section").then((m) => m.FaqCtaSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const FinalCtaSection = dynamic(
  () => import("@/components/marketing/sections/final-cta-section").then((m) => m.FinalCtaSection),
  { loading: () => <div className="min-h-[300px]" /> },
)
const EdOutcomesSection = dynamic(
  () => import("@/components/marketing/sections/ed-outcomes-section").then((m) => m.EdOutcomesSection),
  { loading: () => <div className="min-h-[150px]" /> },
)
const EdHookQuiz = dynamic(
  () => import("@/components/marketing/sections/ed-hook-quiz").then((m) => m.EdHookQuiz),
  { loading: () => <div className="min-h-[500px]" />, ssr: false },
)
const EdPrevalenceCalculator = dynamic(
  () => import("@/components/marketing/sections/ed-prevalence-calculator").then((m) => m.EdPrevalenceCalculator),
  { loading: () => <div className="min-h-[400px]" /> },
)
const EdMechanismExplainer = dynamic(
  () => import("@/components/marketing/sections/ed-mechanism-explainer").then((m) => m.EdMechanismExplainer),
  { loading: () => <div className="min-h-[500px]" /> },
)
const PricingSection = dynamic(
  () => import("@/components/marketing/sections/pricing-section").then((m) => m.PricingSection),
  { loading: () => <div className="min-h-[400px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const CompetitorLinksSection = dynamic(
  () => import("@/components/marketing/sections/competitor-links-section").then((m) => m.CompetitorLinksSection),
  { loading: () => <div className="min-h-[200px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const ED_HOW_IT_WORKS_STEPS = [
  {
    number: "1",
    title: "Tell us what\u2019s going on",
    description: "Quick health form, takes about 2 minutes. No account needed to start.",
    badge: "~2 min",
  },
  {
    number: "2",
    title: "A real GP reviews it",
    description: "AHPRA-registered doctor reviews your assessment. Same standards as in-person.",
    badge: "~1 hour",
  },
  {
    number: "3",
    title: "eScript sent to your phone",
    description: "Your prescription is sent via SMS. Collect your treatment from any Australian pharmacy.",
    badge: "Same day",
  },
]

const PRICING_FEATURES = [
  "AHPRA-registered Australian doctor reviews your form",
  "eScript sent to your phone via SMS",
  "Collect from any Australian pharmacy",
  "Discreet packaging - nothing on the outside",
  "Full refund if we can't help",
]

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "ed",
  analyticsId: "ed",
  sticky: {
    ctaText: `Start assessment - $${PRICING.MENS_HEALTH.toFixed(2)}`,
    ctaHref: "/request?service=consult&subtype=ed",
    mobileSummary: "2-min form \u00b7 Doctor-reviewed \u00b7 No call needed",
    desktopLabel: "ED Treatment \u00b7 Discreet & doctor-reviewed",
    priceLabel: `From $${PRICING.MENS_HEALTH.toFixed(2)}`,
    desktopCtaText: "Start assessment",
    responseTime: `Avg response: ${SOCIAL_PROOF_DISPLAY.responseTime}`,
  },
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function ErectileDysfunctionLanding() {
  // Testimonials data - service-specific with fallback
  const serviceTestimonials = getTestimonialsByService("consultation")
  const columnsData = serviceTestimonials.slice(0, 9).map((t) => ({
    text: t.text,
    image:
      t.image ||
      `https://api.dicebear.com/7.x/notionists/svg?seed=${t.name.replace(/\s/g, "")}`,
    name: `${t.name}${t.age ? `, ${t.age}` : ""}`,
    role: `${t.location}${t.role ? ` \u00b7 ${t.role}` : ""}`,
  }))
  const testimonialsForColumns =
    columnsData.length >= 6
      ? columnsData
      : getTestimonialsForColumns().slice(0, 9)

  const pricingColors = {
    light: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    button: "bg-primary hover:bg-primary/90",
  }

  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="consult" />}
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          {/* 1. Hero */}
          <EDHeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

          {/* 2. Single trust strip - wait time + doctors online indicator */}
          <LiveWaitTime variant="strip" services={["consult-ed"]} />

          {/* 3. Prevalence calculator - normalises shame before engagement */}
          <EdPrevalenceCalculator />

          {/* 4. Hook quiz - engagement after normalisation */}
          <section id="ed-quiz" className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8 scroll-mt-20">
            <EdHookQuiz />
          </section>

          {/* 5. How It Works */}
          <HowItWorksSection
            onCTAClick={handleHowItWorksCTA}
            steps={ED_HOW_IT_WORKS_STEPS}
            ctaText={`Start assessment - $${PRICING.MENS_HEALTH.toFixed(2)}`}
            ctaHref="/request?service=consult&subtype=ed"
          />

          {/* 5.5 Response time comparison - answers "why online?" right after seeing how it works */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="mx-auto max-w-xl">
              <div className="text-center mb-6">
                <SectionPill>Why go online?</SectionPill>
              </div>
              <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                <ComparisonBar
                  us={{
                    label: "InstantMed",
                    value: "~1 hour",
                    subtext: "Discreet online assessment, eScript to your phone",
                  }}
                  them={{
                    label: "GP clinic visit",
                    value: "2+ hours",
                    subtext: "Book, travel, wait, face-to-face consult",
                  }}
                  ratio={0.3}
                />
              </div>
            </div>
          </section>

          {/* 6. Mechanism explainer - completes the "how" narrative */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <EdMechanismExplainer />
          </div>

          {/* 7. Guide - accordion-collapsed, all content rendered for SEO */}
          <EDGuideSection />

          {/* 8. Outcomes - what treatment is/isn't, contraindications visible */}
          <EdOutcomesSection />

          {/* 9. Doctor profile - trust signal */}
          <DoctorProfileSection />

          {/* 10. Pricing */}
          <PricingSection
            title="One flat fee. No hidden costs."
            subtitle="You only pay if the doctor approves treatment."
            price={PRICING.MENS_HEALTH}
            features={PRICING_FEATURES}
            ctaText={
              isDisabled
                ? "Contact us"
                : `Start assessment - $${PRICING.MENS_HEALTH.toFixed(2)}`
            }
            ctaHref={isDisabled ? "/contact" : "/request?service=consult&subtype=ed"}
            colors={pricingColors}
          />

          {/* 11. Testimonials */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who've used our consultation service"
          />
          </div>

          {/* Competitor comparisons - SEO internal links */}
          <CompetitorLinksSection slugs={["instantmed-vs-hub-health", "instantmed-vs-doctors-on-demand", "instantmed-vs-qoctor"]} />

          {/* Regulatory Partners - Medicare included */}
          <RegulatoryPartners className="py-12" />

          {/* 13. FAQ */}
          <FaqCtaSection
            onFAQOpen={handleFAQOpen}
            faqs={ED_FAQ}
            subtitle="Everything you need to know about ED treatment online."
          />

          {/* Referral awareness strip */}
          <ReferralStrip contextText="dealing with ED" />

          {/* 15. Final CTA */}
          <FinalCtaSection
            onCTAClick={handleFinalCTA}
            title="Discreet ED treatment, reviewed by a real doctor."
            subtitle="Trusted by 3,000+ Australians for online healthcare. Fill a short form, a doctor reviews it, and your treatment is sent straight to your phone."
            ctaText={`Start assessment - $${PRICING.MENS_HEALTH.toFixed(2)}`}
            ctaHref="/request?service=consult&subtype=ed"
            price={PRICING.MENS_HEALTH}
          />
        </>
      )}
    </LandingPageShell>
  )
}
