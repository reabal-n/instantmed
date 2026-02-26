'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, CreditCard } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion, useReducedMotion } from 'framer-motion'
import { RotatingText } from '@/components/marketing/rotating-text'
import { heroRotatingTexts } from '@/lib/marketing/homepage'

export function Hero() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      {/* Subtle gradient background accent */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-14">
          {/* Text content */}
          <div className="flex-1 text-center lg:text-left">
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
              className="text-[1.35rem] sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6 leading-[1.15]"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <RotatingText
                texts={heroRotatingTexts}
                interval={3500}
                className="text-[1.35rem] sm:text-2xl md:text-3xl lg:text-4xl font-bold"
              />
            </motion.h1>

            {/* Single subtext line */}
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed text-balance"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Real Australian doctors review every request. No appointments, no video calls — just fill in a quick form and a GP handles the rest. Most done within the hour.
            </motion.p>

            {/* Price anchor above CTAs */}
            <motion.div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Medical certificates from $19.95
              </span>
              <p className="text-xs text-muted-foreground mt-1 text-center lg:text-left">
                Typically $60–90 at a GP clinic
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
              >
                <Link href="/request?service=med-cert">
                  Get your medical certificate
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-6 text-base active:scale-[0.98]"
              >
                <Link href="/request?service=prescription">
                  Renew a prescription
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
              <p className="text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>{'AHPRA-registered doctors \u00b7 Accepted by all employers \u00b7 Full refund if we can\'t help'}</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <span>No account required &middot; Pay only after doctor review</span>
              </p>
            </motion.div>
          </div>

          {/* Hero image — desktop */}
          <motion.div
            className="hidden lg:block relative shrink-0 mt-0"
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative w-72 xl:w-80 aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/images/home-1.jpeg"
                alt="Woman requesting a medical certificate from her phone in bed"
                fill
                className="object-cover"
                priority
                sizes="(min-width: 1024px) 320px, 0px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
