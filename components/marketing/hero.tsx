'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Shield, Lock, DollarSign, Clock, ArrowRight, FileText, CheckCircle, UserCheck, Star } from 'lucide-react'
import { Button } from "@heroui/react"
import { RotatingText } from './rotating-text'
import { heroRotatingTexts, trustSignals } from '@/lib/marketing/homepage'
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion } from 'framer-motion'
import { HolographicCard, PulseGlow } from '@/components/ui/glowing-effect'

const iconMap = {
  Shield,
  Lock,
  DollarSign,
  Clock,
}

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[60vh] flex items-center pt-8 sm:pt-12">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20">
        {/* Top indicator - Combined pill */}
        <motion.div 
          className="flex justify-center mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DoctorAvailabilityPill />
        </motion.div>
        
        {/* Main content container with padding for floating elements */}
        <div className="relative flex flex-col items-center px-0 sm:px-8 lg:px-16">
          {/* Content */}
          <div className="text-center max-w-3xl w-full relative z-10">
            {/* Badge */}
            <motion.div 
              className="mb-4 sm:mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/5 border border-primary/10 interactive-pill cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs sm:text-sm font-medium text-foreground/80 spacing-premium">Australia&apos;s fastest online GP</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 sm:mb-5 leading-tight px-2"
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
              className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Med certs &amp; repeat requests with no phone call required.
              New requests just need a quick 2-min consult.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center mb-6 sm:mb-8 px-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button 
                as={Link}
                href="/start"
                color="primary"
                size="lg"
                className="px-6 sm:px-8 h-11 sm:h-12 font-semibold magnetic-button shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all glow-pulse w-full sm:w-auto"
                endContent={<ArrowRight className="h-4 w-4" />}
              >
                Get started
              </Button>
              <Button 
                as={Link}
                href="#how-it-works"
                variant="bordered"
                size="lg"
                className="h-11 sm:h-12 px-6 w-full sm:w-auto"
              >
                See how it works
              </Button>
            </motion.div>

            {/* Trust row */}
            <motion.div 
              className="flex flex-wrap justify-center gap-3 sm:gap-4 px-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {trustSignals.slice(0, 3).map((signal) => {
                const Icon = iconMap[signal.icon as keyof typeof iconMap]
                return (
                  <div 
                    key={signal.text} 
                    className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/70" />
                    <span>{signal.text}</span>
                  </div>
                )
              })}
            </motion.div>
          </div>

          {/* Floating overlay cards for CRO - Better positioned to avoid text overlap */}
          {/* Request Submitted Card - Top Left - Only on larger screens */}
          <motion.div 
            className="absolute top-4 left-0 lg:left-4 xl:left-8 z-20 hidden lg:block"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
            transition={{ 
              opacity: { duration: 0.6, delay: 0.4 },
              x: { duration: 0.6, delay: 0.4 },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <HolographicCard borderRadius="1rem" intensity={0.6}>
              <div className="bg-white/85 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_30px_rgb(59,130,246,0.2)] border border-white/50 dark:border-white/15 hover:shadow-[0_12px_40px_rgb(59,130,246,0.25)] transition-all duration-300 cursor-default">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_4px_15px_rgb(59,130,246,0.2)]">
                    <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">Request submitted</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Just now</p>
                  </div>
                </div>
              </div>
            </HolographicCard>
          </motion.div>
          
          {/* Doctor Reviews Card - Top Right - Better positioned */}
          <motion.div 
            className="absolute top-4 right-0 lg:right-4 xl:right-8 z-20 hidden lg:block"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, y: [0, -5, 0] }}
            transition={{ 
              opacity: { duration: 0.6, delay: 0.6 },
              x: { duration: 0.6, delay: 0.6 },
              y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
            }}
          >
            <div className="bg-white/85 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_30px_rgb(59,130,246,0.2)] border border-white/50 dark:border-white/15 hover:shadow-[0_12px_40px_rgb(59,130,246,0.3)] transition-all duration-300 cursor-default group">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Doctor Profile Image */}
                <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full overflow-hidden ring-2 ring-primary/30 group-hover:ring-primary/60 group-hover:shadow-[0_0_20px_rgb(59,130,246,0.3)] flex-shrink-0 transition-all duration-300">
                  <Image
                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&q=80"
                    alt="AHPRA-registered doctor"
                    width={44}
                    height={44}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_10px_rgb(34,197,94,0.4)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
                    <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary flex-shrink-0" />
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">Doctor reviews</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">4.9 rating</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Approved Card - Bottom Center - Better positioned */}
          <motion.div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:bottom-8 lg:right-4 xl:right-8 z-20 hidden lg:block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              opacity: { duration: 0.6, delay: 0.8 },
              y: { duration: 0.6, delay: 0.8 }
            }}
          >
            <PulseGlow color="#22c55e" duration={2} scale={1.03}>
              <motion.div 
                className="bg-white/85 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_30px_rgb(34,197,94,0.25)] border border-emerald-400/50 dark:border-emerald-500/30 hover:shadow-[0_12px_40px_rgb(34,197,94,0.35)] transition-all duration-300 cursor-default"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 flex items-center justify-center flex-shrink-0 shadow-[0_4px_15px_rgb(34,197,94,0.2)]">
                    <CheckCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 leading-tight">Approved ✓</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">12 min total</p>
                  </div>
                </div>
              </motion.div>
            </PulseGlow>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
