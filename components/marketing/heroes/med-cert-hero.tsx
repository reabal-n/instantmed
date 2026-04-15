"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

import { ContextualMessage } from "@/components/marketing/contextual-message"
import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { RotatingText } from "@/components/marketing/rotating-text"
import { DoctorAvailabilityPill } from "@/components/shared"
import { TrustBadgeRow } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { useReducedMotion } from "@/components/ui/motion"
import { PRICING } from "@/lib/constants"
import { BADGE_REGISTRY } from "@/lib/marketing/trust-badges"
import { SOCIAL_PROOF_DISPLAY } from "@/lib/social-proof"

const ROTATING_BADGES = [
  BADGE_REGISTRY.legally_valid.label,
  BADGE_REGISTRY.no_appointment.label,
  BADGE_REGISTRY.same_day.label,
  BADGE_REGISTRY.refund.label,
]

export function MedCertHeroSection({
  ctaRef,
  onCTAClick,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section data-track-section="hero" aria-label="Medical certificate service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <motion.div
              className="flex justify-center lg:justify-start mb-4 sm:mb-8"
              initial={animate ? { y: -10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill alwaysAvailable />
            </motion.div>

            {/* Headline */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Sick today? Certificate in{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                your inbox in under an hour.
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance"
              initial={animate ? { y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Valid for work, uni, or carer&apos;s leave. Reviewed by an
              AHPRA-registered GP and delivered straight to your inbox.
            </motion.p>

            {/* Price anchor */}
            <motion.p
              className="text-sm font-semibold text-foreground mb-2 flex items-center justify-center lg:justify-start gap-1.5"
              initial={animate ? { y: 8 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.11 }}
            >
              From ${PRICING.MED_CERT.toFixed(2)}
              <span className="text-xs font-normal text-muted-foreground">- no hidden fees</span>
            </motion.p>

            {/* Rotating secondary proof badge */}
            <motion.div
              className="flex justify-center lg:justify-start mb-6"
              initial={{}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 dark:text-primary/70">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <RotatingText texts={ROTATING_BADGES} interval={3000} />
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-4 sm:mb-6"
              initial={animate ? { y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                  onClick={onCTAClick}
                >
                  <Link href="/request?service=med-cert">
                    Get your certificate - ${PRICING.MED_CERT.toFixed(2)}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </MagneticButton>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {SOCIAL_PROOF_DISPLAY.gpComparison} clinic
                </p>
                <ContextualMessage service="med-cert" className="text-xs text-muted-foreground/80 italic mt-1" />
              </div>
            </motion.div>

            {/* 3 key trust badges — LegitScript + Google Pharmacy + No call */}
            <TrustBadgeRow
              badges={[
                { id: "legitscript", variant: "styled" },
                { id: "google_pharmacy", variant: "styled" },
                { id: "no_call", variant: "styled" },
              ]}
              className="mt-4 justify-center lg:justify-start gap-3"
            />
          </div>

          {/* Hero product mockup - desktop only, mobile gets compact version below */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <MedCertHeroMockup />
          </div>

          {/* Mobile mockup - compact, below text content */}
          <div className="lg:hidden mt-4 w-full max-w-xs mx-auto">
            <MedCertHeroMockup compact />
          </div>
        </div>
      </div>
    </section>
  )
}
