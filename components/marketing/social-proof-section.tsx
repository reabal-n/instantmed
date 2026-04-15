'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { AnimatedStat } from '@/components/marketing/animated-stat'
import { GoogleReviewsBadge } from '@/components/marketing/google-reviews-badge'
import { useReducedMotion } from '@/components/ui/motion'
import { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
import { getHomepageTestimonials } from '@/lib/data/testimonials'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { getPatientCount } from '@/lib/social-proof'

const inlineStats = [
  { value: getPatientCount(), suffix: '+', label: 'Australians helped', decimals: 0 },
  { value: SOCIAL_PROOF.averageRating, suffix: '/5', label: 'Patient rating', decimals: 1 },
  { value: SOCIAL_PROOF.sameDayDeliveryPercent, suffix: '%', label: 'Same-day delivery', decimals: 0 },
  { value: 100, suffix: '%', label: 'AHPRA-registered doctors', decimals: 0 },
]

export function SocialProofSection() {
  const prefersReducedMotion = useReducedMotion()
  const reviews = getHomepageTestimonials()

  return (
    <section className="py-10 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8 sm:mb-10 lg:mb-12"
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Real patients. Real reviews.
          </h2>
          <p className="text-sm text-muted-foreground">
            Don&apos;t take our word for it.
          </p>
        </motion.div>

        {/* Inline stat strip - clean typographic row */}
        <motion.div
          className="flex flex-wrap justify-center items-baseline gap-x-8 gap-y-4 sm:gap-x-12 mb-8 sm:mb-10 lg:mb-12"
          initial={prefersReducedMotion ? {} : { y: 12 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {inlineStats.map((stat, i) => (
            <div key={stat.label} className="flex items-baseline gap-x-8 sm:gap-x-12">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                  <AnimatedStat value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {stat.label}
                </p>
              </div>
              {i < inlineStats.length - 1 && (
                <div className="hidden sm:block w-px h-8 bg-border/50 self-center" />
              )}
            </div>
          ))}
        </motion.div>

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
        <p className="text-[10px] text-muted-foreground/50 text-center mt-2 max-w-2xl mx-auto leading-relaxed">
          Telehealth consultations achieve equivalent clinical outcomes to in-person visits for common presentations (Snoswell et al., <em>J Telemed Telecare</em>, 2023). Australian telehealth consultations are regulated under the Health Practitioner Regulation National Law Act 2009.
        </p>
      </div>
    </section>
  )
}
