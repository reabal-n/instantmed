"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, PhoneOff } from "lucide-react"
import Link from "next/link"

import { CredentialCard } from "@/components/marketing/credential-card"
import { LastReviewedSignal } from "@/components/marketing/last-reviewed-signal"
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
      className="relative overflow-hidden pt-6 pb-8 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24"
    >
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <motion.div
          variants={container}
          initial="initial"
          animate="animate"
          className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14"
        >
          {/* Left column: copy + CTA + trust */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <motion.div
              variants={item}
              className="flex justify-center lg:justify-start mb-4 sm:mb-7"
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
              Reviewed by an AHPRA-registered Australian GP. Sent to your inbox as a PDF, ready to forward.
            </motion.p>

            <motion.div
              variants={item}
              ref={ctaRef}
              className="flex flex-col items-center lg:items-start gap-3 mb-5 sm:mb-6"
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                onClick={onCTAClick}
              >
                <Link href="/request?service=med-cert">
                  Get your certificate &middot; ${PRICING.MED_CERT.toFixed(2)}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>

              {/* Live availability + form length microcopy */}
              <div className="flex flex-col items-center lg:items-start gap-1.5 text-center lg:text-left">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                    <span
                      className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60"
                      style={{ animation: 'ping 2.5s ease-in-out infinite' }}
                    />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                  </span>
                  Doctor reviewing now &middot; ~{SOCIAL_PROOF.certTurnaroundMinutes} min turnaround
                </span>
                <p className="text-xs text-muted-foreground">
                  2 min form &middot; No Medicare needed &middot; Refund if we can&apos;t approve
                </p>
              </div>
            </motion.div>

            {/* Employer-proof line - resolves the #1 anxiety above the fold */}
            <motion.div
              variants={item}
              className="mb-6 sm:mb-7"
            >
              <p className="inline-flex items-start sm:items-center gap-2 text-[13px] text-foreground max-w-xl mx-auto lg:mx-0 leading-snug text-left sm:text-center lg:text-left">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-px sm:mt-0" aria-hidden="true" />
                <span>
                  Accepted by Woolworths, CBA, Telstra, and {SOCIAL_PROOF.employerAcceptancePercent}% of Australian employers.
                  <span className="text-muted-foreground"> Legally valid under Fair Work Act s 107.</span>
                </span>
              </p>
            </motion.div>

            {/* Mobile-only: trust badges ABOVE the mockup so LegitScript + AHPRA
                are visible above the fold for first-time ad traffic. Desktop
                layout pushes badges below since the mockup sits in the right column. */}
            <motion.div variants={item} className="lg:hidden mb-5 flex flex-col items-center gap-3">
              <TrustBadgeRow
                badges={[
                  { id: "legitscript", variant: "styled" },
                  { id: "google_pharmacy", variant: "styled" },
                ]}
                className="justify-center gap-3"
              />
              <CredentialCard compact />
            </motion.div>

            {/* Mobile cert mockup */}
            <motion.div
              variants={item}
              className="lg:hidden mb-5 w-full max-w-[320px] mx-auto"
              aria-hidden="true"
            >
              <MedCertHeroMockup compact />
            </motion.div>

            {/* Desktop trust signals (below CTA, above the LastReviewed line) */}
            <motion.div variants={item} className="hidden lg:flex flex-col items-start gap-3">
              <TrustBadgeRow
                badges={[
                  { id: "legitscript", variant: "styled" },
                  { id: "google_pharmacy", variant: "styled" },
                ]}
                className="gap-3"
              />
              <CredentialCard />
            </motion.div>

            <motion.div variants={item} className="mt-3 lg:mt-4">
              <LastReviewedSignal className="justify-center lg:justify-start" />
            </motion.div>
          </div>

          {/* Right column: cert mockup (desktop only) */}
          <div className="hidden lg:block relative shrink-0 mt-0" aria-hidden="true">
            <MedCertHeroMockup />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
