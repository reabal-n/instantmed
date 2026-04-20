'use client'

import { motion } from 'framer-motion'

import { FAQList } from '@/components/ui/faq-list'
import { useReducedMotion } from '@/components/ui/motion'
import { SectionPill } from '@/components/ui/section-pill'
import { CONTACT_EMAIL } from '@/lib/constants'

import type { ServiceFunnelConfig } from './funnel-types'

interface FaqSectionProps {
  config: ServiceFunnelConfig
}

export function FaqSection({ config }: FaqSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  if (!config.faq) return null

  return (
    <section id="faq" className="py-16 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-10"
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <SectionPill>FAQ</SectionPill>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
            {config.faq.title}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            {config.faq.subtitle}
          </p>
        </motion.div>

        <FAQList items={config.faq.items} defaultValue="0" />

        {/* Contact support */}
        <motion.div
          className="mt-10 text-center"
          initial={prefersReducedMotion ? {} : {}}
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
