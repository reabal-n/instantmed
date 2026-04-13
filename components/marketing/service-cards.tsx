'use client'

import { motion, type Variants } from 'framer-motion'
import { AlertCircle, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'

import { ServiceIconTile } from '@/components/icons/service-icons'
import { WaitlistForm } from '@/components/marketing/waitlist-form'
import { type ServiceId,useServiceAvailability } from '@/components/providers/service-availability-provider'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/components/ui/motion'
import { SectionPill } from '@/components/ui/section-pill'
import { serviceCategories } from '@/lib/marketing/homepage'
import { cn } from '@/lib/utils'

// Service color → gradient background + accent border
const colorThemeMap: Record<string, { gradient: string; border: string; iconGlow: string }> = {
  emerald: { gradient: 'from-emerald-50/80 to-white dark:from-emerald-950/15 dark:to-card', border: 'border-t-emerald-500', iconGlow: 'shadow-emerald-500/20' },
  cyan:    { gradient: 'from-cyan-50/80 to-white dark:from-cyan-950/15 dark:to-card',    border: 'border-t-cyan-500',    iconGlow: 'shadow-cyan-500/20' },
  blue:    { gradient: 'from-indigo-50/80 to-white dark:from-indigo-950/15 dark:to-card', border: 'border-t-indigo-500',  iconGlow: 'shadow-indigo-500/20' },
  violet:  { gradient: 'from-violet-50/80 to-white dark:from-violet-950/15 dark:to-card', border: 'border-t-violet-500',  iconGlow: 'shadow-violet-500/20' },
  pink:    { gradient: 'from-pink-50/80 to-white dark:from-pink-950/15 dark:to-card',    border: 'border-t-pink-500',    iconGlow: 'shadow-pink-500/20' },
  rose:    { gradient: 'from-rose-50/80 to-white dark:from-rose-950/15 dark:to-card',    border: 'border-t-rose-500',    iconGlow: 'shadow-rose-500/20' },
}
const defaultTheme = { gradient: 'from-primary/5 to-white dark:from-primary/5 dark:to-card', border: 'border-t-primary', iconGlow: 'shadow-primary/20' }

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
        hidden: { y: 24 },
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
          'bg-gradient-to-br',
          (colorThemeMap[service.color] || defaultTheme).gradient,
          'border border-border/40',
          'border-t-2',
          (colorThemeMap[service.color] || defaultTheme).border,
          'shadow-md shadow-primary/[0.06]',
          'transition-all duration-300',
          disabled && 'opacity-60',
          !disabled && [
            'hover:shadow-xl hover:shadow-primary/[0.1] hover:-translate-y-1 hover:border-primary/30',
            service.popular && 'ring-2 ring-primary/50 dark:ring-primary/30 shadow-xl shadow-primary/[0.1]',
          ],
        )}>
          {/* Icon - larger presence with glow */}
          <ServiceIconTile iconKey={service.icon} color={service.color} size="lg" className={cn('mb-4 shadow-lg', (colorThemeMap[service.color] || defaultTheme).iconGlow)} />

          {/* Title + Price */}
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300 mb-0.5">
            {service.title}
          </h3>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            From ${service.priceFrom.toFixed(2)}
          </p>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {service.description}
          </p>

          {/* Feature checkmarks */}
          {service.benefits && (
            <ul className="space-y-1.5 mb-4 flex-1">
              {service.benefits.map((benefit, idx) => (
                <li key={idx} className={cn(
                  "flex items-start gap-2 text-sm text-muted-foreground",
                  idx >= 2 && "hidden sm:flex",
                )}>
                  <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          )}

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
              {service.cta || 'Get started'}
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}

          {/* Testimonial snippet on popular card */}
          {service.popular && !disabled && service.testimonial && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                &ldquo;{service.testimonial.quote}&rdquo;
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                - {service.testimonial.author}
              </p>
            </div>
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
        'bg-gradient-to-br',
        (colorThemeMap[service.color] || defaultTheme).gradient,
        'border border-border/40',
        'border-t-2',
        (colorThemeMap[service.color] || defaultTheme).border,
        'shadow-md shadow-primary/[0.06]',
        'opacity-75',
      )}>
        {/* Icon */}
        <ServiceIconTile iconKey={service.icon} color={service.color} size="lg" className="mb-4 grayscale opacity-60" />

        {/* Title + Price */}
        <h3 className="text-base font-semibold text-foreground mb-0.5">
          {service.title}
        </h3>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          From ${service.priceFrom.toFixed(2)}
        </p>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {service.description}
        </p>

        {/* Feature checkmarks (muted for coming soon) */}
        {service.benefits && (
          <ul className="space-y-1.5 mb-4 flex-1">
            {service.benefits.map((benefit, idx) => (
              <li key={idx} className={cn(
                "flex items-start gap-2 text-sm text-muted-foreground/70",
                idx >= 2 && "hidden sm:flex",
              )}>
                <Check className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        )}

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
    <section id="pricing" className="py-10 sm:py-16 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-8 sm:mb-10 lg:mb-12"
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
        >
          <div className="mb-4">
            <SectionPill>Services</SectionPill>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight mb-3 sm:mb-4">
            What do you need?
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-2">
            Pick a service. Pay a flat fee. No sign-up needed.
          </p>
          <p className="hidden sm:block text-sm text-muted-foreground/70">
            {serviceCategories.length} services &middot; {comingSoonServices.length} more coming
          </p>
        </motion.div>

        {/* Service Cards Grid */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0 }}
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
          Private service - no Medicare rebate, but PBS subsidies may still apply at the pharmacy
        </p>
      </div>
    </section>
  )
}
