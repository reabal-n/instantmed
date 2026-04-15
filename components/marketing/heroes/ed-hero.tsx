"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  PhoneOff,
} from "lucide-react"
import Link from "next/link"

import { EDHeroMockup } from "@/components/marketing/mockups/ed-hero-mockup"
import { RotatingText } from "@/components/marketing/rotating-text"
import { DoctorAvailabilityPill,TrustBadgeRow } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { useReducedMotion } from "@/components/ui/motion"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"

const ROTATING_BADGES = [
  "No call needed",
  "Discreet packaging",
  "Doctor-reviewed",
  "Full refund if we can't help",
]

export function EDHeroSection({
  ctaRef,
  onCTAClick,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="ED treatment service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <motion.div
              className="flex justify-center lg:justify-start mb-4 sm:mb-8"
              initial={animate ? { y: -10 } : {}}
              animate={{ y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill alwaysAvailable />
            </motion.div>

            {/* Headline - plain h1 with CSS animation so LCP text is visible on first paint */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-6 leading-[1.15] animate-hero-headline"
            >
              Discreet ED treatment,{" "}
              <br className="hidden sm:block" />
              <span className="text-premium-gradient">
                reviewed by a real Australian doctor.
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-3 sm:mb-4 leading-relaxed text-balance"
              initial={animate ? { y: 12 } : {}}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Fill a short health form. A doctor reviews it and - if
              appropriate - sends treatment straight to your phone. No call,
              no waiting room.
            </motion.p>

            {/* Price anchor */}
            <motion.p
              className="text-sm font-semibold text-foreground mb-2 flex items-center justify-center lg:justify-start gap-1.5"
              initial={animate ? { y: 8 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.11 }}
            >
              {PRICING_DISPLAY.MENS_HEALTH}
              <span className="text-xs font-normal text-muted-foreground">- no hidden fees</span>
            </motion.p>

            {/* Rotating secondary proof badge */}
            <motion.div
              className="flex justify-center lg:justify-start mb-6"
              initial={animate ? { y: 6 } : {}}
              animate={{ y: 0 }}
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
              animate={{ y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                  onClick={onCTAClick}
                >
                  <Link href="/request?service=consult&subtype=ed">
                    Start assessment - ${PRICING.MENS_HEALTH.toFixed(2)}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </MagneticButton>
              <div className="flex flex-col items-center lg:items-start gap-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  8am\u201310pm AEST, 7 days
                </p>
              </div>
            </motion.div>

            {/* AHPRA + LegitScript trust row - directly below CTA */}
            <TrustBadgeRow
              badges={[
                { id: "ahpra", variant: "styled" },
                { id: "legitscript", variant: "styled" },
              ]}
              className="mt-4 justify-center lg:justify-start gap-3"
            />

            {/* Quick quiz anchor - low-commitment engagement hook */}
            <motion.div
              className="flex justify-center lg:justify-start mb-4 sm:mb-6"
              initial={animate ? { y: 6 } : {}}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
            >
              <a
                href="#ed-quiz"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors dark:text-primary/70 dark:hover:text-primary/90"
              >
                Not sure? Take a 30-second quiz
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </motion.div>

            {/* Trust signals - hidden on mobile to keep CTA above fold */}
            <motion.div
              className="hidden sm:flex flex-col gap-2"
              initial={animate ? { y: 8 } : {}}
              animate={{ y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <span>
                  AHPRA-registered doctors &middot; Discreet packaging
                  &middot; Full refund if we can&apos;t help
                </span>
              </p>
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary/80 dark:bg-primary/10 dark:border-primary/30 dark:text-primary/70">
                  <PhoneOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  No call required
                </div>
              </div>
              <TrustBadgeRow preset="trust_certifications" className="justify-center lg:justify-start" />
            </motion.div>

            {/* Secondary anchor CTA - desktop only */}
            <motion.div
              className="hidden sm:flex justify-center lg:justify-start mt-4"
              initial={animate ? { y: 6 } : {}}
              animate={{ y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                See how it works
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </motion.div>
          </div>

          {/* Hero product mockup - desktop only, mobile gets version below */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <EDHeroMockup />
          </div>

          {/* Mobile mockup - below text content */}
          <div className="lg:hidden mt-4 w-full max-w-xs mx-auto">
            <EDHeroMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
