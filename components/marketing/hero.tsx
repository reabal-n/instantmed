'use client'

import type React from "react"
import Link from 'next/link'
import { ArrowRight, FileText, CheckCircle2, Pill, Smartphone } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { HeroMultiServiceMockup } from '@/components/marketing/hero-multi-service-mockup'
import { TrustBadgeRow } from '@/components/shared/trust-badge'
import { LastReviewedSignal } from '@/components/marketing/last-reviewed-signal'
import { HeroTestimonialRotator } from '@/components/marketing/hero-testimonial-rotator'

const LCP_CLASSES = "text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed text-balance"

export function Hero({ children }: { children?: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden pt-6 pb-6 sm:pt-14 sm:pb-18 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <motion.div
              className="flex justify-center lg:justify-start mb-5 sm:mb-8"
              initial={prefersReducedMotion ? {} : { y: -10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill />
            </motion.div>

            {/* Headline — server-rendered static text for LCP */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-5 sm:mb-8 leading-[1.15] animate-hero-headline">
              Skip the GP queue. Certs, scripts, and treatment.
            </h1>

            {/* LCP slot — server-rendered when passed as children, else fallback */}
            {children ?? (
              <p className={LCP_CLASSES}>
                Real Australian doctors review every request. No appointments, no video calls — just fill in a quick form and a GP takes care of the rest. Reviewed within 1–2 hours, most days.
              </p>
            )}

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-5 sm:mb-8"
              initial={prefersReducedMotion ? {} : { y: 12 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
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

            {/* Trust signals */}
            <motion.div
              className="flex flex-col items-center lg:items-start gap-1"
              initial={prefersReducedMotion ? {} : { y: 8 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TrustBadgeRow
                badges={[
                  { id: 'social_proof', variant: 'styled' },
                  { id: 'no_call', variant: 'styled' },
                  'refund',
                ]}
                className="mt-4 justify-center lg:justify-start"
              />
              {/* Certification badges */}
              <TrustBadgeRow
                preset="trust_certifications"
                className="mt-2 justify-center lg:justify-start"
              />
              <LastReviewedSignal className="mt-3 justify-center lg:justify-start" />
              {/* Rotating testimonials */}
              <HeroTestimonialRotator className="mt-3 mx-auto lg:mx-0 text-center lg:text-left" />
            </motion.div>
          </div>

          {/* Hero product mockup — full stack on desktop, compact card on mobile */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <HeroMultiServiceMockup />
          </div>
          <motion.div
            className="lg:hidden flex justify-center mt-3"
            initial={prefersReducedMotion ? {} : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
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
              {/* eScript card */}
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
                <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
                  <Pill className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground leading-tight">eScript</p>
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">Sent to phone</p>
                </div>
                <Smartphone className="w-4 h-4 text-cyan-500" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
