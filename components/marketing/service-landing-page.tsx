'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Shield,
  Clock,
  Zap,
  Lock,
  Check,
  X,
  MessageSquare,
  Building2,
  Pill,
  Smartphone,
  MapPin,
  EyeOff,
  Target,
  ClipboardList,
  Stethoscope,
  FileCheck,
  FileText,
  Scale,
  User,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MagneticCard, SpotlightReveal } from '@/components/ui/glowing-effect'
import type { ServiceConfig } from '@/lib/marketing/services'
import { MarketingNavbar } from './navbar'
import { MarketingFooter } from './footer'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Clock,
  Zap,
  Lock,
  Check,
  MessageSquare,
  Building2,
  Pill,
  Smartphone,
  MapPin,
  EyeOff,
  Target,
  ClipboardList,
  Stethoscope,
  FileCheck,
  FileText,
  Scale,
  User,
}

// Color mapping
const colorClasses = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    light: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'ring-emerald-500',
    iconBg: 'bg-emerald-100',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    light: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    button: 'bg-violet-600 hover:bg-violet-700',
    ring: 'ring-violet-500',
    iconBg: 'bg-violet-100',
  },
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-500',
    iconBg: 'bg-blue-100',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    button: 'bg-amber-600 hover:bg-amber-700',
    ring: 'ring-amber-500',
    iconBg: 'bg-amber-100',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600',
    light: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    button: 'bg-rose-600 hover:bg-rose-700',
    ring: 'ring-rose-500',
    iconBg: 'bg-rose-100',
  },
}

interface ServiceLandingPageProps {
  config: ServiceConfig
}

