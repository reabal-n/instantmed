'use client'

import Link from 'next/link'
import { ArrowRight, Check, ShieldCheck, Stethoscope, Clock, AlertCircle, Sparkles } from 'lucide-react'
import { serviceCategories } from '@/lib/marketing/homepage'
import { motion, type Variants } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { DocumentPremium, PillPremium, StethoscopePremium } from '@/components/icons/certification-logos'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useServiceAvailability, type ServiceId } from '@/components/providers/service-availability-provider'
import { CertificateMockup } from '@/components/marketing/mockups/certificate'
import { EScriptMockup } from '@/components/marketing/mockups/escript'
import { ConsultMockup } from '@/components/marketing/mockups/consult'

const mockupMap: Record<string, React.ComponentType> = {
  'med-cert': CertificateMockup,
  'scripts': EScriptMockup,
  'ed': ConsultMockup,        // TODO: replaced with EDMockup in Task 5
  'hair-loss': ConsultMockup, // TODO: replaced with HairLossMockup in Task 12
}

const iconMap = {
  FileText: DocumentPremium,
  Pill: PillPremium,
  Stethoscope: StethoscopePremium,
  Sparkles: Sparkles,
}

const colorConfig: Record<string, { 
  gradient: string
  accent: string
  light: string
  chipColor: "primary" | "secondary" | "success" | "warning" | "danger" 
}> = {
  emerald: { 
    gradient: 'from-emerald-400 to-teal-500',
    accent: '#059669', 
    light: 'rgba(5, 150, 105, 0.08)', 
    chipColor: 'success' 
  },
  cyan: { 
    gradient: 'from-cyan-400 to-blue-500',
    accent: '#0891b2', 
    light: 'rgba(8, 145, 178, 0.08)', 
    chipColor: 'primary' 
  },
  blue: {
    gradient: 'from-blue-400 to-sky-500',
    accent: '#3B82F6',
    light: 'rgba(59, 130, 246, 0.08)',
    chipColor: 'primary'
  },
  violet: {
    gradient: 'from-violet-400 to-purple-500',
    accent: '#8B5CF6',
    light: 'rgba(139, 92, 246, 0.08)',
    chipColor: 'primary',
  },
}

// Trust signals — unique per section, no duplicates with hero/trust-badge-slider
const trustSignals = [
  { icon: Stethoscope, text: 'AHPRA-registered doctors' },
  { icon: Clock, text: 'Most reviewed within 1–2 hours' },
  { icon: ShieldCheck, text: 'Flat pricing, no hidden fees' },
]

function useServicePickerVariants() {
  const prefersReducedMotion = useReducedMotion()

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.12 },
    },
  }

  const itemVariants: Variants = prefersReducedMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { y: 30, scale: 0.95 },
        visible: {
          y: 0,
          scale: 1,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }

  return { containerVariants, itemVariants, prefersReducedMotion }
}

export function ServicePicker() {
  const { containerVariants, itemVariants, prefersReducedMotion } = useServicePickerVariants()
  const { isServiceDisabled } = useServiceAvailability()

  return (
    <section id="pricing" className="py-20 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-4">
            What do you need?
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-6">
            Flat pricing. No hidden fees. No account needed to start.
          </p>
          
          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {trustSignals.map((signal, index) => (
              <motion.div
                key={signal.text}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
                initial={prefersReducedMotion ? {} : { y: 10 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: prefersReducedMotion ? 0 : 0.3 + index * 0.08 }}
              >
                <signal.icon className="w-3.5 h-3.5 text-primary" />
                <span>{signal.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Service Cards Grid */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {serviceCategories.map((service) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap] || DocumentPremium
            const colors = colorConfig[service.color as keyof typeof colorConfig] || colorConfig.emerald
            const displayPrice = service.priceFrom
            const disabled = isServiceDisabled(service.id as ServiceId)
            const ServiceMockup = mockupMap[service.id]

            const cardContent = (
                  <div className="relative h-full">
                    {/* Temporarily unavailable badge */}
                    {disabled && (
                      <div className="absolute -top-3 left-4 right-4 z-20">
                        <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/50 text-warning text-xs font-medium">
                          <AlertCircle className="h-3 w-3" />
                          Temporarily unavailable
                        </div>
                      </div>
                    )}
                    {/* Most common badge */}
                    {service.popular && !disabled && (
                      <div className="absolute -top-3 right-4 z-20">
                        <div className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold">
                          Most common
                        </div>
                      </div>
                    )}

                    <div className={cn(
                      "relative h-full rounded-xl overflow-hidden flex flex-col",
                      "bg-white dark:bg-card",
                      "border border-border/50 dark:border-white/15",
                      "shadow-lg shadow-primary/[0.06] dark:shadow-none",
                      "transition-all duration-300",
                      disabled && "opacity-60",
                      !disabled && [
                        "hover:shadow-xl hover:shadow-primary/[0.1] hover:-translate-y-1",
                        service.popular && "ring-2 ring-primary/30 dark:ring-accent-teal/20 shadow-xl shadow-primary/[0.08] dark:shadow-none",
                      ]
                    )}>
                      {/* Product mockup */}
                      {ServiceMockup && (
                        <div className="h-[200px] overflow-hidden group-hover:-translate-y-0.5 transition-transform duration-300 flex items-center justify-center">
                          <ServiceMockup />
                        </div>
                      )}

                      <div className="p-4 pb-3 flex-1 flex flex-col">
                        {/* Icon + title row */}
                        <div className="flex items-center gap-2.5 mb-2">
                          <motion.div
                            className="relative w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 icon-spin-hover"
                            style={{ backgroundColor: colors.light }}
                          >
                            <Icon className="w-4 h-4 relative z-10" style={{ color: colors.accent }} />
                          </motion.div>
                          <div>
                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                              {service.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">From ${displayPrice.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Benefits list */}
                        {service.benefits && (
                          <ul className="space-y-1 mb-3 flex-1">
                            {service.benefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* CTA footer */}
                      <div className="px-4 pb-4">
                        {disabled ? (
                          <Button size="sm" variant="outline" className="w-full gap-1" asChild>
                            <Link href="/contact">
                              Contact us
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" className="w-full gap-1">
                            {'cta' in service ? service.cta : 'Start request'}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
            )

            return (
              <motion.div key={service.id} variants={itemVariants}>
                {disabled ? (
                  <div className="group block h-full cursor-default" aria-disabled="true">
                    {cardContent}
                  </div>
                ) : (
                  <Link
                    href={service.href || `/${service.slug}/request`}
                    className="group block h-full"
                  >
                    {cardContent}
                  </Link>
                )}
              </motion.div>
            )
          })}
        </motion.div>
        
        {/* Simple note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Private service — no Medicare rebate, but PBS subsidies may still apply at the pharmacy
        </p>
      </div>
    </section>
  )
}
