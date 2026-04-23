"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { GuaranteeBadge } from "@/components/marketing/guarantee-badge"
import { EDHeroMockup } from "@/components/marketing/mockups/ed-hero-mockup"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { PRICING_DISPLAY } from "@/lib/constants"
import { stagger } from "@/lib/motion"

export function EDHeroSection({
  ctaRef,
  onCTAClick,
}: {
  ctaRef?: React.RefObject<HTMLDivElement>
  onCTAClick?: () => void
}) {
  const reduced = useReducedMotion()
  const container = reduced ? {} : stagger.container
  const item = reduced ? {} : stagger.item

  return (
    <section aria-label="ED treatment service overview" className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <motion.div
          variants={container}
          initial="initial"
          animate="animate"
          className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14"
        >
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <motion.h1
              variants={item}
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 sm:mb-5 leading-[1.1] text-balance"
            >
              ED medication, without the GP visit.
            </motion.h1>

            <motion.p
              variants={item}
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-5 sm:mb-6 leading-relaxed text-balance"
            >
              Fill a short health form. A doctor reviews it privately and sends your prescription by SMS. No call, no waiting room.
            </motion.p>

            <motion.p
              variants={item}
              className="text-sm font-semibold text-foreground mb-4 flex items-center justify-center lg:justify-start gap-1.5"
            >
              {PRICING_DISPLAY.MENS_HEALTH}
              <span className="text-xs font-normal text-muted-foreground">· no hidden fees</span>
            </motion.p>

            <motion.div
              variants={item}
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-5"
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                onClick={onCTAClick}
              >
                <Link href="/request?service=consult&subtype=ed">
                  Start assessment · {PRICING_DISPLAY.MENS_HEALTH}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              variants={item}
              className="flex justify-center lg:justify-start mb-3"
            >
              <AvailabilityIndicator service="consult" variant="badge" />
            </motion.div>

            <motion.div
              variants={item}
              className="flex justify-center lg:justify-start mb-3"
            >
              <GuaranteeBadge size="md" />
            </motion.div>

            <motion.div variants={item}>
              <TrustBadgeRow
                preset="trust_ribbon"
                className="justify-center lg:justify-start"
              />
            </motion.div>
          </div>

          <div className="hidden lg:block relative shrink-0 mt-0">
            <EDHeroMockup />
          </div>

          <div className="lg:hidden mt-6 w-full max-w-xs mx-auto">
            <EDHeroMockup compact />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
