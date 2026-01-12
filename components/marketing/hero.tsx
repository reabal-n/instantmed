'use client'

import Link from 'next/link'
import { Clock, ArrowRight, CheckCircle2, Users, Star, Zap } from 'lucide-react'
import { Button } from "@heroui/react"
import { RotatingText } from './rotating-text'
import { heroRotatingTexts } from '@/lib/marketing/homepage'
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion } from 'framer-motion'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top indicator */}
        <motion.div 
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DoctorAvailabilityPill />
        </motion.div>

        {/* Main content */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-sm font-medium text-foreground/80">Online GP consultations</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span>Your{' '}</span>
            <span className="text-premium-gradient">
              <RotatingText texts={heroRotatingTexts} />
            </span>
            <br />
            <span className="text-foreground/90">sorted in </span>
            <span className="text-premium-gradient">under 30 mins</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p 
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Medical certificates and repeat prescriptions reviewed by Australian-registered doctors. Most requests sorted without a phone call.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button 
              as={Link}
              href="/start"
              color="primary"
              size="lg"
              className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
              endContent={<ArrowRight className="h-4 w-4" />}
            >
              Get started
            </Button>
            <Button 
              as={Link}
              href="#how-it-works"
              variant="bordered"
              size="lg"
              className="h-12 px-8"
            >
              See how it works
            </Button>
          </motion.div>

          {/* Trust signals - cleaner row */}
          <motion.div 
            className="flex flex-wrap justify-center gap-6 sm:gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {[
              { icon: Clock, text: "Under 30 min review" },
              { icon: CheckCircle2, text: "7 days a week" },
              { icon: Users, text: "AHPRA registered doctors" },
            ].map((signal) => (
              <div 
                key={signal.text} 
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <signal.icon className="h-4 w-4 text-primary/70" />
                <span>{signal.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Social proof stats - below hero */}
        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {[
            { value: "10,000+", label: "Patients helped", icon: Users },
            { value: "4.9", label: "Average rating", icon: Star, showStars: true },
            { value: "12 min", label: "Avg. response", icon: Zap },
            { value: "98%", label: "Employer acceptance", icon: CheckCircle2 },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -2 }}
              className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm"
            >
              <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
              {stat.showStars && (
                <div className="flex justify-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
