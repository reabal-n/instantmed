'use client'

import type React from "react"
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { HeroOutcomeMockup } from '@/components/marketing/hero-outcome-mockup'
import { TrustBadgeRow } from '@/components/shared/trust-badge'

const LCP_CLASSES = "text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed text-balance"

export function Hero({ children }: { children?: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            {/* Doctor availability pill */}
            <motion.div
              className="flex justify-center lg:justify-start mb-8"
              initial={prefersReducedMotion ? {} : { y: -10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill />
            </motion.div>

            {/* Headline — server-rendered static text for LCP */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-8 leading-[1.15] animate-hero-headline">
              A doctor, without the waiting room.
            </h1>

            {/* LCP slot — server-rendered when passed as children, else fallback */}
            {children ?? (
              <p className={LCP_CLASSES}>
                Real Australian doctors review every request. No appointments, no video calls — just fill in a quick form and a GP takes care of the rest. Reviewed within 1–2 hours, most days.
              </p>
            )}

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8"
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
                <Link href="/pricing">
                  See pricing
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
              <TrustBadgeRow
                preset="trust_certifications"
                className="hidden sm:flex justify-center lg:justify-start mt-1"
              />
            </motion.div>
          </div>

          {/* Hero product mockup — desktop */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <HeroOutcomeMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
