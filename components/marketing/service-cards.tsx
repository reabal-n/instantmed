'use client'

import { motion, type Variants } from 'framer-motion'
import { AlertCircle, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'

import { ServiceIconTile } from '@/components/icons/service-icons'
import { WaitlistForm } from '@/components/marketing/waitlist-form'
import { type ServiceId,useServiceAvailability } from '@/components/providers/service-availability-provider'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/components/ui/motion'
import { serviceCategories } from '@/lib/marketing/homepage'
import { cn } from '@/lib/utils'

// Clean card style - no gradients, no colored borders

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
        hidden: { opacity: 0, y: 24 },
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
          'relative h-full rounded-xl flex flex-col p-5',
          'bg-white dark:bg-card',
          'border border-border/50 dark:border-white/10',
          'shadow-sm',
          'transition-all duration-200',
          disabled && 'opacity-60',
          !disabled && [
            'hover:shadow-lg hover:-translate-y-0.5 hover:border-border',
            service.popular && 'ring-1 ring-primary/20 shadow-md',
          ],
        )}>
          {/* Icon - compact, no glow */}
          <ServiceIconTile iconKey={service.icon} color={service.color} size="md" className="mb-4" />

          {/* Title + Price */}
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200 mb-0.5">
            {service.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            From ${service.priceFrom.toFixed(2)}
          </p>

          {/* Description */}
          <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-3">
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

          {/* Testimonial snippet */}
          {!disabled && service.testimonial && (
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
        'relative h-full rounded-xl flex flex-col p-5',
        'bg-muted/30 dark:bg-card',
        'border border-dashed border-border/60 dark:border-white/10',
      )}>
        {/* Icon */}
        <ServiceIconTile iconKey={service.icon} color={service.color} size="md" className="mb-4 opacity-40 grayscale" />

        {/* Title + Price */}
        <h3 className="text-base font-semibold text-muted-foreground mb-0.5">
          {service.title}
        </h3>
        <p className="text-sm text-muted-foreground/60 mb-2">
          From ${service.priceFrom.toFixed(2)}
        </p>

        {/* Description */}
        <p className="text-sm text-muted-foreground/60 line-clamp-2 mb-3">
          {service.description}
        </p>

        {/* Feature checkmarks (muted for coming soon) */}
        {service.benefits && (
          <ul className="space-y-1.5 mb-4 flex-1">
            {service.benefits.map((benefit, idx) => (
              <li key={idx} className={cn(
                "flex items-start gap-2 text-sm text-muted-foreground/50",
                idx >= 2 && "hidden sm:flex",
              )}>
                <Check className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 shrink-0" />
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
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
        >
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
