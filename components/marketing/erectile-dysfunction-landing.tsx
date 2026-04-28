"use client"

import { ArrowRight, CheckCircle2, Clock } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { StickerIcon } from "@/components/icons/stickers"
// Hero is above-fold - not lazy loaded
import { EDHeroSection } from "@/components/marketing/heroes/ed-hero"
import { LiveWaitTime } from "@/components/marketing/live-wait-time"
import { ServiceFinalCTA } from "@/components/marketing/sections/service-final-cta"
import {
  type LandingPageConfig,
  LandingPageShell,
  ReferralStrip,
} from "@/components/marketing/shared"
import { ContentHubLinks } from "@/components/seo"
import { Button } from "@/components/ui/button"
import { FAQList } from "@/components/ui/faq-list"
import { useReducedMotion } from "@/components/ui/motion"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING } from "@/lib/constants"
import { ED_FAQ } from "@/lib/data/ed-faq"
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

// Below-fold lazy loads
const HowItWorksInline = dynamic(
  () => import("@/components/marketing/sections/how-it-works-inline").then((m) => m.HowItWorksInline),
  { loading: () => <div className="min-h-[400px]" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <div className="min-h-[200px]" /> },
)
const RegulatoryPartners = dynamic(
  () => import("@/components/marketing/media-mentions").then((m) => m.RegulatoryPartners),
  { loading: () => <div className="min-h-[120px]" /> },
)
const EDGuideSection = dynamic(
  () => import("@/components/marketing/sections/ed-guide-section").then((m) => m.EDGuideSection),
  { loading: () => <div className="min-h-[400px]" /> },
)

// =============================================================================
// DATA
// =============================================================================

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Fill a short health form",
    description: "Private assessment covering your health history. Takes about 2 minutes.",
    time: "~2 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A real GP reviews it",
    description: "An AHPRA-registered doctor reviews your assessment - same standards as in-person.",
    time: `~${SOCIAL_PROOF.averageResponseMinutes} min`,
  },
  {
    sticker: "sent" as const,
    step: 3,
    title: "eScript sent to your phone",
    description: "Your prescription is sent via SMS. Collect treatment from any Australian pharmacy.",
    time: "Same day",
  },
]

