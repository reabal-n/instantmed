'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Users, Star, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from '@/lib/social-proof'
import { getPatientCount } from '@/lib/social-proof'
import { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
import { getTestimonialsForColumns } from '@/lib/data/testimonials'

const stats = [
  {
    icon: Users,
    value: `${getPatientCount()}+`,
    label: 'Australians helped',
    color: 'text-primary',
  },
  {
    icon: Star,
    value: SOCIAL_PROOF_DISPLAY.ratingOutOf5,
    label: 'patient rating',
    color: 'text-amber-500',
  },
  {
    icon: Clock,
    value: `${SOCIAL_PROOF.sameDayDeliveryPercent}%`,
    label: 'delivered same day',
    color: 'text-primary',
  },
  {
    icon: ShieldCheck,
    value: '100%',
    label: 'AHPRA-registered',
    color: 'text-emerald-600',
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
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
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
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-12"
          initial={prefersReducedMotion ? {} : { y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 text-sm">
              <stat.icon className={cn('w-4 h-4', stat.color)} />
              <span className="font-semibold text-foreground">{stat.value}</span>
              <span className="text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </motion.div>

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
