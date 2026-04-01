'use client'

import type React from "react"
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { SOCIAL_PROOF_DISPLAY } from '@/lib/social-proof'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { HeroProductMockup } from '@/components/marketing/hero-product-mockup'
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
                {SOCIAL_PROOF_DISPLAY.gpComparison} clinic
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
              <Link
                href="/request?service=prescription"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Renew medication
              </Link>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-3 py-1.5 hover:border-success/30 hover:text-foreground transition-colors duration-200">
                <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                Full refund if declined
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-3 py-1.5 hover:border-primary/30 hover:text-foreground transition-colors duration-200">
                <Clock className="w-3 h-3 text-primary shrink-0" />
                Med certs in under 30 min, 24/7
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-3 py-1.5 hover:border-primary/30 hover:text-foreground transition-colors duration-200">
                <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                AHPRA-registered doctors
              </span>
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