const PRICING_BULLETS = [
  "Includes a 30-day follow-up check-in with your doctor",
  "AHPRA-registered Australian doctor reviews your form",
  "eScript sent to your phone via SMS",
  "Collect from any Australian pharmacy",
  "Discreet packaging, nothing on the outside",
  "Full refund if we can\u2019t help",
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
// UNIQUE SECTIONS
// =============================================================================

function EDComparisonViz() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  useEffect(() => {
    const el = ref.current; if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    observer.observe(el); return () => observer.disconnect()
  }, [])
  const active = inView || prefersReducedMotion
  return (
    <section aria-label="Time comparison" className="py-10 sm:py-14 bg-muted/30 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal instant className="text-center mb-10">
          <SectionPill>Why go online?</SectionPill>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
            Doctor-reviewed in under an hour.
          </h2>
        </Reveal>
        <div ref={ref} className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">InstantMed</p>
              <p className="text-4xl sm:text-5xl font-semibold tabular-nums text-foreground leading-none">
                ~1<span className="text-xl font-normal text-muted-foreground ml-1">hr</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1.5">GP clinic</p>
              <p className="text-4xl sm:text-5xl font-semibold tabular-nums text-muted-foreground/60 leading-none">
                2+<span className="text-xl font-normal ml-1">hrs</span>
              </p>
            </div>
          </div>
          <div className="relative h-2 rounded-full bg-muted/30 overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full bg-muted/50 dark:bg-muted/30" style={{ width: '100%' }} />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{
                width: active ? '30%' : '0%',
                transition: prefersReducedMotion ? 'none' : 'width 800ms cubic-bezier(0.23, 1, 0.32, 1)',
                transitionDelay: active && !prefersReducedMotion ? '300ms' : '0ms',
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-6 pt-1">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">Online</p>
              {["2-min health form", "Doctor reviews privately", "eScript sent by SMS"].map((s) => (
                <p key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  {s}
                </p>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">GP clinic</p>
              {["Book appointment", "Travel + wait in clinic", "Face-to-face consult"].map((s) => (
                <p key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {s}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function EDPricingSection({ isDisabled }: { isDisabled?: boolean }) {
  return (
    <section id="pricing" aria-label="Pricing" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <SectionPill>Pricing</SectionPill>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-4 mb-3">
            One flat fee. No hidden costs.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            You only pay if the doctor approves treatment.
          </p>
        </Reveal>

        <Reveal className="max-w-sm mx-auto">
          <div className="relative rounded-2xl border flex flex-col overflow-hidden bg-white dark:bg-card border-primary/30 shadow-xl shadow-primary/[0.12]">
            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-4">
                <StickerIcon name="stethoscope" size={56} />
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  One-time
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">ED Assessment</h3>
              <p className="text-sm text-muted-foreground mb-5">Private online consult + eScript if approved</p>

              <div className="mb-5">
                <span className="text-4xl font-semibold tracking-tight text-foreground">
                  ${PRICING.MENS_HEALTH.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground ml-2">consult + 30-day follow-up</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {PRICING_BULLETS.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {bullet}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                className="w-full h-11 font-semibold shadow-md shadow-primary/20"
                disabled={isDisabled}
              >
                <Link href={isDisabled ? "/contact" : "/request?service=consult&subtype=ed"}>
                  {isDisabled ? "Contact us" : "Start assessment"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function EDFAQSection({ onFAQOpen }: { onFAQOpen?: (question: string, index: number) => void }) {
  return (
    <section aria-label="Frequently asked questions" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground text-balance">
            Everything you need to know about ED treatment online
          </p>
        </Reveal>
        <FAQList
          items={ED_FAQ}
          type="single"
          onValueChange={(value: string) => {
            if (onFAQOpen && value) {
              const idx = ED_FAQ.findIndex((f) => f.question === value)
              if (idx !== -1) onFAQOpen(value, idx)
            }
          }}
        />
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function ErectileDysfunctionLanding() {
  return (
    <LandingPageShell
      config={LANDING_CONFIG}
      afterFooter={<ContentHubLinks service="consult" />}
    >
      {({ isDisabled, heroCTARef, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          {/* 1. Hero */}
          <EDHeroSection ctaRef={heroCTARef} onCTAClick={handleHeroCTA} />

          {/* Live wait time */}
          <LiveWaitTime variant="strip" services={["consult-ed"]} />

          {/* 2. How It Works */}
          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref="/request?service=consult&subtype=ed"
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            subheading="No call, no face-to-face appointment. Your assessment stays between you and the doctor."
          />

          {/* 3. Time comparison */}
          <EDComparisonViz />

          {/* 4. Doctor profile */}
          <DoctorProfileSection />

          {/* 5. Pricing */}
          <EDPricingSection isDisabled={isDisabled} />

          {/* Regulatory Partners */}
          <RegulatoryPartners className="py-12" />

          {/* 7. FAQ */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <EDFAQSection onFAQOpen={handleFAQOpen} />
          </div>

          {/* Guide - deep E-E-A-T content for organic search */}
          <EDGuideSection />

          {/* Referral strip */}
          <ReferralStrip contextText="dealing with ED" />

          {/* 8. Final CTA */}
          <ServiceFinalCTA
            title="Discreet ED treatment, reviewed by a real doctor."
            ctaHref="/request?service=consult&subtype=ed"
            price={PRICING.MENS_HEALTH}
            onCTAClick={handleFinalCTA}
            isDisabled={isDisabled}
          />
        </>
      )}
    </LandingPageShell>
  )
}
