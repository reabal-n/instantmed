'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Users, Star, Clock, ShieldCheck, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { getPatientCount } from '@/lib/social-proof'
import { AnimatedStat } from '@/components/marketing/animated-stat'
import { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
import { getHomepageTestimonials } from '@/lib/data/testimonials'
import { GoogleReviewsBadge } from '@/components/marketing/google-reviews-badge'
import { SectionPill } from '@/components/ui/section-pill'

const bentoStats = [
  {
    icon: Users,
    value: getPatientCount(),
    suffix: '+',
    label: 'Australians helped',
    detail: 'and counting',
    accentBorder: 'bg-primary',
    valueColor: 'text-primary',
    iconColor: 'text-primary/40',
    decimals: 0,
  },
  {
    icon: Star,
    value: SOCIAL_PROOF.averageRating,
    suffix: '/5',
    label: 'Patient rating',
    detail: 'from verified reviews',
    accentBorder: 'bg-amber-500',
    valueColor: 'text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-400/40',
    decimals: 1,
  },
  {
    icon: Clock,
    value: SOCIAL_PROOF.sameDayDeliveryPercent,
    suffix: '%',
    label: 'Delivered same day',
    detail: 'of all requests',
    accentBorder: 'bg-blue-500',
    valueColor: 'text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-400/40',
    decimals: 0,
  },
  {
    icon: ShieldCheck,
    value: 100,
    suffix: '%',
    label: 'AHPRA-registered',
    detail: 'every single doctor',
    accentBorder: 'bg-emerald-500',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-400/40',
    decimals: 0,
  },
]

export function SocialProofSection() {
  const prefersReducedMotion = useReducedMotion()
  const reviews = getHomepageTestimonials()

  return (
    <section className="py-10 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-6 sm:mb-8 lg:mb-10"
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4">
            <SectionPill>Social proof</SectionPill>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Real patients. Real reviews.
          </h2>
          <p className="text-sm text-muted-foreground">
            Don&apos;t take our word for it.
          </p>
        </motion.div>

        {/* Bento grid stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10 lg:mb-12">
          {bentoStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className={cn(
                'rounded-xl p-4 sm:p-5 relative overflow-hidden',
                'bg-white dark:bg-card',
                'border border-border/50 dark:border-white/10',
                'shadow-sm shadow-primary/[0.04] dark:shadow-none',
              )}
              initial={prefersReducedMotion ? {} : { y: 16, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {/* Left accent stripe */}
              <div className={cn('absolute left-0 top-3 bottom-3 w-0.5 rounded-full', stat.accentBorder)} />

              {/* Icon - subtle accent in top-right */}
              <stat.icon className={cn('w-5 h-5 mb-3', stat.iconColor)} />

              {/* Stat number - hero element with color */}
              <p className={cn('text-2xl sm:text-3xl font-bold tracking-tight leading-none mb-1', stat.valueColor)}>
                <AnimatedStat value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              </p>

              {/* Label */}
              <p className="text-xs sm:text-sm font-medium text-foreground">
                {stat.label}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {stat.detail}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Google Reviews badge */}
        <div className="flex flex-col items-center gap-2 mb-6 sm:mb-8 lg:mb-10">
          <GoogleReviewsBadge />
          <Link
            href="/reviews"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary/80 hover:text-primary transition-colors"
          >
            See all reviews
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Testimonials */}
        <TestimonialsColumnsWrapper
          testimonials={reviews}
          title=""
          subtitle=""
          badgeText=""
          className="py-0 my-0"
        />

        <p className="text-xs text-muted-foreground text-center mt-6">
          Individual experiences may vary. All requests are subject to doctor assessment.
        </p>
      </div>
    </section>
  )
}
