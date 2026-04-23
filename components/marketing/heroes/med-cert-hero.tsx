"use client"

import { motion } from "framer-motion"
import { ArrowRight, PhoneOff } from "lucide-react"
import Link from "next/link"

import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"
import { TrustBadgeRow } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { PRICING } from "@/lib/constants"
import { stagger } from "@/lib/motion"
import { SOCIAL_PROOF } from "@/lib/social-proof"

export function MedCertHeroSection({
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
    <section
      data-track-section="hero"
      aria-label="Medical certificate service overview"
      className="relative overflow-hidden pt-6 pb-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24"
    >
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <motion.div
          variants={container}
          initial="initial"
          animate="animate"
          className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14"
        >
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <motion.div
              variants={item}
              className="flex justify-center lg:justify-start mb-4 sm:mb-8"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-success-light text-success border border-success/20 dark:bg-success/15 dark:border-success/30">
                <PhoneOff className="w-3.5 h-3.5" aria-hidden="true" />
                No call required
              </div>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-5 leading-[1.1] text-balance"
            >
              Sick today? A valid medical certificate in about {SOCIAL_PROOF.certTurnaroundMinutes} minutes.
            </motion.h1>

            <motion.p
              variants={item}
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-7 leading-relaxed text-balance"
            >
              Fair Work compliant. Reviewed by an Australian-registered GP (AHPRA). Emailed straight to your inbox.
            </motion.p>

            <motion.div
              variants={item}
              ref={ctaRef}
              className="flex flex-col items-center lg:items-start gap-3 mb-5 sm:mb-6"
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                onClick={onCTAClick}
              >
                <Link href="/request?service=med-cert">
                  Get your certificate &middot; ${PRICING.MED_CERT.toFixed(2)}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>

              <div className="flex flex-col items-center lg:items-start gap-1 text-center lg:text-left">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                  </span>
                  Doctor online &middot; reviewed in ~{SOCIAL_PROOF.certTurnaroundMinutes} min
                </span>
                <p className="text-xs text-muted-foreground">
                  2 min form &middot; No Medicare needed &middot; Refund if we can&apos;t approve
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={item}
              className="lg:hidden mb-5 w-full max-w-[280px] mx-auto"
              aria-hidden="true"
            >
              <MedCertHeroMockup compact />
            </motion.div>

            <motion.div variants={item}>
              <TrustBadgeRow
                badges={[
                  { id: "legitscript", variant: "styled" },
                  { id: "google_pharmacy", variant: "styled" },
                  { id: "ahpra", variant: "styled" },
                ]}
                className="mt-4 justify-center lg:justify-start gap-3"
              />
            </motion.div>
          </div>

          <div className="hidden lg:block relative shrink-0 mt-0" aria-hidden="true">
            <MedCertHeroMockup />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
