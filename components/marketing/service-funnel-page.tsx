'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Shield,
  Clock,
  Lock,
  Check,
  Phone,
  Mail,
  RefreshCw,
  BadgeCheck,
  Building2,
  Users,
  Star,
  FileText,
  Pill,
  Stethoscope,
  ClipboardList,
  FileCheck,
  MessageCircle,
  AlertCircle,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/shared/navbar'
import { MarketingFooter } from './footer'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Clock, Lock, Check, Building2, Users, Star, FileText, Pill,
  Stethoscope, ClipboardList, FileCheck, MessageCircle, AlertCircle,
  Phone, Mail, RefreshCw, BadgeCheck, HelpCircle, Sparkles,
}

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface ServiceFunnelConfig {
  // Core
  serviceId: 'med-cert' | 'repeat-script' | 'consult'
  serviceName: string
  serviceSlug: string
  
  // Hero Section
  hero: {
    badge: string
    headline: string
    subheadline: string
    reassurances: string[]
    ctaText: string
    ctaHref: string
  }
  
  // Who It's For Section (4 cards)
  whoItsFor: {
    title: string
    subtitle: string
    cards: Array<{
      icon: string
      title: string
      description: string
      type: 'positive' | 'negative' | 'info'
    }>
  }
  
  // How It Works (3 steps)
  howItWorks: {
    title: string
    subtitle: string
    steps: Array<{
      number: string
      icon: string
      title: string
      description: string
      time?: string
    }>
  }
  
  // What Happens After
  afterSubmit: {
    title: string
    subtitle: string
    items: Array<{
      icon: string
      title: string
      description: string
    }>
  }
  
  // Pricing
  pricing: {
    title: string
    subtitle: string
    price: number
    originalPrice?: number
    features: string[]
    refundNote: string
    medicareNote: string
  }
  
  // Trust Section
  trust: {
    title: string
    badges: Array<{
      icon: string
      title: string
      description: string
    }>
  }
  
  // Testimonials
  testimonials: {
    title: string
    subtitle: string
    reviews: Array<{
      text: string
      author: string
      location: string
      rating: number
    }>
  }
  
  // Final CTA
  finalCta: {
    headline: string
    subheadline: string
    ctaText: string
  }
  
  // Styling
  accentColor: 'emerald' | 'blue' | 'violet'
}

const colorClasses = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    light: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'ring-emerald-500/20',
  },
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    light: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-500/20',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    light: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    button: 'bg-violet-600 hover:bg-violet-700',
    ring: 'ring-violet-500/20',
  },
}

// ===========================================
// MAIN COMPONENT
// ===========================================

interface ServiceFunnelPageProps {
  config: ServiceFunnelConfig
}

export function ServiceFunnelPage({ config }: ServiceFunnelPageProps) {
  const colors = colorClasses[config.accentColor]

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="marketing" />

      {/* Section 1: Hero */}
      <HeroSection config={config} colors={colors} />
      
      {/* Section 2: Who It's For */}
      <WhoItsForSection config={config} colors={colors} />
      
      {/* Section 3: How It Works */}
      <HowItWorksSection config={config} colors={colors} />
      
      {/* Section 4: What Happens After */}
      <AfterSubmitSection config={config} colors={colors} />
      
      {/* Section 5: Pricing */}
      <PricingSection config={config} colors={colors} />
      
      {/* Section 6: Trust & Compliance */}
      <TrustSection config={config} colors={colors} />
      
      {/* Section 7: Social Proof */}
      <TestimonialsSection config={config} colors={colors} />
      
      {/* Final CTA */}
      <FinalCtaSection config={config} colors={colors} />

      <MarketingFooter />
    </div>
  )
}

// ===========================================
// SECTION COMPONENTS
// ===========================================

function HeroSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  return (
    <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />
      <div className={cn('absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-30', colors.light)} />
      
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium', colors.light, colors.text, colors.border, 'border')}>
            <Sparkles className="w-4 h-4" />
            {config.hero.badge}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]"
        >
          {config.hero.headline}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          {config.hero.subheadline}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-10"
        >
          <Button
            as={Link}
            href={config.hero.ctaHref}
            size="lg"
            className={cn('px-8 h-14 text-lg font-semibold text-white shadow-lg', colors.button)}
          >
            {config.hero.ctaText}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>

        {/* Reassurances */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-x-6 gap-y-3"
        >
          {config.hero.reassurances.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className={cn('h-4 w-4', colors.text)} />
              <span>{item}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function WhoItsForSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.whoItsFor.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {config.whoItsFor.subtitle}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {config.whoItsFor.cards.map((card, i) => {
            const Icon = iconMap[card.icon] || HelpCircle
            const isPositive = card.type === 'positive'
            const isNegative = card.type === 'negative'
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={cn(
                  'rounded-2xl p-6 border transition-all hover:shadow-lg',
                  isPositive && 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
                  isNegative && 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
                  !isPositive && !isNegative && 'bg-card border-border'
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                  isPositive && 'bg-emerald-100 dark:bg-emerald-900/50',
                  isNegative && 'bg-rose-100 dark:bg-rose-900/50',
                  !isPositive && !isNegative && colors.light
                )}>
                  <Icon className={cn(
                    'w-6 h-6',
                    isPositive && 'text-emerald-600 dark:text-emerald-400',
                    isNegative && 'text-rose-600 dark:text-rose-400',
                    !isPositive && !isNegative && colors.text
                  )} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  return (
    <section id="how-it-works" className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.howItWorks.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {config.howItWorks.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {config.howItWorks.steps.map((step, i) => {
            const Icon = iconMap[step.icon] || ClipboardList
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                {/* Connector line */}
                {i < config.howItWorks.steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
                )}
                
                <div className="relative bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all text-center">
                  {/* Step number */}
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold', colors.button)}>
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4', colors.light)}>
                    <Icon className={cn('h-7 w-7', colors.text)} />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                  
                  {step.time && (
                    <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium', colors.light, colors.text)}>
                      <Clock className="w-3 h-3" />
                      {step.time}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button
            as={Link}
            href={config.hero.ctaHref}
            size="lg"
            className={cn('px-8 h-12 font-semibold text-white', colors.button)}
          >
            Get started now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

function AfterSubmitSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.afterSubmit.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {config.afterSubmit.subtitle}
          </p>
        </motion.div>

        <div className="space-y-4">
          {config.afterSubmit.items.map((item, i) => {
            const Icon = iconMap[item.icon] || Check
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex gap-4 p-5 bg-card rounded-xl border border-border"
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', colors.light)}>
                  <Icon className={cn('w-5 h-5', colors.text)} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PricingSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  return (
    <section id="pricing" className="py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.pricing.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {config.pricing.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn('rounded-2xl p-8 lg:p-10 border-2 text-center', colors.light, colors.border)}
        >
          {/* Price */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className={cn('text-5xl font-bold', colors.text)}>
                ${config.pricing.price.toFixed(2)}
              </span>
              {config.pricing.originalPrice && (
                <span className="text-2xl text-muted-foreground line-through">
                  ${config.pricing.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">One-time fee</p>
          </div>

          {/* Features */}
          <ul className="text-left max-w-md mx-auto space-y-3 mb-8">
            {config.pricing.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <Check className={cn('h-5 w-5 shrink-0', colors.text)} />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button
            as={Link}
            href={config.hero.ctaHref}
            size="lg"
            className={cn('w-full sm:w-auto px-10 h-12 text-base font-semibold text-white', colors.button)}
          >
            Get started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          {/* Notes */}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {config.pricing.refundNote}
            </p>
            <p className="flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {config.pricing.medicareNote}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function TrustSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.trust.title}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {config.trust.badges.map((badge, i) => {
            const Icon = iconMap[badge.icon] || Shield
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center p-6 bg-card rounded-xl border border-border"
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4', colors.light)}>
                  <Icon className={cn('w-6 h-6', colors.text)} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{badge.title}</h3>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection({ config, colors: _colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.testimonials.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {config.testimonials.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {config.testimonials.reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 border border-border"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              
              {/* Quote */}
              <p className="text-foreground mb-4 leading-relaxed">&ldquo;{review.text}&rdquo;</p>
              
              {/* Author */}
              <div className="text-sm">
                <span className="font-medium text-foreground">{review.author}</span>
                <span className="text-muted-foreground"> · {review.location}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCtaSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  return (
    <section className={cn('py-16 lg:py-24 bg-gradient-to-br', colors.gradient)}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {config.finalCta.headline}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {config.finalCta.subheadline}
          </p>
          <Button
            as={Link}
            href={config.hero.ctaHref}
            size="lg"
            className="bg-white text-foreground hover:bg-white/90 px-10 h-14 text-lg font-semibold shadow-lg"
          >
            {config.finalCta.ctaText}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-6 text-white/70 text-sm">
            Takes about 2 minutes · No obligation
          </p>
        </motion.div>
      </div>
    </section>
  )
}
