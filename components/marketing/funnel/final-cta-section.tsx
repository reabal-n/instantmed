'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

import type { ColorClasses,ServiceFunnelConfig } from './funnel-types'

interface FinalCtaSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
  isDisabled?: boolean
}

export function FinalCtaSection({ config, colors, isDisabled }: FinalCtaSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className={cn('py-16 lg:py-24 bg-linear-to-br', colors.gradient)}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
            {config.finalCta.headline}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {config.finalCta.subheadline}
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="px-10 h-14 text-lg font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Link href={isDisabled ? "/contact" : config.hero.ctaHref}>
              {isDisabled ? "Contact us" : config.finalCta.ctaText}
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
