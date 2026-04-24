'use client'

import { type Variants, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, FileText, Pill, Smartphone, Star } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type React from "react"

import { GuaranteeBadge } from '@/components/marketing/guarantee-badge'
import { LastReviewedSignal } from '@/components/marketing/last-reviewed-signal'
import { RegulatoryPartners } from '@/components/marketing/media-mentions'
import { TrustBadgeRow } from '@/components/shared/trust-badge'
import { Button } from "@/components/ui/button"
import { useReducedMotion } from '@/components/ui/motion'
import { usePatientCount } from '@/lib/hooks/use-patient-count'
import { WEDGE } from '@/lib/marketing/voice'
import { stagger } from '@/lib/motion'
import { SOCIAL_PROOF } from '@/lib/social-proof'

// Desktop-only stacked card mockup — never the LCP element, safe for ssr:false
const HeroMultiServiceMockup = dynamic(
  () => import('@/components/marketing/hero-multi-service-mockup').then(m => ({ default: m.HeroMultiServiceMockup })),
  { ssr: false }
)

// Testimonial rotator — decorative, below main CTA. ssr:false keeps framer-motion
// AnimatePresence out of the SSR bundle for this component. A min-h placeholder
// prevents layout shift while the JS chunk loads.
const HeroTestimonialRotator = dynamic(
  () => import('@/components/marketing/hero-testimonial-rotator').then(m => ({ default: m.HeroTestimonialRotator })),
  { ssr: false, loading: () => <div className="min-h-[60px]" /> }
)

const LCP_CLASSES = "text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed text-balance"

export function Hero({ children }: { children?: React.ReactNode }) {
  const patientCount = usePatientCount()
  const reduced = useReducedMotion()
  const container = reduced ? {} : stagger.container
  const item = reduced ? {} : stagger.item
  // H1 is the LCP element. Keep opacity: 1 in initial so Chrome registers it
  // from the SSR HTML — Framer Motion's opacity:0 initial would otherwise hide
  // it during hydration and push LCP to the end of the animation.
  const headlineItem: Variants = reduced ? {} : {
    initial: { opacity: 1, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
  }

  return (
    <section className="relative overflow-hidden pt-6 pb-6 sm:pt-14 sm:pb-18 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <motion.div
          variants={container}
          initial="initial"
          animate="animate"
          className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14"
        >
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Social-proof pill — above the fold, above the H1. Four signals
                in one compact row: rating · patient count · no-Medicare-friction
                · live availability. */}
            <motion.div
              variants={item}
              className="flex justify-center lg:justify-start mb-5 sm:mb-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-card border border-border/60 shadow-sm shadow-primary/[0.04]">
                <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${SOCIAL_PROOF.averageRating} out of 5 rating`}>
                  <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span className="text-foreground font-semibold tabular-nums">{SOCIAL_PROOF.averageRating.toFixed(1)}</span>
                </span>
                {patientCount > 0 && (
                  <>
                    <span className="text-border/70" aria-hidden="true">·</span>
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-semibold tabular-nums">{patientCount.toLocaleString()}+</span> Australians
                    </span>
                  </>
                )}
                <span className="text-border/70" aria-hidden="true">·</span>
                <span className="text-muted-foreground">No Medicare needed</span>
                <span className="text-border/70 hidden sm:inline" aria-hidden="true">·</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-green-500"
                    style={{ animation: 'pulse 3s ease-in-out infinite' }}
                    aria-hidden="true"
                  />
                  Open now
                </span>
              </div>
            </motion.div>

            {/* Headline - LCP element. Uses headlineItem (opacity:1 initial) so
                Chrome measures it from SSR HTML, not after JS hydration. */}
            <motion.h1
              variants={headlineItem}
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-5 sm:mb-7 leading-[1.1] text-balance"
            >
              Consults, certs, and treatment. From your bed.
            </motion.h1>

            {/* LCP slot - server-rendered when passed as children, else fallback */}
            <motion.div variants={item}>
              {children ?? (
                <p className={LCP_CLASSES}>
                  Real Australian doctors review every request. {WEDGE} Fill in a quick form and a GP takes care of the rest.
                </p>
              )}
            </motion.div>

            {/* CTAs */}
            <motion.div
              variants={item}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-3 sm:mb-4"
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                <Link href="/request">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base font-semibold"
              >
                <Link href="#how-it-works">
                  How it works
                </Link>
              </Button>
            </motion.div>

            {/* Guarantee pill - sits directly under primary CTA */}
            <motion.div
              variants={item}
              className="flex justify-center lg:justify-start mb-5 sm:mb-8"
            >
              <GuaranteeBadge size="md" />
            </motion.div>

            {/* Trust signals + regulatory logos + live activity signal */}
            <motion.div
              variants={item}
              className="flex flex-col items-center lg:items-start gap-3"
            >
              <TrustBadgeRow
                badges={[
                  { id: 'ahpra', variant: 'styled' },
                  { id: 'legitscript', variant: 'styled' },
                ]}
                className="mt-4 justify-center lg:justify-start"
              />

              {/* Regulatory partner logos — moved here from mid-page for max trust impact */}
              <RegulatoryPartners
                exclude={['Stripe', 'ADHA']}
                className="py-1 w-full"
              />

              {/* Live activity signal */}
              <LastReviewedSignal className="justify-center lg:justify-start" />

              <HeroTestimonialRotator className="mx-auto lg:mx-0 text-center lg:text-left" />
            </motion.div>
          </div>

          {/* Hero product mockup - full stack on desktop, compact card on mobile */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <HeroMultiServiceMockup />
          </div>
          <motion.div
            variants={item}
            className="lg:hidden flex justify-center mt-3"
          >
            <div className="flex flex-col gap-2">
              {/* Med cert card */}
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground leading-tight">Medical Certificate</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Reviewed &amp; issued</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              {/* eScript card — on-brand primary colors, not cyan */}
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Pill className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground leading-tight">eScript</p>
                  <p className="text-[10px] text-primary/70 font-medium">Sent to phone</p>
                </div>
                <Smartphone className="w-4 h-4 text-primary/60" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
