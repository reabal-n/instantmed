'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check, CheckCircle2, Clock, Phone, Shield, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/components/ui/motion'
import { CONTACT_EMAIL } from '@/lib/constants'
import { SOCIAL_PROOF_DISPLAY } from '@/lib/social-proof'
import { cn } from '@/lib/utils'

import type { ColorClasses,ServiceFunnelConfig } from './funnel-types'

interface HeroSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
  isDisabled?: boolean
}

export function HeroSection({ config, colors, isDisabled }: HeroSectionProps) {
  const hasImages = config.hero.images?.primary
  const hasStaticBadges = config.hero.headlineRotatingWords && config.hero.headlineRotatingWords.length > 0
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24 overflow-hidden">
      {/* Subtle gradient accent (complements SkyBackground) */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-10">
        {/* Availability pill */}
        <motion.div
          className="flex justify-center lg:justify-start mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300">
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            {config.serviceId === 'med-cert'
              ? 'Med certs available 24/7'
              : `Open ${SOCIAL_PROOF_DISPLAY.operatingHours} AEST \u00b7 7 days`}
          </div>
        </motion.div>

        <div className={cn('flex flex-col items-center', hasImages && 'lg:flex-row lg:items-center lg:gap-12 xl:gap-14')}>
          {/* Text content */}
          <div className={cn('flex-1 text-center', hasImages && 'lg:text-left')}>
            {/* Headline */}
            <h1
              className="text-[1.35rem] sm:text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground mb-6 leading-[1.15] animate-hero-headline"
            >
              {config.hero.headlineGradient ? (
                <>
                  {config.hero.headline}{' '}
                  <br className="hidden sm:block" />
                  <span className="text-premium-gradient">
                    {config.hero.headlineGradient}
                  </span>
                </>
              ) : (
                config.hero.headline
              )}
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={cn('text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mb-6 leading-relaxed text-balance', hasImages ? 'lg:mx-0' : 'mx-auto')}
            >
              {config.hero.subheadline}
            </motion.p>

            {/* Price anchor */}
            <motion.div
              className={cn('flex flex-wrap items-center gap-3 mb-4', hasImages ? 'justify-center lg:justify-start' : 'justify-center')}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.12 }}
            >
              <Badge variant="price" shape="pill" size="lg">
                {config.serviceName} from ${config.pricing.price.toFixed(2)}
              </Badge>
              {config.pricing.originalPrice && (
                <p className="text-xs text-muted-foreground">
                  Typically ${config.pricing.originalPrice}+ at a GP clinic
                </p>
              )}
            </motion.div>

            {/* Static trust chips */}
            {hasStaticBadges && (
              <motion.div
                className={cn('flex flex-wrap gap-x-4 gap-y-1.5 mb-6', hasImages ? 'justify-center lg:justify-start' : 'justify-center')}
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                {config.hero.headlineRotatingWords!.map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-primary/70" aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </motion.div>
            )}

            {/* CTA + Highlight Badge Row */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.18 }}
              className={cn('flex flex-col sm:flex-row items-center gap-3 mb-6', hasImages ? 'lg:justify-start' : 'justify-center')}
            >
              {isDisabled ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="px-8 h-12 text-base font-semibold"
                >
                  <Link href={`mailto:${CONTACT_EMAIL}`}>
                    Contact us
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
                >
                  <Link href={config.hero.ctaHref}>
                    {config.hero.ctaText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}

              {/* Glowing highlight badge */}
              {config.hero.highlightBadge && (
                <div className={cn(
                  'relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  colors.light, colors.text, colors.border
                )}>
                  <span className="relative flex h-2 w-2">
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", colors.text.replace('text-', 'bg-'))} />
                    <span className={cn("relative inline-flex rounded-full h-2 w-2", colors.text.replace('text-', 'bg-'))} />
                  </span>
                  <span className="relative">{config.hero.highlightBadge.text}</span>
                </div>
              )}
            </motion.div>

            {/* Trust signals - compact like homepage */}
            <motion.div
              className="flex flex-col gap-2"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
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

          {/* Hero Image - real photos, matching homepage treatment */}
          {hasImages && (
            <motion.div
              className="hidden lg:block relative shrink-0 mt-0"
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
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
                  className="absolute -bottom-4 -left-6 bg-white dark:bg-card rounded-2xl p-3 shadow-xl shadow-primary/[0.08] dark:shadow-none border border-border/50 dark:border-white/15"
                  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
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
