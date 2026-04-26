'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ClipboardList,Clock } from 'lucide-react'
import Link from 'next/link'

import { StickerIcon } from '@/components/icons/stickers'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

import type { ColorClasses,ServiceFunnelConfig } from './funnel-types'
import { iconMap, STICKER_ICON_MAP } from './funnel-types'

interface HowItWorksSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
}

export function HowItWorksSection({ config, colors }: HowItWorksSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section id="how-it-works" className="py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
            {config.howItWorks.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {config.howItWorks.subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {config.howItWorks.steps.map((step, i) => {
            const Icon = iconMap[step.icon] || ClipboardList
            const stickerName = STICKER_ICON_MAP[step.icon]
            return (
              <motion.div
                key={step.number}
                initial={prefersReducedMotion ? {} : { y: 30 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="relative"
              >
                {/* Connector line */}
                {i < config.howItWorks.steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
                )}

                <div className="relative bg-white dark:bg-card rounded-2xl p-6 border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:shadow-primary/[0.08] hover:border-primary/20 hover:-translate-y-0.5 transition-[transform,box-shadow,border-color] duration-300 text-center">
                  {/* Step number */}
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-semibold', colors.button)}>
                    {step.number}
                  </div>

                  {/* Icon */}
                  {stickerName ? (
                    <div className="flex items-center justify-center mx-auto mb-4">
                      <StickerIcon name={stickerName} size={52} />
                    </div>
                  ) : (
                    <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4', colors.light)}>
                      <Icon className={cn('h-7 w-7', colors.text)} />
                    </div>
                  )}

                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>

                  {step.time && (
                    <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium', colors.light, colors.text)}>
                      <Clock className="w-3 h-3" />
                      {step.time}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button
            asChild
            size="lg"
            className="px-8 h-12 font-semibold shadow-lg shadow-primary/20 dark:shadow-primary/15 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-[transform,box-shadow]"
          >
            <Link href={config.hero.ctaHref}>
              {config.hero.ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
