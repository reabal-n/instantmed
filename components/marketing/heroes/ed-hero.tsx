"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  PhoneOff,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { EDHeroMockup } from "@/components/marketing/mockups/ed-hero-mockup"
import { DoctorAvailabilityPill,TrustBadgeRow } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { useReducedMotion } from "@/components/ui/motion"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"

const STATIC_BADGES = [
  "No call required",
  "Discreet packaging",
  "Doctor-reviewed",
  "Full refund if we can\u2019t help",
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
              initial={animate ? { opacity: 0, y: -10 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill alwaysAvailable />
            </motion.div>

            {/* Headline */}
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
              initial={animate ? { opacity: 0, y: 12 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Fill a short health form. A doctor reviews it and, if
              appropriate, sends treatment straight to your phone. No call,
              no waiting room.
            </motion.p>

            {/* Price anchor */}
            <motion.p
              className="text-sm font-semibold text-foreground mb-2 flex items-center justify-center lg:justify-start gap-1.5"
              initial={animate ? { opacity: 0, y: 8 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.11 }}
            >
              {PRICING_DISPLAY.MENS_HEALTH}
              <span className="text-xs font-normal text-muted-foreground">- no hidden fees</span>
            </motion.p>

            {/* Static proof chips */}
            <motion.div
              className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-1.5 mb-6"
              initial={animate ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              {STATIC_BADGES.map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-primary/70" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-4 sm:mb-6"
              initial={animate ? { opacity: 0, y: 12 } : {}}
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
                  <Link href="/request?service=consult&subtype=ed">
                    Start assessment \u00b7 ${PRICING.MENS_HEALTH.toFixed(2)}
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

            {/* AHPRA + LegitScript trust row */}
            <TrustBadgeRow
              badges={[
                { id: "ahpra", variant: "styled" },
                { id: "legitscript", variant: "styled" },
              ]}
              className="mt-4 justify-center lg:justify-start gap-3"
            />

            {/* Quiz anchor */}
            <motion.div
              className="flex justify-center lg:justify-start mb-4 sm:mb-6"
              initial={animate ? { opacity: 0, y: 6 } : {}}
              animate={{ opacity: 1, y: 0 }}
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

            {/* Trust signals - hidden on mobile */}
            <motion.div
              className="hidden sm:flex flex-col gap-2"
              initial={animate ? { opacity: 0, y: 8 } : {}}
              animate={{ opacity: 1, y: 0 }}
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
              initial={animate ? { opacity: 0, y: 6 } : {}}
              animate={{ opacity: 1, y: 0 }}
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

          {/* Hero product mockup - desktop only */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <EDHeroMockup />
          </div>

          {/* Mobile mockup */}
          <div className="lg:hidden mt-4 w-full max-w-xs mx-auto">
            <EDHeroMockup />
          </div>
        </div>

        {/* Lifestyle photo — couple laughing together at home */}
        <div className="mt-8 sm:mt-10 w-full relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
          <Image
            src="/images/ed-1.jpg"
            alt="Couple laughing together at home"
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
