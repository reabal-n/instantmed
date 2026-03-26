'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
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
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4">
            <SectionPill>FAQ</SectionPill>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
            {config.faq.title}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            {config.faq.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
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
                className="rounded-xl bg-white dark:bg-card border border-border/30 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none hover:border-primary/20 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300 px-5"
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
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
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
