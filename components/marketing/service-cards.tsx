'use client'

import Link from 'next/link'
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react'
import { serviceCategories } from '@/lib/marketing/homepage'
import { motion, type Variants } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { DocumentPremium, PillPremium, StethoscopePremium } from '@/components/icons/certification-logos'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useServiceAvailability, type ServiceId } from '@/components/providers/service-availability-provider'
import { WaitlistForm } from '@/components/marketing/waitlist-form'

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  FileText: DocumentPremium,
  Pill: PillPremium,
  Stethoscope: StethoscopePremium,
  Sparkles: Sparkles,
}

const colorConfig: Record<string, {
  accent: string
  light: string
}> = {
  emerald: { accent: '#059669', light: 'rgba(5, 150, 105, 0.08)' },
  cyan: { accent: '#0891b2', light: 'rgba(8, 145, 178, 0.08)' },
  blue: { accent: '#3B82F6', light: 'rgba(59, 130, 246, 0.08)' },
  violet: { accent: '#8B5CF6', light: 'rgba(139, 92, 246, 0.08)' },
  pink: { accent: '#EC4899', light: 'rgba(236, 72, 153, 0.08)' },
  rose: { accent: '#F43F5E', light: 'rgba(244, 63, 94, 0.08)' },
}

function useServiceCardVariants() {
  const prefersReducedMotion = useReducedMotion()

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.1 },
    },
  }

  const itemVariants: Variants = prefersReducedMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { y: 24, opacity: 0 },
        visible: {
          y: 0,
          opacity: 1,
          transition: {
            duration: 0.45,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }

  return { containerVariants, itemVariants, prefersReducedMotion }
}

interface ServiceCardProps {
  service: (typeof serviceCategories)[number]
  disabled: boolean
}

function ServiceCard({ service, disabled }: ServiceCardProps) {
  const Icon = iconMap[service.icon] || DocumentPremium
  const colors = colorConfig[service.color] || colorConfig.emerald

  return (
    <Link
      href={service.href || `/${service.slug}/request`}
      className={cn(
        'group block h-full',
        disabled && 'pointer-events-none',
      )}
      aria-disabled={disabled || undefined}
    >
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

        {/* Most popular badge */}
        {service.popular && !disabled && (
          <div className="absolute -top-3 right-4 z-20">
            <div className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold">
              Most popular
            </div>
          </div>
        )}

        <div className={cn(
          'relative h-full rounded-xl overflow-hidden flex flex-col p-5',
          'bg-white dark:bg-card',
          'border border-border/50',
          'shadow-md shadow-primary/[0.06]',
          'transition-all duration-300',
          disabled && 'opacity-60',
          !disabled && [
            'hover:shadow-xl hover:shadow-primary/[0.1] hover:-translate-y-1',
            service.popular && 'ring-2 ring-primary/30 dark:ring-accent-teal/20 shadow-xl shadow-primary/[0.08]',
          ],
        )}>
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
            style={{ backgroundColor: colors.light }}
          >
            <Icon className="w-5 h-5" style={{ color: colors.accent }} />
          </div>

          {/* Title + Price */}
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300 mb-0.5">
            {service.title}
          </h3>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            From ${service.priceFrom.toFixed(2)}
          </p>

          {/* Description (2-line) */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {service.description}
          </p>

          {/* CTA */}
          {disabled ? (
            <Button size="sm" variant="outline" className="w-full gap-1" asChild>
              <span>
                Contact us
                <ArrowRight className="h-3 w-3" />
              </span>
            </Button>
          ) : (
            <Button size="sm" className="w-full gap-1">
              {service.cta || 'Start request'}
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  )
}

interface ComingSoonCardProps {
  service: (typeof serviceCategories)[number]
}

function ComingSoonCard({ service }: ComingSoonCardProps) {
  const Icon = iconMap[service.icon] || DocumentPremium
  const colors = colorConfig[service.color] || colorConfig.emerald

  return (
    <div className="relative h-full">
      {/* Coming Soon badge */}
      <div className="absolute -top-3 right-4 z-20">
        <div className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-semibold">
          Coming Soon
        </div>
      </div>

      <div className={cn(
        'relative h-full rounded-xl overflow-hidden flex flex-col p-5',
        'bg-white dark:bg-card',
        'border border-border/50',
        'shadow-md shadow-primary/[0.06]',
        'opacity-75',
      )}>
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
          style={{ backgroundColor: colors.light }}
        >
          <Icon className="w-5 h-5" style={{ color: colors.accent }} />
        </div>

        {/* Title + Price */}
        <h3 className="text-base font-semibold text-foreground mb-0.5">
          {service.title}
        </h3>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          From ${service.priceFrom.toFixed(2)}
        </p>

        {/* Description (2-line) */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
          {service.description}
        </p>

        {/* Waitlist CTA */}
        <WaitlistForm serviceId={service.id} />
      </div>
    </div>
  )
}

export function ServiceCards() {
  const { containerVariants, itemVariants, prefersReducedMotion } = useServiceCardVariants()
  const { isServiceDisabled } = useServiceAvailability()

  const activeServices = serviceCategories.filter((s) => !('comingSoon' in s && s.comingSoon))
  const comingSoonServices = serviceCategories.filter((s) => 'comingSoon' in s && s.comingSoon)

  return (
    <section id="pricing" className="py-20 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-2">
            Flat pricing. No hidden fees. No account needed to start.
          </p>
          <p className="text-sm text-muted-foreground/70">
            {serviceCategories.length} services &middot; {comingSoonServices.length} more coming
          </p>
        </motion.div>

        {/* Service Cards Grid */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {activeServices.map((service) => {
            const disabled = isServiceDisabled(service.id as ServiceId)
            return (
              <motion.div key={service.id} variants={itemVariants}>
                <ServiceCard service={service} disabled={disabled} />
              </motion.div>
            )
          })}

          {comingSoonServices.map((service) => (
            <motion.div key={service.id} variants={itemVariants}>
              <ComingSoonCard service={service} />
            </motion.div>
          ))}
        </motion.div>

        {/* Note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Private service — no Medicare rebate, but PBS subsidies may still apply at the pharmacy
        </p>
      </div>
    </section>
  )
}
