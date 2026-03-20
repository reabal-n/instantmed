'use client'

import type React from "react"
import Link from 'next/link'
import { ArrowRight, CheckCircle2, CreditCard } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion, useReducedMotion } from 'framer-motion'
import { HeroProductMockup } from '@/components/marketing/hero-product-mockup'
import { RotatingText } from '@/components/marketing/rotating-text'
import { heroRotatingTexts } from '@/lib/marketing/homepage'
import { MagneticButton } from '@/components/ui/magnetic-button'

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
              initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DoctorAvailabilityPill />
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-8 leading-[1.15]"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <RotatingText
                texts={heroRotatingTexts}
                interval={3500}
                className="text-2xl sm:text-3xl lg:text-4xl font-bold"
              />
            </motion.h1>

            {/* LCP slot — server-rendered when passed as children, else fallback */}
            {children ?? (
              <p className={LCP_CLASSES}>
                Real Australian doctors review every request. No appointments, no video calls — just fill in a quick form and a GP takes care of the rest. Most people are sorted within the hour.
              </p>
            )}

            {/* Price anchor above CTAs */}
            <motion.div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <Badge variant="price" shape="pill" size="lg" className="hover:bg-emerald-500/15 transition-colors duration-200 cursor-default">
                Medical certificates from $19.95
              </Badge>
              <p className="text-xs text-muted-foreground mt-1 text-center lg:text-left">
                Typically $60–90 at a GP clinic
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                >
                  <Link href="/request?service=med-cert">
                    Get your medical certificate
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </MagneticButton>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-6 text-base active:scale-[0.98]"
              >
                <Link href="/request?service=prescription">
                  Renew medication
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              className="flex flex-col gap-2"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-center lg:text-left">{'AHPRA-registered doctors \u00b7 Accepted by all employers \u00b7 Full refund if we can\'t help'}</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60 dark:text-muted-foreground shrink-0" />
                <span className="text-center lg:text-left">No account required &middot; Pay only if approved</span>
              </p>
            </motion.div>
          </div>

          {/* Hero product mockup — desktop */}
          <div className="hidden lg:block relative shrink-0 mt-0">
            <HeroProductMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
