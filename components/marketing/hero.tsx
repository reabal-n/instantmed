'use client'

import Link from 'next/link'
import { Shield, Lock, DollarSign, Clock, ArrowRight, Play, FileText, Stethoscope, CheckCircle, Pill } from 'lucide-react'
import { Button as HeroButton, Chip } from '@heroui/react'
import { RotatingText } from './rotating-text'
import { heroRotatingTexts, trustSignals } from '@/lib/marketing/homepage'
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'

const iconMap = {
  Shield,
  Lock,
  DollarSign,
  Clock,
}

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center pt-20">
      {/* Single subtle gradient - cleaner look */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] -translate-y-1/4 translate-x-1/4 opacity-60" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
        {/* Doctor Availability Pill - positioned at top */}
        <div className="mb-8">
          <DoctorAvailabilityPill />
        </div>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Badge - HeroUI Chip with hover effects */}
            <Chip 
              color="primary" 
              variant="flat" 
              size="lg"
              className="mb-8 animate-slide-up cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 hover:bg-primary/20 group px-4 py-2"
              startContent={
                <span className="relative flex h-2.5 w-2.5 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary group-hover:scale-110 transition-transform" />
                </span>
              }
            >
              <span className="group-hover:tracking-wide transition-all duration-300 font-medium">⚡ Australia&apos;s fastest online GP</span>
            </Chip>

            {/* Headline - Lora font with stable layout */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 animate-slide-up-delay-1">
              <span className="block sm:inline">Your{' '}</span>
              <span className="text-gradient">
                <RotatingText texts={heroRotatingTexts} />
              </span>
              <br className="hidden lg:block" />
              <span className="block sm:inline text-foreground/90"> — sorted in under an hour.</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed animate-slide-up-delay-2">
              Tell us what you need, a real GP reviews it, and you&apos;re done. 
              No appointments. No waiting rooms. No phone queues.
            </p>

            {/* CTAs - HeroUI Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10 animate-slide-up-delay-3">
              <HeroButton 
                as={Link}
                href="/start"
                color="primary"
                size="lg"
                className="px-8 h-12 text-sm font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                endContent={<ArrowRight className="h-4 w-4" />}
              >
                Get started free
              </HeroButton>
              <HeroButton 
                as={Link}
                href="#how-it-works"
                variant="light"
                size="lg"
                className="h-12 text-sm px-6 text-muted-foreground hover:text-foreground"
                startContent={<Play className="h-4 w-4" />}
              >
                See how it works
              </HeroButton>
            </div>

            {/* Trust row - minimal pills */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              {trustSignals.map((signal) => {
                const Icon = iconMap[signal.icon as keyof typeof iconMap]
                return (
                  <div key={signal.text} className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors">
                    <Icon className="h-3.5 w-3.5 text-primary/70" />
                    <span>{signal.text}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right side - Abstract illustration with floating cards */}
          <div className="relative hidden lg:block">
            {/* Main visual container */}
            <div className="relative">
              {/* Abstract background shape */}
              <div className="w-full aspect-square max-w-[500px] mx-auto relative">
                {/* Gradient circle background */}
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-indigo-100 via-violet-50 to-purple-100 dark:from-indigo-900/30 dark:via-violet-900/20 dark:to-purple-900/30" />
                
                {/* Floating cards */}
                {/* Card 1: Request submitted */}
                <div className="absolute top-8 left-0 glass-card rounded-2xl p-4 shadow-xl animate-float-slow hover:scale-105 transition-transform duration-300 cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center relative">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Request submitted</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                </div>
                
                {/* Card 2: Doctor reviewing */}
                <div className="absolute top-1/3 right-0 glass-card rounded-2xl p-4 shadow-xl animate-float-medium hover:scale-105 transition-transform duration-300 cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-violet-600 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">GP reviewing</p>
                      <p className="text-xs text-muted-foreground">Dr. Sarah M.</p>
                    </div>
                  </div>
                </div>
                
                {/* Card 3: Approved */}
                <div className="absolute bottom-12 left-8 glass-card rounded-2xl p-4 shadow-xl animate-float-fast border-2 border-green-200 hover:scale-105 hover:border-green-300 transition-all duration-300 cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-700">Approved ✓</p>
                      <p className="text-xs text-muted-foreground">42 min total</p>
                    </div>
                  </div>
                </div>
                
                {/* Center icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                    <Pill className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
