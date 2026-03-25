'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServiceFunnelConfig, ColorClasses } from './funnel-types'
import { iconMap } from './funnel-types'

interface WhoItsForSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
}

export function WhoItsForSection({ config, colors }: WhoItsForSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.whoItsFor.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {config.whoItsFor.subtitle}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {config.whoItsFor.cards.map((card, i) => {
            const Icon = iconMap[card.icon] || HelpCircle
            const isPositive = card.type === 'positive'
            const isNegative = card.type === 'negative'

            return (
              <motion.div
                key={i}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={cn(
                  'rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
                  isPositive && 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 hover:shadow-primary/[0.06] hover:border-emerald-300 dark:hover:border-emerald-700',
                  isNegative && 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 hover:shadow-primary/[0.06] hover:border-rose-300 dark:hover:border-rose-700',
                  !isPositive && !isNegative && 'bg-white dark:bg-card border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] hover:shadow-primary/[0.1] hover:border-primary/20'
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                  isPositive && 'bg-emerald-100 dark:bg-emerald-500/20',
                  isNegative && 'bg-rose-100 dark:bg-rose-500/20',
                  !isPositive && !isNegative && colors.light
                )}>
                  <Icon className={cn(
                    'w-6 h-6',
                    isPositive && 'text-emerald-600 dark:text-emerald-400',
                    isNegative && 'text-rose-600 dark:text-rose-400',
                    !isPositive && !isNegative && colors.text
                  )} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