export function ServiceLandingPage({ config }: ServiceLandingPageProps) {
  const prefersReducedMotion = useReducedMotion()
  const colors = colorClasses[config.accentColor]
  const ServiceIcon = iconMap[config.icon] || FileText

  const fadeIn = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 },
      }

  const stagger = prefersReducedMotion
    ? {}
    : {
        initial: 'hidden',
        whileInView: 'visible',
        viewport: { once: true },
        variants: {
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.1 },
          },
        },
      }

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen bg-white">
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-white pt-24 pb-16 lg:pt-32 lg:pb-24">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={cn('absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3', colors.light, 'opacity-40')} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-slate-100 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 opacity-30" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <motion.div {...fadeIn} className="text-center lg:text-left">
              {/* Badge */}
              <div className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium mb-6', colors.light, colors.border, colors.text)}>
                <ServiceIcon className="h-4 w-4" />
                {config.shortName}
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                {config.heroTitle}
              </h1>

              {/* Subtext */}
              <p className="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                {config.heroSubtitle}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                <Button
                  asChild
                  size="lg"
                  className={cn('text-white px-8 h-12 text-base font-semibold rounded-xl shadow-lg transition-all', colors.button)}
                >
                  <Link href={config.flowSlug === 'medical-certificate' ? '/medical-certificate/request' : '/prescriptions/request'}>
                    Get started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 text-base rounded-xl border-slate-200 hover:bg-slate-50"
                >
                  <Link href="#how-it-works">
                    How it works
                  </Link>
                </Button>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield className={cn('h-4 w-4', colors.text)} />
                  <span>AHPRA-registered doctors</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Lock className={cn('h-4 w-4', colors.text)} />
                  <span>Secure & confidential</span>
                </div>
              </div>
            </motion.div>

            {/* Right side - Hero image */}
            <motion.div
              {...fadeIn}
              transition={{ delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <MagneticCard intensity={6} scale={1.02} borderRadius="1rem">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10">
                  <Image
                    src={config.heroImage}
                    alt={config.heroImageAlt}
                    width={600}
                    height={500}
                    className="w-full h-auto object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900/40 via-transparent to-transparent" />

                  {/* Price badge */}
                  <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                    <div className="text-sm text-slate-500">From</div>
                    <div className={cn('text-2xl font-bold', colors.text)}>
                      ${config.priceFrom.toFixed(2)}
                    </div>
                  </div>
                </div>
              </MagneticCard>

              {/* Decorative elements */}
              <div className={cn('absolute -top-4 -right-4 w-24 h-24 rounded-2xl -z-10', colors.light)} />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-slate-100 rounded-2xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Proof Strip */}
      <section className={cn('py-8 border-y', colors.light, colors.border)}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
            {config.proofMetrics.map((metric, i) => {
              const MetricIcon = iconMap[metric.icon] || Zap
              return (
                <div key={i} className="flex items-center gap-3">
                  <MetricIcon className={cn('h-5 w-5', colors.text)} />
                  <div>
                    <div className="text-sm text-slate-500">{metric.label}</div>
                    <div className="font-semibold text-slate-900">{metric.value}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              How it works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Three simple steps to get the care you need
            </p>
          </motion.div>

          <motion.div {...stagger} className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {config.steps.map((step, i) => {
              const StepIcon = iconMap[step.icon] || ClipboardList
              return (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  className="relative"
                >
                  {/* Connector line */}
                  {i < config.steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-slate-200" />
                  )}

                  <SpotlightReveal color={colors.text.replace('text-', '#').replace('-600', '')} size={350} borderRadius="1rem">
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-800 hover:border-transparent hover:shadow-xl transition-all duration-300">
                      {/* Step number */}
                      <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg', colors.button)}>
                        {step.step}
                      </div>

                      {/* Icon */}
                      <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4', colors.iconBg)}>
                        <StepIcon className={cn('h-8 w-8', colors.text)} />
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        {step.description}
                      </p>
                    </div>
                  </SpotlightReveal>
                </motion.div>
              )
            })}
          </motion.div>

          <motion.div {...fadeIn} className="text-center mt-12">
            <Button
              asChild
              size="lg"
              className={cn('text-white px-8 h-12 text-base font-semibold rounded-xl', colors.button)}
            >
              <Link href={config.flowSlug === 'medical-certificate' ? '/medical-certificate/request' : '/prescriptions/request'}>
                Start now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {config.eligibilityTitle}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {config.eligibilityDescription}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Eligible */}
            <motion.div {...fadeIn} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', colors.iconBg)}>
                  <Check className={cn('h-5 w-5', colors.text)} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">We can help with</h3>
              </div>
              <ul className="space-y-3">
                {config.eligibleFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className={cn('h-5 w-5 shrink-0 mt-0.5', colors.text)} />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Not eligible */}
            <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <X className="h-5 w-5 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Not suitable for</h3>
              </div>
              <ul className="space-y-3">
                {config.notEligibleFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Transparent pricing
            </h2>
            <p className="text-lg text-slate-600 mb-10">
              {config.pricingNote}
            </p>

            <div className={cn('rounded-2xl p-8 lg:p-10 border-2', colors.border, colors.light)}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-slate-500">From</span>
                <span className={cn('text-5xl font-bold', colors.text)}>
                  ${config.priceFrom.toFixed(2)}
                </span>
              </div>
              <p className="text-slate-600 mb-8">
                per consultation
              </p>

              <ul className="text-left max-w-md mx-auto space-y-3 mb-8">
                {config.pricingFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className={cn('h-5 w-5 shrink-0', colors.text)} />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                className={cn('text-white px-10 h-12 text-base font-semibold rounded-xl', colors.button)}
              >
                <Link href={config.flowSlug === 'medical-certificate' ? '/medical-certificate/request' : '/prescriptions/request'}>
                  Get started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-slate-600">
              Everything you need to know about {config.name.toLowerCase()}
            </p>
          </motion.div>

          <motion.div {...fadeIn} className="max-w-3xl mx-auto space-y-4">
            {config.faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} accentColor={config.accentColor} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={cn('py-20 lg:py-28 bg-linear-to-r', colors.gradient)}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeIn}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Complete the questionnaire in just a few minutes, and a doctor will review your request.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 px-10 h-14 text-lg font-semibold rounded-xl shadow-lg"
            >
              <Link href={config.flowSlug === 'medical-certificate' ? '/medical-certificate/request' : '/prescriptions/request'}>
                Start your request
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="mt-6 text-white/70 text-sm">
              Takes about 2-3 minutes • No obligation to continue
            </p>
          </motion.div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}

// FAQ Accordion Item
function FAQItem({
  question,
  answer,
  accentColor,
}: {
  question: string
  answer: string
  accentColor: ServiceConfig['accentColor']
}) {
  const [isOpen, setIsOpen] = useState(false)
  const colors = colorClasses[accentColor]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-900 pr-4">{question}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-slate-400 shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-5">
          <p className="text-slate-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}
