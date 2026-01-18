'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowRight, CheckCircle2, Users, Star, Zap, Shield } from 'lucide-react'
import { Button } from "@heroui/react"
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { ReassuranceStrip } from '@/components/shared/reassurance-strip'
import { motion } from 'framer-motion'

// Friendly, approachable doctor images from Unsplash
const doctorImages = {
  primary: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=500&fit=crop&crop=face", // Friendly female doctor
  secondary: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop&crop=face", // Male doctor
}

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

        {/* Main content with optional doctor image on large screens */}
        <div className="relative">
          {/* Floating doctor image - desktop only */}
          <motion.div
            className="hidden xl:block absolute -right-8 top-1/2 -translate-y-1/2 z-10"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="relative">
              {/* Main doctor image */}
              <div className="relative w-64 h-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 dark:border-slate-800/80">
                <Image
                  src={doctorImages.primary}
                  alt="Australian GP ready to help"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              
              {/* Floating badge */}
              <motion.div
                className="absolute -bottom-4 -left-6 bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xl border border-border/50"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">AHPRA Verified</p>
                    <p className="text-[10px] text-muted-foreground">Australian GP</p>
                  </div>
                </div>
              </motion.div>
              
              {/* Small secondary image */}
              <motion.div
                className="absolute -top-4 -left-8 w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-800 rotate-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.1 }}
              >
                <Image
                  src={doctorImages.secondary}
                  alt="Doctor"
                  fill
                  className="object-cover"
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Text content */}
          <div className="text-center max-w-4xl mx-auto xl:max-w-2xl xl:mr-auto xl:ml-0 xl:text-left">
          {/* Badge - Clear scope statement */}
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground/90">Medical certificates & repeat scripts — reviewed by Australian GPs</span>
            </div>
          </motion.div>

          {/* Headline - Static, clear value prop */}
          <motion.h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="text-foreground">Doctor-reviewed documents.</span>
            <br />
            <span className="text-premium-gradient">Delivered in under an hour.</span>
          </motion.h1>
          
          {/* Authority marker - immediately below headline */}
          <motion.p
            className="text-sm text-muted-foreground mb-4 flex items-center gap-2 justify-center xl:justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Every request reviewed by an AHPRA-registered GP</span>
          </motion.p>

          {/* Subtext - Outcome-focused */}
          <motion.p 
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto xl:mx-0 mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Need a medical certificate for work? Or a repeat script sent to your phone? Complete a 2-minute form and a doctor reviews it — no phone call needed for most requests.
          </motion.p>

          {/* CTAs - Intent-specific */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center xl:justify-start mb-10"
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
              Start your request
            </Button>
            <Button 
              as={Link}
              href="/start?service=repeat-script"
              variant="bordered"
              size="lg"
              className="h-12 px-6"
              endContent={<ArrowRight className="h-4 w-4" />}
            >
              Request a repeat script
            </Button>
          </motion.div>

          {/* Friction-reduction reassurance - addresses silent objections */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <ReassuranceStrip 
              showItems={['no-account', 'no-call', 'refund']} 
              className="justify-center xl:justify-start"
            />
          </motion.div>

          {/* Trust signals - outcome-focused row */}
          <motion.div 
            className="flex flex-wrap justify-center xl:justify-start gap-6 sm:gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {[
              { icon: Clock, text: "Most done in under 1 hour" },
              { icon: CheckCircle2, text: "AHPRA-registered doctors" },
              { icon: Shield, text: "RACGP-aligned protocols" },
            ].map((signal) => (
              <div 
                key={signal.text} 
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <signal.icon className="h-3.5 w-3.5 text-primary" />
                <span>{signal.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
        </div>

        {/* Social proof stats - below hero */}
        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {[
            { value: "4.9", label: "Average rating", icon: Star, showStars: true },
            { value: "<30 min", label: "Typical response", icon: Zap },
            { value: "7 days", label: "A week availability", icon: Users },
            { value: "AHPRA", label: "Registered doctors", icon: CheckCircle2 },
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
