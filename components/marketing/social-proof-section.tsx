'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { AnimatedStat } from '@/components/marketing/animated-stat'
import { GoogleReviewsBadge } from '@/components/marketing/google-reviews-badge'
import { Heading } from '@/components/ui/heading'
import { useReducedMotion } from '@/components/ui/motion'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { getPatientCount } from '@/lib/social-proof'

const inlineStats = [
  { value: getPatientCount(), suffix: '+', label: 'Australians helped', decimals: 0 },
  { value: SOCIAL_PROOF.averageRating, suffix: '/5', label: 'Patient rating', decimals: 1 },
  { value: SOCIAL_PROOF.certApprovalPercent, suffix: '%', label: 'Clinically approved', decimals: 0 },
  { value: 100, suffix: '%', label: 'AHPRA-registered doctors', decimals: 0 },
]

interface SocialProofSectionProps {
  /**
   * Optional photographic accent. When provided, renders alongside the section
   * header at a constrained size — replaces the previous full-bleed 16:7
   * scroll-break that lived between hero and services on the home page.
   */
  lifestyleImage?: { src: string; alt: string }
}

export function SocialProofSection({ lifestyleImage }: SocialProofSectionProps = {}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-10 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header — split with optional lifestyle image accent on the right.
            Without an image: header centers as before. With an image: 7/5 grid
            on lg, stacked on mobile with the image rendered first as a small
            framed banner. */}
        {lifestyleImage ? (
          <div className="grid lg:grid-cols-12 lg:gap-10 items-center mb-10 sm:mb-12">
            <div className="lg:col-span-7 order-2 lg:order-1 text-center lg:text-left mt-6 lg:mt-0">
              <Heading level="h2" className="mb-3">
                Real patients. Real reviews.
              </Heading>
              <p className="text-sm text-muted-foreground">
                Don&apos;t take our word for it.
              </p>
            </div>
            <motion.div
              className="lg:col-span-5 order-1 lg:order-2"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="relative aspect-[4/3] sm:aspect-[5/4] rounded-2xl overflow-hidden border border-border/40 shadow-lg shadow-primary/[0.06] dark:shadow-none mx-auto max-w-md lg:max-w-none">
                <Image
                  src={lifestyleImage.src}
                  alt={lifestyleImage.alt}
                  fill
                  className="object-cover object-top"
                  loading="lazy"
                  sizes="(max-width: 1023px) calc(100vw - 4rem), 400px"
                />
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            className="text-center mb-8 sm:mb-10 lg:mb-12"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <Heading level="h2" className="mb-3">
              Real patients. Real reviews.
            </Heading>
            <p className="text-sm text-muted-foreground">
              Don&apos;t take our word for it.
            </p>
          </motion.div>
        )}

        {/* Inline stat strip - clean typographic row */}
        <motion.div
          className="flex flex-wrap justify-center items-baseline gap-x-8 gap-y-4 sm:gap-x-12 mb-8 sm:mb-10 lg:mb-12"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.08 }}
        >
          {inlineStats.map((stat, i) => (
            <div key={stat.label} className="flex items-baseline gap-x-8 sm:gap-x-12">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-none">
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

        {/* Google Reviews badge — stars-only (numeric and review count
            stripped per Pass 2; reading "4.8 (3)" undersells the trust). */}
        <div className="flex flex-col items-center gap-2 mb-6 sm:mb-8 lg:mb-10">
          <GoogleReviewsBadge />
          <Link
            href="/reviews"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            See all reviews
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-2 max-w-2xl mx-auto leading-relaxed">
          Telehealth consultations achieve equivalent clinical outcomes to in-person visits for common presentations (Snoswell et al., <em>J Telemed Telecare</em>, 2023). Australian telehealth consultations are regulated under the Health Practitioner Regulation National Law Act 2009.
        </p>
      </div>
    </section>
  )
}
