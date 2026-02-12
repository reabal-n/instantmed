'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion, useReducedMotion } from 'framer-motion'
import { RotatingText } from '@/components/marketing/rotating-text'
import { heroRotatingTexts } from '@/lib/marketing/homepage'

export function Hero() {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-28">
      {/* Subtle gradient background accent */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Doctor availability pill */}
        <motion.div 
          className="flex justify-center mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <DoctorAvailabilityPill />
        </motion.div>

        {/* Headline -- bold, centered, clean. Capped at 4xl (36px) max */}
        <motion.h1 
          className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 leading-[1.15]"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <RotatingText 
            texts={heroRotatingTexts} 
            interval={3500}
            className="text-2xl sm:text-3xl md:text-4xl font-bold"
          />
        </motion.h1>

        {/* Single subtext line -- warm, concise */}
        <motion.p 
          className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-balance"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Skip the waiting room. A real Australian doctor reviews your request — usually within an hour. No signup needed to get started.
        </motion.p>

        {/* CTAs -- shadcn buttons, clean press effect */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Button 
            asChild
            size="lg"
            className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
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
            className="h-12 px-6 text-base active:scale-[0.98]"
          >
            <Link href="/request?service=prescription">
              Renew your prescription
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Compact trust line -- no RACGP (repeated in badge slider below) */}
        <motion.p
          className="text-sm text-muted-foreground flex items-center justify-center gap-2"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span>{'AHPRA-registered doctors \u00b7 Refund if we can\'t help \u00b7 Usually sorted in under an hour'}</span>
        </motion.p>
      </div>
    </section>
  )
}
