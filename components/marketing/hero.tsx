'use client'

import Link from 'next/link'
import { Shield, Lock, DollarSign, Clock, ArrowRight, FileText, Stethoscope, CheckCircle, Pill } from 'lucide-react'
import { Button } from "@heroui/react"
import { RotatingText } from './rotating-text'
import { heroRotatingTexts, trustSignals } from '@/lib/marketing/homepage'
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { motion } from 'framer-motion'
import { GlowingBorder } from '@/components/ui/glowing-effect'

const iconMap = {
  Shield,
  Lock,
  DollarSign,
  Clock,
}

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[85vh] flex items-center pt-16">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-20">
        {/* Top indicator */}
        <motion.div 
          className="flex justify-center lg:justify-start mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DoctorAvailabilityPill />
        </motion.div>
        
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 interactive-pill cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-sm font-medium text-foreground/80">Australia&apos;s fastest online GP</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span>Your{' '}</span>
              <span className="text-primary">
                <RotatingText texts={heroRotatingTexts} />
              </span>
              <br className="hidden sm:block" />
              <span className="text-foreground/90"> — sorted in </span>
              <span className="text-primary font-bold">15 minutes</span>
              <span className="text-foreground/90">.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p 
              className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Med certs &amp; repeat scripts with no phone call required.
              New scripts just need a quick 2-min consult.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8"
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
              className="flex flex-wrap justify-center lg:justify-start gap-4"
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

          {/* Right side - Visual */}
          <motion.div 
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative w-full aspect-square max-w-[480px] mx-auto">
              {/* Background gradient */}
              <div className="absolute inset-12 rounded-full bg-linear-to-br from-primary/10 via-secondary/5 to-primary/10" />
              
              {/* Floating cards */}
              <motion.div 
                className="absolute top-8 left-0"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <GlowingBorder>
                  <div className="bg-content1 rounded-2xl p-4 shadow-xl border border-divider">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Request submitted</p>
                        <p className="text-xs text-muted-foreground">Just now</p>
                      </div>
                    </div>
                  </div>
                </GlowingBorder>
              </motion.div>
              
              <motion.div 
                className="absolute top-1/3 right-0"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <GlowingBorder>
                  <div className="bg-content1 rounded-2xl p-4 shadow-xl border border-divider">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">GP reviewing</p>
                        <p className="text-xs text-muted-foreground">Dr. Sarah M.</p>
                      </div>
                    </div>
                  </div>
                </GlowingBorder>
              </motion.div>
              
              <motion.div 
                className="absolute bottom-12 left-8"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <GlowingBorder>
                  <div className="bg-content1 rounded-2xl p-4 shadow-xl border-2 border-success">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-success">Approved ✓</p>
                        <p className="text-xs text-muted-foreground">12 min total</p>
                      </div>
                    </div>
                  </div>
                </GlowingBorder>
              </motion.div>
              
              {/* Center icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/30">
                  <Pill className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
