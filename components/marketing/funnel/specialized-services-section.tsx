'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServiceFunnelConfig, ColorClasses } from './funnel-types'
import { iconMap } from './funnel-types'

interface SpecializedServicesSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
}

export function SpecializedServicesSection({ config, colors }: SpecializedServicesSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  if (!config.specializedServices) return null

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
            {config.specializedServices.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {config.specializedServices.subtitle}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {config.specializedServices.services.map((service, i) => {
            const Icon = iconMap[service.icon] || Stethoscope
            return (
              <motion.div
                key={i}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  href={service.href}
                  className="block h-full rounded-2xl p-6 bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:shadow-primary/[0.08] hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colors.light)}>
                      <Icon className={cn('w-6 h-6', colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{service.title}</h3>
                        <span className={cn('text-sm font-semibold whitespace-nowrap', colors.text)}>
                          {service.price}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                      <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                        Get started <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
