'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServiceFunnelConfig, ColorClasses } from './funnel-types'
import { iconMap } from './funnel-types'

interface AfterSubmitSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
}

export function AfterSubmitSection({ config, colors }: AfterSubmitSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-16 lg:py-24 bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.afterSubmit.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {config.afterSubmit.subtitle}
          </p>
        </motion.div>

        <div className="space-y-4">
          {config.afterSubmit.items.map((item, i) => {
            const Icon = iconMap[item.icon] || Check
            return (
              <motion.div
                key={i}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex gap-4 p-5 bg-white dark:bg-card rounded-xl border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none hover:shadow-lg hover:shadow-primary/[0.08] hover:border-primary/15 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', colors.light)}>
                  <Icon className={cn('w-5 h-5', colors.text)} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
