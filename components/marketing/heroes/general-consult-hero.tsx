"use client"

import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Phone,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { ConsultChatMockup } from "@/components/marketing/mockups/consult-chat-mockup"
import { ClosingCountdown } from "@/components/marketing/shared/closing-countdown"
import { DoctorAvailabilityPill, TrustBadgeRow } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

const STATIC_BADGES = [
  "AHPRA registered doctors",
  "Medication if needed",
  "Same-day response",
  "Full refund if we can\u2019t help",
]

/** Day-of-week contextual hero message */
function ContextualMessage() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const aestOffset = 10 * 60
    const utc = now.getTime() + now.getTimezoneOffset() * 60_000
    const aest = new Date(utc + aestOffset * 60_000)
    const hour = aest.getHours()
    const day = aest.getDay()

    if (day === 1 && hour < 12) {
      setMessage("Waiting weeks for a GP? Most consults are completed same day.")
    } else if (day === 0 && hour >= 17) {
      setMessage("Start tonight. Doctor typically responds by Monday morning.")
    } else if (day >= 1 && day <= 5 && hour >= 18) {
      setMessage("Too late for a GP? We\u2019re open until 10pm AEST, seven days.")
    } else if ((day === 0 || day === 6) && hour >= 8 && hour < 17) {
      setMessage("Weekend and your GP is closed? We\u2019re open right now.")
    } else {
      setMessage(null)
    }
  }, [])

  if (!message) return null

  return (
    <p className="text-xs text-muted-foreground italic mt-1">
      {message}
    </p>
  )
}

export function GeneralConsultHeroSection({
  ctaRef,
  onCTAClick,
  isDisabled,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
  isDisabled?: boolean
}) {
  return (
    <section aria-label="General consultation service overview" className="relative overflow-hidden pt-8 pb-10 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <div className="flex justify-center lg:justify-start mb-4 sm:mb-8 hero-availability-enter">
              <DoctorAvailabilityPill />
            </div>

            {/* Headline */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Talk to a doctor today.{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                From your phone.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance hero-subheadline-enter">
              A full clinical assessment with an AHPRA-registered GP.
              Medication, referrals, and medical advice - without the waiting room.
            </p>

            {/* Price anchor */}
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center justify-center lg:justify-start gap-1.5 hero-cta-enter">
              {PRICING_DISPLAY.FROM_CONSULT}
              <span className="text-xs font-normal text-muted-foreground">- no hidden fees</span>
            </p>

            {/* Static proof chips */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-1.5 mb-6 hero-trust-enter">
              {STATIC_BADGES.map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-primary/70" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-6 hero-cta-enter"
            >
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                  onClick={onCTAClick}
                  disabled={isDisabled}
                >
                  <Link href={isDisabled ? "/contact" : "/request?service=consult"}>
                    {isDisabled ? "Contact us" : `Start your consult \u00b7 $${PRICING.CONSULT.toFixed(2)}`}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </MagneticButton>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {SOCIAL_PROOF_DISPLAY.gpComparisonComplex} visit
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  Open today {SOCIAL_PROOF_DISPLAY.operatingHours} AEST &middot; 7 days
                </p>
                <ClosingCountdown />
                <ContextualMessage />
              </div>
            </div>

            {/* AHPRA + LegitScript trust row - directly below CTA */}
            <TrustBadgeRow
              badges={[
                { id: "ahpra", variant: "styled" },
                { id: "legitscript", variant: "styled" },
              ]}
              className="mt-4 justify-center lg:justify-start gap-3"
            />

            {/* Trust signals */}
            <div className="hidden sm:flex flex-col gap-2 hero-count-enter">
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>
                  AHPRA-registered doctors &middot; Medication &amp; referrals if needed
                  &middot; Full refund if we can&apos;t help
                </span>
              </p>
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary/80 dark:bg-primary/10 dark:border-primary/30 dark:text-primary/70">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  Doctor calls when needed
                </div>
              </div>
            </div>

            {/* Secondary anchor CTA - desktop only */}
            <div className="hidden sm:flex justify-center lg:justify-start mt-4 hero-count-enter">
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                See how it works
                <ChevronDown className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Hero product mockup - desktop only */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <ConsultChatMockup />
          </div>

          {/* Mobile mockup - compact, below text content */}
          <div className="lg:hidden mt-8 w-full max-w-sm mx-auto">
            <ConsultChatMockup compact />
          </div>
        </div>

        {/* Lifestyle photo — person at home on laptop for online doctor consultation */}
        <div className="mt-8 sm:mt-10 w-full relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
          <Image
            src="/images/consult-1.webp"
            alt="Person at home on a laptop having an online doctor consultation"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 960px"
          />
        </div>
      </div>
    </section>
  )
}
