"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  ClipboardList,
  Clock,
  FileCheck,
  ShieldCheck,
  Star,
  Stethoscope,
  Users,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

// Hero is above-fold - not lazy loaded
import { GeneralConsultHeroSection } from "@/components/marketing/heroes/general-consult-hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import {
  type LandingPageConfig,
  LandingPageShell,
  RecentActivityTicker,
  ReferralStrip,
  RelatedArticles,
  type SocialProofStat,
  SocialProofStrip,
} from "@/components/marketing/shared"
import { ComparisonBar } from "@/components/marketing/shared/data-viz"
import { ContentHubLinks } from "@/components/seo"
import { Button } from "@/components/ui/button"
import { FAQList } from "@/components/ui/faq-list"
import { useReducedMotion } from "@/components/ui/motion"
import { SectionPill } from "@/components/ui/section-pill"
import { CONTACT_EMAIL,PRICING } from "@/lib/constants"
import { CONSULT_FAQ } from "@/lib/data/consult-faq"
import {
  getTestimonialsByService,
  getTestimonialsForColumns,
} from "@/lib/data/testimonials"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

// Below-fold lazy loads
const TestimonialsSection = dynamic(
  () => import("@/components/marketing/sections/testimonials-section").then((m) => m.TestimonialsSection),
  { loading: () => <div className="min-h-[500px]" /> },
)
const ExpectCallStrip = dynamic(
  () => import("@/components/marketing/sections/expect-call-strip").then((m) => m.ExpectCallStrip),
  { loading: () => <div className="min-h-[60px]" /> },
)
const CommonConcernsSection = dynamic(
  () => import("@/components/marketing/sections/common-concerns-section").then((m) => m.CommonConcernsSection),
  { loading: () => <div className="min-h-[350px]" /> },
)
const SpecialisedConsultsSection = dynamic(
  () => import("@/components/marketing/sections/specialised-consults-section").then((m) => m.SpecialisedConsultsSection),
  { loading: () => <div className="min-h-[350px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const ConsultLimitationsSection = dynamic(
  () => import("@/components/marketing/sections/consult-limitations-section").then((m) => m.ConsultLimitationsSection),
  { loading: () => <div className="min-h-[150px]" /> },
)
const FinalCtaSection = dynamic(
  () => import("@/components/marketing/sections/final-cta-section").then((m) => m.FinalCtaSection),
  { loading: () => <div className="min-h-[300px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const PricingSection = dynamic(
  () => import("@/components/marketing/sections/pricing-section").then((m) => m.PricingSection),
  { loading: () => <div className="min-h-[400px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const PRICING_FEATURES = [
  "Full clinical assessment by an AHPRA-registered GP",
  "Phone or video consultation",
  "Medication if clinically appropriate",
  "Referral letters if needed",
  "Follow-up messaging with your doctor",
  "Written summary of your consultation",
]

const SOCIAL_PROOF_STATS: SocialProofStat[] = [
  { icon: Clock, value: 2, suffix: " hrs", label: "avg response", color: "text-primary" },
  { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: "/5", label: "patient rating", color: "text-amber-500", decimals: 1 },
  { icon: Users, value: 100, suffix: "%", label: "AHPRA verified", color: "text-success" },
  { icon: ShieldCheck, value: 100, suffix: "%", label: "refund guarantee", color: "text-success" },
]

const RECENT_ACTIVITY_ENTRIES = [
  { name: "Chris", city: "Newcastle", minutesAgo: 22 },
  { name: "Jenny", city: "Brisbane", minutesAgo: 38 },
  { name: "Mark", city: "Melbourne", minutesAgo: 14 },
  { name: "Emma", city: "Sydney", minutesAgo: 45 },
  { name: "Michael", city: "Perth", minutesAgo: 9 },
  { name: "Sophie", city: "Canberra", minutesAgo: 31 },
  { name: "James", city: "Adelaide", minutesAgo: 18 },
  { name: "Lisa", city: "Hobart", minutesAgo: 52 },
]

const HOW_IT_WORKS_STEPS = [
  {
    icon: ClipboardList,
    title: "Describe your concern",
    description: "Answer a short questionnaire about your symptoms and health history. Takes 3\u20135 minutes.",
    time: "3\u20135 min",
  },
  {
    icon: Stethoscope,
    title: "Doctor assessment",
    description: "An AHPRA-registered GP reviews your information and calls you to discuss your concern.",
    time: "Within 2 hours",
  },
  {
    icon: FileCheck,
    title: "Treatment plan",
    description: "Receive your prescription, referral, or medical advice - all digitally, same day.",
    time: "Same day",
  },
]

const RELATED_ARTICLES_DATA = [
  { title: "When to See a Doctor Online vs In Person", href: "/blog/online-vs-in-person-doctor" },
  { title: "What to Expect from a Telehealth Consultation", href: "/blog/telehealth-consultation-guide" },
  { title: "Getting Referrals Through Telehealth", href: "/blog/telehealth-referrals" },
]

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "consult",
  analyticsId: "consult",
  sticky: {
    ctaText: `Start your consult \u2014 $${PRICING.CONSULT.toFixed(2)}`,
    ctaHref: "/request?service=consult",
    mobileSummary: `Need to see a doctor? Open ${SOCIAL_PROOF_DISPLAY.operatingHours} AEST.`,
    desktopLabel: `General Consult \u00b7 Open ${SOCIAL_PROOF_DISPLAY.operatingHours} AEST \u00b7 7 days`,
    priceLabel: `From $${PRICING.CONSULT.toFixed(2)}`,
    desktopCtaText: "Start your consult",
    responseTime: `Avg response: ${SOCIAL_PROOF_DISPLAY.responseTime}`,
  },
}

// =============================================================================
// UNIQUE SECTIONS
// =============================================================================

/** How It Works - inline 3-step section */
function HowItWorksInline({ onCTAClick, isDisabled }: { onCTAClick?: () => void; isDisabled?: boolean }) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section id="how-it-works" aria-label="How it works" className="py-20 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Three steps to a doctor consultation - no waiting room, no travel.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-10 mb-12">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              className="relative flex flex-col items-center text-center md:items-start md:text-left"
              initial={animate ? { y: 20 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1.5">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{step.description}</p>
              <span className="text-xs font-medium text-primary/70">{step.time}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="flex justify-center"
          initial={animate ? { y: 10 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Button
            asChild
            size="lg"
            className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            onClick={onCTAClick}
            disabled={isDisabled}
          >
            <Link href={isDisabled ? "/contact" : "/request?service=consult"}>
              {isDisabled ? "Contact us" : "Start your consult"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function GeneralConsultLanding() {
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

  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={
        <>
          <ContentHubLinks service="consult" />
          <RelatedArticles articles={RELATED_ARTICLES_DATA} />
        </>
      }
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen, prefersReducedMotion }) => (
        <>
          {/* 1. Hero */}
          <GeneralConsultHeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} isDisabled={isDisabled} />

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["consult"]} />

          {/* Recent activity ticker */}
          <RecentActivityTicker
            entries={RECENT_ACTIVITY_ENTRIES}
            messageTemplate="{name} from {city} completed their consult {minutesAgo} min ago"
          />

          {/* Social proof stats */}
          <SocialProofStrip stats={SOCIAL_PROOF_STATS} />

          {/* Expect a call reassurance */}
          <ExpectCallStrip />

          {/* 2. How It Works */}
          <HowItWorksInline onCTAClick={handleHowItWorksCTA} isDisabled={isDisabled} />

          {/* Response time comparison */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="mx-auto max-w-xl">
              <div className="text-center mb-6">
                <SectionPill>Why go online?</SectionPill>
              </div>
              <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                <ComparisonBar
                  us={{
                    label: "InstantMed",
                    value: "~2 hours",
                    subtext: "Online assessment, no appointment needed",
                  }}
                  them={{
                    label: "GP clinic visit",
                    value: "3+ hours",
                    subtext: "Book, travel, wait, face-to-face consult",
                  }}
                  ratio={0.35}
                />
              </div>
            </div>
          </section>

          {/* Common concerns */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <CommonConcernsSection />
          </div>

          {/* Specialised consults */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <SpecialisedConsultsSection />
          </div>

          {/* Doctor profile */}
          <DoctorProfileSection />

          {/* Pre-qualify before pricing */}
          <ConsultLimitationsSection />

          {/* 3. Pricing */}
          <PricingSection
            title="One flat fee. Save $30\u201370 vs a clinic."
            subtitle="One flat fee \u2014 no gap fees, no surprises. Same quality of care as in-person."
            price={PRICING.CONSULT}
            originalPrice="~$120"
            features={PRICING_FEATURES}
            ctaText={
              isDisabled
                ? "Contact us"
                : `Start your consult \u2014 $${PRICING.CONSULT.toFixed(2)}`
            }
            ctaHref={isDisabled ? "/contact" : "/request?service=consult"}
            colors={{
              light: "bg-primary/10",
              text: "text-primary",
              border: "border-primary/20",
              button: "bg-primary hover:bg-primary/90",
            }}
            showComparisonTable={false}
          />

          {/* 4. Testimonials */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
          <TestimonialsSection
            testimonials={testimonialsForColumns}
            title="What patients say"
            subtitle="Real reviews from Australians who\u2019ve used our service"
          />
          </div>

          {/* Regulatory Partners - Medicare excluded */}
          <RegulatoryPartners className="py-12" exclude={["Medicare"]} />

          {/* 5. FAQ */}
          <section id="faq" aria-label="Frequently asked questions" className="py-20 lg:py-24 scroll-mt-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-10"
                initial={prefersReducedMotion ? {} : { y: 20 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4 tracking-tight">
                  Common questions
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                  Everything you need to know about online consultations.
                </p>
              </motion.div>

              <FAQList
                items={CONSULT_FAQ}
                itemClassName="border-b border-border/40 last:border-b-0 first:border-t first:border-t-border/40 rounded-none bg-transparent shadow-none px-0 hover:border-border/40 hover:shadow-none"
                onValueChange={(value) => {
                  if (value && handleFAQOpen) {
                    const idx = parseInt(value, 10)
                    handleFAQOpen(CONSULT_FAQ[idx]?.question ?? "", idx)
                  }
                }}
              />

              <motion.div
                className="mt-10 text-center"
                initial={{}}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-muted-foreground mb-2 text-sm">
                  Still have questions?
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-primary underline underline-offset-2 hover:no-underline font-medium"
                >
                  {CONTACT_EMAIL}
                </a>
              </motion.div>
            </div>
          </section>

          {/* Referral strip */}
          <ReferralStrip contextText="who could use a doctor" />

          {/* 6. Final CTA */}
          <FinalCtaSection
            onCTAClick={handleFinalCTA}
            title="Talk to a doctor today."
            subtitle="Trusted by 3,000+ Australians for online healthcare. Describe your concern, and a GP reviews it the same day."
            ctaText={isDisabled ? "Contact us" : "Start your consult"}
            ctaHref={isDisabled ? "/contact" : "/request?service=consult"}
            price={PRICING.CONSULT}
          />
        </>
      )}
    </LandingPageShell>
  )
}
