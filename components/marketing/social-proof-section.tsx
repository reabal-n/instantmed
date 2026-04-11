'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Users, Star, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { getPatientCount } from '@/lib/social-proof'
import { AnimatedStat } from '@/components/marketing/animated-stat'
import { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
import { getTestimonialsForColumns } from '@/lib/data/testimonials'

const bentoStats = [
  {
    icon: Users,
    value: getPatientCount(),
    suffix: '+',
    label: 'Australians helped',
    tint: 'bg-primary/5 dark:bg-primary/10',
    iconColor: 'text-primary',
    decimals: 0,
  },
  {
    icon: Star,
    value: SOCIAL_PROOF.averageRating,
    suffix: '/5',
    label: 'patient rating',
    tint: 'bg-amber-50 dark:bg-amber-950/20',
    iconColor: 'text-amber-500',
    decimals: 1,
  },
  {
    icon: Clock,
    value: SOCIAL_PROOF.sameDayDeliveryPercent,
    suffix: '%',
    label: 'delivered same day',
    tint: 'bg-blue-50 dark:bg-blue-950/20',
    iconColor: 'text-blue-500',
    decimals: 0,
  },
  {
    icon: ShieldCheck,
    value: 100,
    suffix: '%',
    label: 'AHPRA-registered doctors',
    tint: 'bg-emerald-50 dark:bg-emerald-950/20',
    iconColor: 'text-emerald-600',
    decimals: 0,
  },
]

export function SocialProofSection() {
  const prefersReducedMotion = useReducedMotion()
  const reviews = getTestimonialsForColumns().slice(0, 6)

  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Trusted by Australians
          </h2>
          <p className="text-sm text-muted-foreground">
            Real reviews from real patients.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Updated daily
          </p>
        </motion.div>

        {/* Bento grid stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-12">
          {bentoStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className={cn(
                'rounded-xl p-4 sm:p-5 relative overflow-hidden',
                stat.tint,
                'border border-border/20 dark:border-white/5',
              )}
              initial={prefersReducedMotion ? {} : { y: 16, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <stat.icon className={cn('w-4 h-4 mb-2', stat.iconColor)} />
              <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-none mb-1">
                <AnimatedStat value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
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
