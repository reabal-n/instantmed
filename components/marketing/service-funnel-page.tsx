'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/shared/navbar'
import { MarketingFooter } from './footer'
import { EmergencyDisclaimer } from '@/components/shared/emergency-disclaimer'
import { RotatingText } from './rotating-text'
import { LiveWaitTime } from './live-wait-time'
import { StatsStrip } from './total-patients-counter'
import { MediaMentions } from './media-mentions'
import { DoctorAvailabilityPill } from '@/components/shared/doctor-availability-pill'
import { TrustBadgeSlider } from './trust-badge-slider'
import { PricingSection as StandalonePricingSection } from '@/components/marketing/sections/pricing-section'
import { TestimonialsSection } from '@/components/marketing/sections/testimonials-section'
import { getTestimonialsByService, getTestimonialsForColumns } from '@/lib/data/testimonials'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { CheckCircle2 } from 'lucide-react'
import { MarketingPageShell } from '@/components/shared/marketing-page-shell'
import { ImageTextSplit } from '@/components/sections'
import { CONTACT_EMAIL } from '@/lib/constants'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Clock, Lock, Check, Building2, Users, Star, FileText, Pill,
  Stethoscope, ClipboardList, FileCheck, MessageCircle, AlertCircle,
  Phone, Mail, RefreshCw, BadgeCheck, HelpCircle, Sparkles, CheckCircle2,
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
    headlineRotatingWords?: string[]
    subheadline: string
    reassurances: string[]
    ctaText: string
    ctaHref: string
    // Optional hero images
    images?: {
      primary: string
      secondary?: string
    }
    // Subtle highlight badge (e.g., "no phone needed")
    highlightBadge?: {
      text: string
      glow?: boolean
    }
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

  // FAQ (optional — if provided, rendered as accordion)
  faq?: {
    title: string
    subtitle: string
    items: Array<{
      question: string
      answer: string
    }>
  }

  // Optional daily live stats for hero section
  liveStats?: {
    reviewedToday: number
    avgReviewTime: number
  }

  // Optional mid-page image + text section (rendered between After Submit and Pricing)
  imageSection?: {
    title: string
    highlightWords?: string[]
    description: string
    imageSrc: string
    imageAlt: string
    imagePosition?: 'left' | 'right'
    badges?: Array<{
      icon: string
      text: string
      color?: 'success' | 'primary'
    }>
  }

  // Specialized services (optional — grid of service cards, e.g. consult sub-types)
  specializedServices?: {
    title: string
    subtitle: string
    services: Array<{
      icon: string
      title: string
      description: string
      price: string
      href: string
    }>
  }

  // Final CTA
  finalCta: {
    headline: string
    subheadline: string
    ctaText: string
  }
  
  // Styling
  accentColor: 'emerald' | 'blue' | 'sky'
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
    gradient: 'from-blue-500 to-sky-600',
    light: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-500/20',
  },
  sky: {
    gradient: 'from-sky-500 to-blue-600',
    light: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800',
    button: 'bg-sky-600 hover:bg-sky-700',
    ring: 'ring-sky-500/20',
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

  // Get testimonials for scrolling columns (filtered by service)
  const serviceFilter = config.serviceId === 'med-cert' ? 'medical-certificate' as const : config.serviceId === 'repeat-script' ? 'prescription' as const : 'consultation' as const
  const serviceTestimonials = getTestimonialsByService(serviceFilter)
  const columnsData = serviceTestimonials.slice(0, 9).map(t => ({
    text: t.text,
    image: t.image || `https://api.dicebear.com/7.x/notionists/svg?seed=${t.name.replace(/\s/g, '')}`,
    name: `${t.name}${t.age ? `, ${t.age}` : ''}`,
    role: `${t.location}${t.role ? ` · ${t.role}` : ''}`,
  }))
  // Fallback to generic testimonials if service-specific ones are thin
  const testimonialsForColumns = columnsData.length >= 6 ? columnsData : getTestimonialsForColumns().slice(0, 9)

  return (
    <MarketingPageShell>
    <div className="min-h-screen overflow-x-hidden">

      {/* Returning patient recognition */}
      <ReturningPatientBanner className="mx-4 mt-2" />

      <Navbar variant="marketing" />

      {/* Section 1: Hero */}
      <HeroSection config={config} colors={colors} />

      {/* Live wait time strip — right below hero like homepage */}
      <LiveWaitTime variant="strip" services={[config.serviceId === 'repeat-script' ? 'scripts' : config.serviceId === 'consult' ? 'consult' : 'med-cert']} />

      {/* Trust badge slider */}
      <TrustBadgeSlider />

      {/* Section 2: Who It's For */}
      <WhoItsForSection config={config} colors={colors} />

      {/* Specialized Services (optional — e.g. consult sub-types) */}
      {config.specializedServices && (
        <SpecializedServicesSection config={config} colors={colors} />
      )}

      {/* Section 3: How It Works */}
      <HowItWorksSection config={config} colors={colors} />

      {/* Section 4: What Happens After */}
      <AfterSubmitSection config={config} colors={colors} />

      {/* Optional: Image + Text Section */}
      {config.imageSection && (
        <ImageTextSplit
          title={config.imageSection.title}
          highlightWords={config.imageSection.highlightWords}
          description={config.imageSection.description}
          imageSrc={config.imageSection.imageSrc}
          imageAlt={config.imageSection.imageAlt}
          imagePosition={config.imageSection.imagePosition}
        >
          {config.imageSection.badges && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {config.imageSection.badges.map((badge) => {
                const BadgeIcon = iconMap[badge.icon] || CheckCircle2
                return (
                  <span key={badge.text} className="flex items-center gap-1.5">
                    <BadgeIcon className={cn('w-4 h-4', badge.color === 'success' ? 'text-success' : 'text-primary')} />
                    {badge.text}
                  </span>
                )
              })}
            </div>
          )}
        </ImageTextSplit>
      )}

      {/* Section 5: Pricing */}
      <StandalonePricingSection
        title={config.pricing.title}
        subtitle={config.pricing.subtitle}
        price={config.pricing.price}
        originalPrice={config.pricing.originalPrice}
        features={config.pricing.features}
        refundNote={config.pricing.refundNote}
        medicareNote={config.pricing.medicareNote}
        ctaText={config.hero.ctaText}
        ctaHref={config.hero.ctaHref}
        colors={colors}
        showComparisonTable={config.serviceId === 'med-cert'}
      />

      {/* Section 6: Trust & Compliance */}
      <TrustSection config={config} colors={colors} />

      {/* Emergency Disclaimer */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <EmergencyDisclaimer />
        </div>
      </section>

      {/* Section 7: Social Proof — scrolling columns like homepage */}
      <TestimonialsSection
        testimonials={testimonialsForColumns}
        title={config.testimonials.title}
        subtitle={config.testimonials.subtitle}
        badgeText="Patient Feedback"
      />

      {/* Stats + Media Mentions */}
      <StatsStrip className="bg-card/30 dark:bg-white/[0.02] backdrop-blur-xs border-y border-border/30" />
      <MediaMentions variant="strip" className="bg-card/20 dark:bg-white/[0.01] backdrop-blur-xs" />

      {/* Section 8: FAQ */}
      {config.faq && (
        <FaqSection config={config} />
      )}

      {/* Final CTA */}
      <FinalCtaSection config={config} colors={colors} />

      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}

// ===========================================
// SECTION COMPONENTS
// ===========================================

function HeroSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  const hasImages = config.hero.images?.primary
  const hasRotatingWords = config.hero.headlineRotatingWords && config.hero.headlineRotatingWords.length > 0
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24 overflow-hidden">
      {/* Subtle gradient accent (complements SkyBackground) */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        {/* Doctor availability pill — same as homepage */}
        <motion.div
          className="flex justify-center lg:justify-start mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <DoctorAvailabilityPill />
        </motion.div>

        <div className={cn('flex flex-col items-center', hasImages && 'lg:flex-row lg:items-center lg:gap-12 xl:gap-14')}>
          {/* Text content */}
          <div className={cn('flex-1 text-center', hasImages && 'lg:text-left')}>
            {/* Headline with optional rotating text */}
            <motion.h1
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="text-[1.35rem] sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6 leading-[1.15]"
            >
              {hasRotatingWords ? (
                <>
                  {config.hero.headline}{' '}
                  <br className="hidden sm:block" />
                  <span className="text-premium-gradient">
                    <RotatingText texts={config.hero.headlineRotatingWords!} interval={3500} />
                  </span>
                </>
              ) : (
                config.hero.headline
              )}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={cn('text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mb-6 leading-relaxed text-balance', hasImages ? 'lg:mx-0' : 'mx-auto')}
            >
              {config.hero.subheadline}
            </motion.p>

            {/* Price anchor */}
            <motion.div
              className={cn('flex flex-wrap items-center gap-3 mb-6', hasImages ? 'justify-center lg:justify-start' : 'justify-center')}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <Badge variant="price" shape="pill" size="lg">
                {config.serviceName} from $${config.pricing.price.toFixed(2)}
              </Badge>
              {config.pricing.originalPrice && (
                <p className="text-xs text-muted-foreground">
                  Typically $${config.pricing.originalPrice}+ at a GP clinic
                </p>
              )}
            </motion.div>

            {/* CTA + Highlight Badge Row */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className={cn('flex flex-col sm:flex-row items-center gap-3 mb-6', hasImages ? 'lg:justify-start' : 'justify-center')}
            >
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
              >
                <Link href={config.hero.ctaHref}>
                  {config.hero.ctaText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              {/* Glowing highlight badge */}
              {config.hero.highlightBadge && (
                <div className={cn(
                  'relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                )}>
                  <span className="absolute inset-0 rounded-full bg-emerald-400/20 dark:bg-emerald-400/10 blur-md animate-pulse" />
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="relative">{config.hero.highlightBadge.text}</span>
                </div>
              )}
            </motion.div>

            {/* Trust signals — compact like homepage */}
            <motion.div
              className="flex flex-col gap-2"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {config.hero.reassurances.slice(0, 2).map((item, i) => (
                <p key={i} className={cn('text-sm text-muted-foreground flex items-center gap-2', hasImages ? 'justify-center lg:justify-start' : 'justify-center')}>
                  <Check className={cn('h-4 w-4 shrink-0', colors.text)} />
                  <span>{item}</span>
                </p>
              ))}

              {/* Live daily stats strip */}
              {config.liveStats && (
                <div className={cn('flex items-center gap-3 pt-2', hasImages ? 'justify-center lg:justify-start' : 'justify-center')}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span><strong className="text-foreground">{config.liveStats.reviewedToday}</strong> reviewed today</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Avg <strong className="text-foreground">{config.liveStats.avgReviewTime} min</strong></span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Hero Image — real photos, matching homepage treatment */}
          {hasImages && (
            <motion.div
              className="hidden lg:block relative shrink-0 mt-0"
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative">
                {/* Main image */}
                <div className="relative w-72 xl:w-80 aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl dark:shadow-black/40">
                  <Image
                    src={config.hero.images!.primary}
                    alt="Patient using InstantMed from home"
                    fill
                    className="object-cover"
                    priority
                    sizes="(min-width: 1024px) 320px, 0px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
                </div>

                {/* Floating trust badge */}
                <motion.div
                  className="absolute -bottom-4 -left-6 bg-card/90 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-border/50 dark:border-white/10"
                  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', colors.light)}>
                      <Shield className={cn('w-4 h-4', colors.text)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">AHPRA Verified Doctors</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}

function WhoItsForSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-16 lg:py-20 bg-card/40 dark:bg-white/[0.02] backdrop-blur-xs">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
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
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={cn(
                  'rounded-2xl p-6 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                  isPositive && 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 hover:shadow-emerald-200/30 dark:hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-700',
                  isNegative && 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 hover:shadow-rose-200/30 dark:hover:shadow-rose-500/10 hover:border-rose-300 dark:hover:border-rose-700',
                  !isPositive && !isNegative && 'bg-card border-border hover:shadow-dawn-200/30 dark:hover:shadow-accent-teal/10 hover:border-primary/20 dark:hover:border-accent-teal/20'
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                  isPositive && 'bg-emerald-100 dark:bg-emerald-500/20',
                  isNegative && 'bg-rose-100 dark:bg-rose-500/20',
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

function SpecializedServicesSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  const prefersReducedMotion = useReducedMotion()

  if (!config.specializedServices) return null

  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.specializedServices.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {config.specializedServices.subtitle}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {config.specializedServices.services.map((service, i) => {
            const Icon = iconMap[service.icon] || Stethoscope
            return (
              <motion.div
                key={i}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  href={service.href}
                  className="block h-full rounded-2xl p-6 bg-card/80 dark:bg-white/5 backdrop-blur-xl border border-border/50 dark:border-white/10 hover:shadow-lg hover:border-primary/20 dark:hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colors.light)}>
                      <Icon className={cn('w-6 h-6', colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{service.title}</h3>
                        <span className={cn('text-sm font-semibold whitespace-nowrap', colors.text)}>
                          {service.price}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                      <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                        Get started <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section id="how-it-works" className="py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
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
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                {/* Connector line */}
                {i < config.howItWorks.steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
                )}
                
                <div className="relative bg-card/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-border/50 dark:border-white/10 hover:shadow-lg hover:shadow-dawn-200/25 dark:hover:shadow-accent-teal/[0.06] hover:border-primary/20 dark:hover:border-accent-teal/20 hover:-translate-y-0.5 transition-all duration-200 text-center">
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
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button
            asChild
            size="lg"
            className={cn('px-8 h-12 font-semibold text-white', colors.button)}
          >
            <Link href={config.hero.ctaHref}>
              {config.hero.ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

function AfterSubmitSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-16 lg:py-20 bg-card/40 dark:bg-white/[0.02] backdrop-blur-xs">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
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
                initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex gap-4 p-5 bg-card/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-border/50 dark:border-white/10 hover:shadow-md hover:shadow-dawn-200/20 dark:hover:shadow-accent-teal/[0.04] hover:border-primary/15 dark:hover:border-accent-teal/15 transition-all duration-200"
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

function TrustSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-16 lg:py-20 bg-card/40 dark:bg-white/[0.02] backdrop-blur-xs">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
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
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center p-6 bg-card/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-border/50 dark:border-white/10"
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

function FaqSection({ config }: { config: ServiceFunnelConfig }) {
  const prefersReducedMotion = useReducedMotion()

  if (!config.faq) return null

  return (
    <section id="faq" className="py-16 lg:py-20 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-10"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">FAQ</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
            {config.faq.title}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            {config.faq.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion
            type="single"
            collapsible
            defaultValue="0"
            className="space-y-3"
          >
            {config.faq.items.map((item, index) => (
              <AccordionItem
                key={index.toString()}
                value={index.toString()}
                className="rounded-xl bg-card/70 dark:bg-white/5 backdrop-blur-sm border border-border/60 shadow-sm hover:border-primary/20 dark:hover:border-accent-teal/20 hover:shadow-md hover:shadow-dawn-200/20 dark:hover:shadow-accent-teal/[0.04] transition-all duration-200 px-5"
              >
                <AccordionTrigger className="text-foreground py-5">
                  <span className="font-medium text-foreground text-left">{item.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact support */}
        <motion.div
          className="mt-10 text-center"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-muted-foreground mb-2 text-sm">Still have questions?</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm"
          >
            Contact our support team
          </a>
        </motion.div>
      </div>
    </section>
  )
}

function FinalCtaSection({ config, colors }: { config: ServiceFunnelConfig; colors: typeof colorClasses.emerald }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className={cn('py-16 lg:py-20 bg-linear-to-br', colors.gradient)}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {config.finalCta.headline}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {config.finalCta.subheadline}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white dark:bg-white text-foreground dark:text-foreground hover:bg-white/90 dark:hover:bg-white/90 px-10 h-14 text-lg font-semibold shadow-lg"
          >
            <Link href={config.hero.ctaHref}>
              {config.finalCta.ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-white/80 text-sm font-medium">
            From $${config.pricing.price.toFixed(2)} · No account required
          </p>
          <p className="mt-1 text-white/60 text-xs">
            Takes about 2 minutes · Full refund if we can&apos;t help
          </p>
        </motion.div>
      </div>
    </section>
  )
}
