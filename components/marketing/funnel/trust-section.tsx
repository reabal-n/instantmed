'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServiceFunnelConfig, ColorClasses } from './funnel-types'
import { iconMap } from './funnel-types'

interface TrustSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
}

export function TrustSection({ config, colors }: TrustSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-16 lg:py-24 bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {config.trust.title}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {config.trust.badges.map((badge, i) => {
            const Icon = iconMap[badge.icon] || Shield
            return (
              <motion.div
                key={i}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center p-6 bg-white dark:bg-card rounded-xl border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300"
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4', colors.light)}>
                  <Icon className={cn('w-6 h-6', colors.text)} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{badge.title}</h3>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
