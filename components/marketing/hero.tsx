'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Shield, Lock, DollarSign, Clock, ArrowRight, FileText, Stethoscope, CheckCircle, Pill, UserCheck, Star, Users } from 'lucide-react'
import { Button } from "@heroui/react"
import { RotatingText } from './rotating-text'
import { heroRotatingTexts, trustSignals } from '@/lib/marketing/homepage'
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion } from 'framer-motion'
import { HolographicCard, PulseGlow } from '@/components/ui/glowing-effect'
import { useState, useEffect } from 'react'

const iconMap = {
  Shield,
  Lock,
  DollarSign,
  Clock,
}

// Current Visitors Counter Component
function CurrentVisitorsPill() {
  const [count, setCount] = useState(12)

  useEffect(() => {
    const interval = setInterval(() => {
      const change = Math.random() > 0.5 ? 1 : -1
      setCount((prev) => Math.max(8, Math.min(25, prev + change)))
    }, 2000 + Math.random() * 2000) // Random interval between 2-4 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/50 text-xs font-medium text-emerald-700"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Users className="w-3 h-3" />
      <motion.span
        key={count}
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 4, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="inline-block min-w-[1.5ch] text-center"
      >
        {count}
      </motion.span>
      <span className="text-emerald-600/70">viewing now</span>
    </motion.div>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[60vh] flex items-center pt-12">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-12 pb-8 lg:pt-16 lg:pb-12">
        {/* Top indicators */}
        <motion.div 
          className="flex justify-center items-center gap-3 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DoctorAvailabilityPill />
          <CurrentVisitorsPill />
        </motion.div>
        
        <div className="flex flex-col items-center">
          {/* Content */}
          <div className="text-center max-w-3xl">
            {/* Badge */}
            <motion.div 
              className="mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 interactive-pill cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-sm font-medium text-foreground/80 spacing-premium">Australia&apos;s fastest online GP</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-3 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span>Your{' '}</span>
              <span className="text-premium-gradient">
                <RotatingText texts={heroRotatingTexts} />
              </span>
              <br className="hidden sm:block" />
              <span className="text-foreground/90"> — sorted in </span>
              <span className="text-premium-gradient font-bold">15 minutes</span>
              <span className="text-foreground/90">.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p 
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-5 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Med certs &amp; repeat scripts with no phone call required.
              New scripts just need a quick 2-min consult.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button 
                as={Link}
                href="/start"
                color="primary"
                size="lg"
                className="px-8 h-12 font-semibold magnetic-button shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all glow-pulse"
                endContent={<ArrowRight className="h-4 w-4" />}
              >
                Get started
              </Button>
              <Button 
                as={Link}
                href="#how-it-works"
                variant="bordered"
                size="lg"
                className="h-12 px-6"
              >
                See how it works
              </Button>
            </motion.div>

            {/* Trust row */}
            <motion.div 
              className="flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {trustSignals.slice(0, 3).map((signal) => {
                const Icon = iconMap[signal.icon as keyof typeof iconMap]
                return (
                  <div 
                    key={signal.text} 
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary/70" />
                    <span>{signal.text}</span>
                  </div>
                )
              })}
            </motion.div>
          </div>
        </div>

        {/* Floating overlay cards for CRO - positioned absolutely */}
        {/* Request Submitted Card - Top Left */}
        <motion.div 
          className="absolute top-8 left-4 lg:left-8 z-20 hidden md:block"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
          transition={{ 
            opacity: { duration: 0.6, delay: 0.4 },
            x: { duration: 0.6, delay: 0.4 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <HolographicCard borderRadius="1rem" intensity={0.6}>
            <div className="bg-white/98 backdrop-blur-md rounded-xl p-3.5 shadow-xl border border-white/30 hover:shadow-2xl transition-shadow cursor-default">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">Request submitted</p>
                  <p className="text-xs text-slate-500 mt-0.5">Just now</p>
                </div>
              </div>
            </div>
          </HolographicCard>
        </motion.div>
        
        {/* Doctor Reviews Card - Middle Right with Profile Image */}
        <motion.div 
          className="absolute top-1/2 right-4 lg:right-8 -translate-y-1/2 z-20 hidden md:block"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0, y: [0, -5, 0] }}
          transition={{ 
            opacity: { duration: 0.6, delay: 0.6 },
            x: { duration: 0.6, delay: 0.6 },
            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
          }}
        >
          <div className="bg-white/98 backdrop-blur-md rounded-xl p-3.5 shadow-xl border-2 border-blue-500/40 hover:border-blue-500/60 hover:shadow-2xl transition-all cursor-default group">
            <div className="flex items-center gap-3">
              {/* Doctor Profile Image */}
              <div className="relative h-11 w-11 rounded-full overflow-hidden ring-2 ring-blue-500/30 group-hover:ring-blue-500/50 flex-shrink-0 transition-all">
                <Image
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&q=80"
                  alt="AHPRA-registered doctor"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-slate-900 leading-tight">Doctor reviews</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                  <p className="text-xs text-slate-600 font-medium">4.9 rating</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Approved Card - Bottom Right */}
        <motion.div 
          className="absolute bottom-8 right-4 lg:right-8 z-20 hidden md:block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            opacity: { duration: 0.6, delay: 0.8 },
            y: { duration: 0.6, delay: 0.8 }
          }}
        >
          <PulseGlow color="#22c55e" duration={2} scale={1.03}>
            <motion.div 
              className="bg-white/98 backdrop-blur-md rounded-xl p-3.5 shadow-xl border-2 border-emerald-500 hover:shadow-2xl transition-all cursor-default"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-700 leading-tight">Approved ✓</p>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">12 min total</p>
                </div>
              </div>
            </motion.div>
          </PulseGlow>
        </motion.div>
      </div>
    </section>
  )
}
