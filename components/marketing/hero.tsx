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
            {/* Badge - HeroUI Chip */}
            <Chip 
              color="primary" 
              variant="flat" 
              className="mb-8 animate-slide-up"
              startContent={
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              }
            >
              ⚡ Australia&apos;s fastest online GP
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-slide-up-delay-3">
              <HeroButton 
                as={Link}
                href="/start"
                color="primary"
                size="lg"
                className="px-10 h-14 text-base font-semibold"
                endContent={<ArrowRight className="h-5 w-5" />}
              >
                Start in 60 seconds
              </HeroButton>
              <HeroButton 
                as={Link}
                href="#how-it-works"
                variant="bordered"
                size="lg"
                className="h-14 text-base px-8"
                startContent={<Play className="h-4 w-4" />}
              >
                How it works
              </HeroButton>
            </div>

            {/* Trust row - glass pills */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              {trustSignals.map((signal) => {
                const Icon = iconMap[signal.icon as keyof typeof iconMap]
                return (
                  <div key={signal.text} className="glass-card flex items-center gap-2 text-sm px-4 py-2 rounded-full">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-foreground/80">{signal.text}</span>
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
                <div className="absolute top-8 left-0 glass-card rounded-2xl p-4 shadow-xl animate-float-slow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Request submitted</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                </div>
                
                {/* Card 2: Doctor reviewing */}
                <div className="absolute top-1/3 right-0 glass-card rounded-2xl p-4 shadow-xl animate-float-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">GP reviewing</p>
                      <p className="text-xs text-muted-foreground">Dr. Sarah M.</p>
                    </div>
                  </div>
                </div>
                
                {/* Card 3: Approved */}
                <div className="absolute bottom-12 left-8 glass-card rounded-2xl p-4 shadow-xl animate-float-fast border-2 border-green-200">
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
