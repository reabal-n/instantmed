'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Shield, Clock } from 'lucide-react'
import { Button } from "@heroui/react"
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

        {/* Headline -- bold, centered, clean */}
        <motion.h1 
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.08]"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <RotatingText 
            texts={heroRotatingTexts} 
            interval={3500}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold"
          />
        </motion.h1>

        {/* Single subtext line -- warm, concise */}
        <motion.p 
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-balance"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Skip the waiting room. A real Australian GP reviews your request — usually within an hour. No signup needed to get started.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Button 
            as={Link}
            href="/request"
            color="primary"
            size="lg"
            className="px-8 h-13 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            endContent={<ArrowRight className="h-4 w-4" />}
          >
            Get started
          </Button>
          <Button 
            as={Link}
            href="/request?service=prescription"
            variant="bordered"
            size="lg"
            className="h-13 px-6 text-base"
            endContent={<ArrowRight className="h-4 w-4" />}
          >
            Renew your prescription
          </Button>
        </motion.div>

        {/* Single trust line -- replaces 6 scattered badges */}
        <motion.p
          className="text-sm text-muted-foreground mb-16 flex items-center justify-center gap-2"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span>{'AHPRA-registered GPs \u00b7 Refund if we can\'t help \u00b7 RACGP Standards 5th Edition'}</span>
        </motion.p>

        {/* Stat cards -- clean grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          {[
            { value: "100%", label: "GP reviewed", icon: CheckCircle2 },
            { value: "AHPRA", label: "Registered doctors", icon: Shield },
            { value: "4.9", label: "Patient rating", icon: Star, showStars: true },
            { value: "<1 hr", label: "Typical turnaround", icon: Clock },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-5 rounded-2xl bg-card border border-border/50"
            >
              <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              {stat.showStars && (
                <div className="flex justify-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
