'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/shared/navbar'
import { MarketingFooter } from '@/components/marketing'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Clock,
  FileCheck,
  GraduationCap,
  Heart,
  Lock,
  School,
  Shield,
  Smartphone,
  Users,
} from 'lucide-react'
import { AccordionSection, CTABanner, ProcessSteps } from '@/components/sections'
import { RegulatoryPartners } from '@/components/marketing'
import { LiveWaitTime, StatsStrip } from '@/components/marketing'
import { EmergencyDisclaimer } from '@/components/shared/emergency-disclaimer'
import { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
import { MarketingPageShell } from '@/components/shared/marketing-page-shell'
import { AvailabilityIndicator } from '@/components/shared/availability-indicator'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { useServiceAvailability } from '@/components/providers/service-availability-provider'
import { getTestimonialsByService } from '@/lib/data/testimonials'
import { getDailyStats } from '@/lib/marketing/daily-stats'
import type { MedCertIntentConfig } from '@/lib/marketing/med-cert-intent-config'

const CONTACT_EMAIL = 'support@instantmed.com.au'

const trustBadges = [
  { name: 'AHPRA Registered', description: 'Australian doctors only', icon: BadgeCheck, color: 'text-success' },
  { name: 'TGA Compliant', description: 'Meets all regulations', icon: FileCheck, color: 'text-primary' },
  { name: '256-bit SSL', description: 'Bank-level encryption', icon: Lock, color: 'text-primary' },
  { name: 'Australian-based', description: 'Sydney HQ', icon: Building2, color: 'text-primary' },
]

const steps = [
  { number: 1, title: 'Answer a few questions', description: "Tell us what's going on. Takes about 2 minutes." },
  { number: 2, title: 'Doctor reviews your request', description: 'A real GP reviews your request and makes a clinical decision.' },
  { number: 3, title: 'Certificate in your inbox', description: 'Done. Forward it to your employer or uni.' },
]

const doctorAvatars = [
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor1',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor2',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor3',
]

const recognitionIcons: Record<string, typeof Briefcase> = {
  'All employers': Briefcase,
  'Fair Work compliant': Shield,
  'Large & small businesses': Briefcase,
  'Full-time & casual': Users,
  'Universities': School,
  'Go8 universities': School,
  'ATN & IRU': GraduationCap,
  'TAFE & RTOs': GraduationCap,
  'Private providers': Building2,
  'Private unis': Building2,
  'Family & dependants': Heart,
  '1–3 days': Clock,
  'Backdating': Clock,
  'Primary & secondary': School,
  'AHPRA doctors': BadgeCheck,
  'Parent completes form': Users,
  'Office & general work': Briefcase,
  'Clinical assessment': Shield,
  'Employer policies vary': Building2,
}

function getRecognitionIcon(label: string) {
  return recognitionIcons[label] ?? Briefcase
}

interface MedCertIntentPageProps {
  config: MedCertIntentConfig
}

export function MedCertIntentPage({ config }: MedCertIntentPageProps) {
  const prefersReducedMotion = useReducedMotion()
  const isDisabled = useServiceAvailability().isServiceDisabled('med-cert')
  const liveStats = getDailyStats()
  const medCertTestimonials = getTestimonialsByService('medical-certificate')
  const testimonials = medCertTestimonials.slice(0, 6).map((t) => ({
    text: `"${t.text}"`,
    image: '',
    name: `${t.name}${t.age ? `, ${t.age}` : ''}`,
    role: `${t.location} • Verified ✓`,
  }))

  const ctaHref = isDisabled ? '/contact' : '/request?service=med-cert'

  return (
    <MarketingPageShell>
      <div className="min-h-screen overflow-x-hidden">
        {isDisabled && (
          <div className="sticky top-0 z-40 mx-4 mt-2 mb-0 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">This service is temporarily unavailable.</p>
              <p className="text-xs text-amber-700 dark:text-amber-200">
                We&apos;ll be back soon. <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:no-underline">Contact us</a> if you have questions.
              </p>
            </div>
          </div>
        )}
        <Navbar variant="marketing" />

        <main className="relative pb-20 lg:pb-0">
          {/* Hero Section */}
          <section className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24 overflow-hidden">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="flex justify-center mb-6"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <AvailabilityIndicator variant="badge" />
              </motion.div>

              <div className="flex flex-col lg:flex-row items-center lg:gap-12">
                <div className="text-center lg:text-left flex-1 max-w-2xl">
                  <motion.h1
                    className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 leading-[1.15]"
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    {config.h1}
                  </motion.h1>

                  <motion.p
                    className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed lg:mx-0 mx-auto"
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {config.heroSubheadline}
                  </motion.p>

                  <motion.div
                    className="flex flex-col sm:flex-row gap-4 items-center lg:justify-start justify-center mb-6"
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Button
                      asChild
                      size="lg"
                      variant={isDisabled ? 'outline' : 'default'}
                      className={cn(isDisabled ? '' : 'px-8 h-12 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all')}
                    >
                      <Link href={ctaHref}>
                        {isDisabled ? 'Contact us' : `${config.ctaButtonText} — $19.95`}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-success/10 dark:bg-success/10 text-success dark:text-success border border-success/20 dark:border-success/20">
                      <span className="absolute inset-0 rounded-full bg-success/20 dark:bg-success/10 blur-md animate-pulse" />
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                      </span>
                      <span className="relative">100% online process</span>
                    </div>
                  </motion.div>

                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                  >
                    <EmergencyDisclaimer variant="hero" className="text-xs sm:text-sm" />
                  </motion.div>
                </div>

                <motion.div
                  className="hidden lg:block relative mt-12 lg:mt-0 shrink-0"
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="relative w-80 xl:w-96 aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                    <Image
                      src="/images/medcert-1.jpeg"
                      alt="Person requesting a medical certificate on their phone"
                      fill
                      className="object-cover"
                      priority
                      sizes="(min-width: 1024px) 384px, 0px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
                    <motion.div
                      className="absolute bottom-4 left-4 bg-white dark:bg-card shadow-md rounded-xl px-3 py-2 border border-border/50 dark:border-white/15"
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.9 }}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-success" />
                        <span className="text-xs font-semibold text-foreground">AHPRA Verified Doctors</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  className="lg:hidden mt-10 flex justify-center"
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="relative w-48 h-32 rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/10 dark:bg-success/10 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">100% online</p>
                        <p className="text-xs text-muted-foreground">From your phone</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <div className="h-1.5 flex-1 rounded-full bg-success" />
                      <div className="h-1.5 flex-1 rounded-full bg-success" />
                      <div className="h-1.5 flex-1 rounded-full bg-success/30" />
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div
                className="mt-10"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
              >
                <LiveWaitTime variant="compact" services={['med-cert']} />
              </motion.div>

              <motion.div
                className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <span className="font-semibold text-foreground">From $19.95</span>
                <span className="hidden sm:inline text-border">·</span>
                <span>100% online</span>
                <span className="hidden sm:inline text-border">·</span>
                <span>AHPRA doctors</span>
              </motion.div>
            </div>
          </section>

          {/* Trust Badges */}
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                {trustBadges.map((badge) => (
                  <div
                    key={badge.name}
                    className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none hover:border-border hover:shadow-md transition-all"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shadow-sm ${badge.color}`}>
                      <badge.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{badge.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <RegulatoryPartners />
              </div>
            </div>
          </section>

          {/* Use-case Explainer */}
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-10"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
                  {config.explainerTitle}
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-8">
                  {config.explainerSubtitle}
                </p>
              </motion.div>
              <motion.div
                className="space-y-6"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {config.explainerParagraphs.map((para, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed">
                    {para}
                  </p>
                ))}
              </motion.div>
              <motion.div
                className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-10"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {doctorAvatars.map((src, i) => (
                      <div key={i} className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-background bg-muted">
                        <Image src={src} alt="" fill className="object-cover" unoptimized />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">AHPRA doctors</span>
                </div>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span><strong className="text-foreground">{liveStats.reviewedToday}</strong> reviewed today</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Avg <strong className="text-foreground">{liveStats.avgReviewTime} min</strong></span>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Recognition / Validity */}
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
                <motion.div
                  className="shrink-0 w-64 lg:w-72 aspect-square rounded-2xl overflow-hidden shadow-lg"
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <Image
                    src="/images/medcert-2.jpeg"
                    alt="Person holding an InstantMed medical certificate"
                    width={400}
                    height={400}
                    className="object-cover w-full h-full"
                  />
                </motion.div>
                <motion.div
                  className="flex-1 text-center lg:text-left"
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 tracking-tight">
                    {config.recognitionTitle}
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-xl lg:mx-0 mx-auto">
                    {config.recognitionSubtitle}
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                    {config.recognitionBadges.map((item) => {
                      const Icon = getRecognitionIcon(item.label)
                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none"
                        >
                          <Icon className="w-5 h-5 text-primary shrink-0" />
                          <div className="text-left">
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.sub}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <ProcessSteps
            id="how-it-works"
            title="How it works"
            subtitle="No appointments. No phone calls. Just results."
            steps={steps}
            className="scroll-mt-20"
          />

          {/* Emergency Disclaimer */}
          <section className="py-8">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <EmergencyDisclaimer variant="inline" />
              </motion.div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="py-8 overflow-hidden">
            <TestimonialsColumnsWrapper
              testimonials={testimonials}
              title="What our patients say"
              subtitle="Real feedback from people who've been where you are."
              className="py-0 my-0"
            />
          </section>

          {/* FAQ */}
          <AccordionSection
            pill="FAQ"
            title="Common questions"
            subtitle="Everything you need to know about getting your certificate."
            groups={[{ items: config.faqs }]}
          />

          {/* Internal link to main medical certificate page */}
          <section className="py-6 px-4">
            <p className="text-center text-sm text-muted-foreground">
              Not sure which certificate you need?{' '}
              <Link href="/medical-certificate" className="text-primary hover:underline font-medium">
                View all certificate options
              </Link>
            </p>
          </section>

          {/* Stats strip */}
          <StatsStrip className="bg-muted/20 border-y border-border/30" />

          {/* Final CTA */}
          <CTABanner
            title={config.ctaTitle}
            subtitle={config.ctaSubtitle}
            ctaText={config.ctaButtonText}
            ctaHref={ctaHref}
          />
        </main>

        {/* Sticky Mobile CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
          <div className="bg-background/95 backdrop-blur-lg border-t border-border/50 px-4 py-3 safe-area-pb">
            <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">From $19.95</p>
                <p className="text-xs text-muted-foreground truncate">Doctor-reviewed certificate</p>
              </div>
              <Button
                asChild
                size="sm"
                className="px-5 font-semibold shadow-lg shadow-primary/25 shrink-0"
              >
                <Link href={ctaHref}>
                  {isDisabled ? 'Contact us' : 'Get started'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
