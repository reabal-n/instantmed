'use client'

import { AlertCircle, ArrowRight, Check, Clock } from 'lucide-react'
import Link from 'next/link'

import { ServiceIconTile } from '@/components/icons/service-icons'
import { useServiceAvailability } from '@/components/providers/service-availability-provider'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { Reveal } from '@/components/ui/reveal'
import { SectionPill } from '@/components/ui/section-pill'
import { PRICING_DISPLAY } from '@/lib/constants'
import { serviceCategories } from '@/lib/marketing/homepage'
import { cn } from '@/lib/utils'

/** Cap visible benefit lines per service card. Keeps card density predictable
 *  and stops one service "winning" because it has more bullet copy. */
const VISIBLE_BENEFITS = 2

interface ServiceCardProps {
  service: (typeof serviceCategories)[number]
  disabled: boolean
}

function ServiceCard({ service, disabled }: ServiceCardProps) {
  const priceLabel = service.comingSoon
    ? null
    : service.pricePrefix
      ? `${service.pricePrefix} ${service.price}`
      : service.price

  return (
    <Link
      href={service.href || `/${service.slug}/request`}
      className={cn(
        'group block h-full min-w-0 max-w-full',
        disabled && 'pointer-events-none',
      )}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
    >
      <div className="relative h-full">
        {/* Temporarily unavailable badge */}
        {disabled && (
          <div className="absolute -top-3 left-4 right-4 z-20">
            <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-warning text-xs font-medium">
              <AlertCircle className="h-3 w-3" />
              Temporarily unavailable
            </div>
          </div>
        )}

        {/* Most popular badge. Sits fully INSIDE the card on mobile (top-3
            keeps it tucked in the card header area), then lifts slightly
            above the card edge on sm+ where there's room to breathe. The
            old -top-3 across all breakpoints crowded the top edge on
            narrow viewports. Tier 1 video-review fix 2026-05-26
            (homepage-5jc7). */}
        {service.popular && !disabled && (
          <div className="absolute top-3 sm:-top-2.5 right-4 z-20">
            <div className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm">
              Most popular
            </div>
          </div>
        )}

        <div className={cn(
          'relative h-full rounded-xl flex flex-col p-5',
          // Extra top padding on mobile-only popular cards so the inset
          // badge (top-3 on mobile) doesn't sit on top of the icon. The
          // padding only applies on mobile because sm+ lifts the badge
          // out of the card.
          service.popular && !disabled && 'pt-12 sm:pt-5',
          'bg-white dark:bg-card',
          'border border-border/50 dark:border-white/10',
          'shadow-sm',
          'transition-[transform,box-shadow,border-color] duration-200',
          disabled && 'opacity-60',
          !disabled && [
            'hover:shadow-lg hover:-translate-y-0.5 hover:border-border',
            service.popular && 'ring-1 ring-primary/20 shadow-md',
          ],
        )}>
          {/* Icon */}
          <ServiceIconTile iconKey={service.icon} color={service.color} size="lg" className="mb-4" variant="sticker" stickerLoading="eager" />

          {/* Title + Price */}
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200 mb-0.5">
            {service.title}
          </h3>
          {priceLabel && (
            <p className="text-sm text-muted-foreground mb-2">
              {priceLabel}
            </p>
          )}

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {service.description}
          </p>

          {/* Feature checkmarks — capped to VISIBLE_BENEFITS (2). Per-card
              social proof removed so service cards stay scannable. */}
          {service.benefits && (
            <ul className="space-y-1.5 mb-4 flex-1">
              {service.benefits.slice(0, VISIBLE_BENEFITS).map((benefit, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
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
    <div className={cn(
      'rounded-xl border border-dashed border-border/50 bg-muted/25 px-4 py-3.5',
      'dark:border-white/10 dark:bg-white/[0.03]',
    )}>
      <div className="flex items-start gap-3">
        <ServiceIconTile
          iconKey={service.icon}
          color={service.color}
          size="sm"
          className="mt-0.5 opacity-55 grayscale"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {service.title}
            </h3>
            {/* Planned pill. Was text-muted-foreground (slate-600) on a
                70%-opacity ivory bg, which sat at the AA contrast floor
                for 10px uppercase. Slate-700 text on a solid ivory bg
                is 9.4:1, comfortably AA-large + AA-normal. Tier 1
                video-review fix 2026-05-26 (homepage-clkf). */}
            <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200">
              Planned
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ServiceCards() {
  const { isServiceDisabled } = useServiceAvailability()

  const activeServices = serviceCategories.filter((s) => !('comingSoon' in s && s.comingSoon))
  const comingSoonServices = serviceCategories.filter((s) => 'comingSoon' in s && s.comingSoon)

  return (
    <section id="pricing" className="py-10 sm:py-16 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Reveal instant className="text-center mb-8 sm:mb-10 lg:mb-12">
          <div className="mb-4">
            <SectionPill>Services &amp; pricing</SectionPill>
          </div>
          <Heading level="h1" as="h2" className="mb-3 sm:mb-4">
            What do you need?
          </Heading>
          {/* Pricing anchor — answers "can I afford this?" before users click in */}
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-1">
            From {' '}
            <span className="font-semibold text-foreground">{PRICING_DISPLAY.MED_CERT}</span>
            {' '}&middot; No Medicare needed for medical certificates &middot; Pay once
          </p>
          <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary" />
            Med cert requests stay open 24/7
          </p>
        </Reveal>

        {/* Active Service Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          {activeServices.map((service, i) => {
            const disabled = isServiceDisabled(service.id)
            return (
              <Reveal key={service.id} delay={i * 0.05} className="min-w-0">
                <ServiceCard service={service} disabled={disabled} />
              </Reveal>
            )
          })}
        </div>

        {/* Note */}
        <p className="text-center text-xs text-muted-foreground mb-10 sm:mb-14">
          Private service. No Medicare rebate, but PBS subsidies may still apply at the pharmacy.
        </p>

        {/* NOTE: the descriptive money-page links that used to sit here moved to
            the server-rendered <HomeServiceLinks /> block in app/(marketing)/page.tsx
            so they ship in raw HTML (this component is dynamically imported, so its
            links only reached the streamed RSC payload — a weak crawl signal). */}

        {/* Coming soon teaser: compact preview only, not a waitlist surface. */}
        {comingSoonServices.length > 0 && (
          <div className="border-t border-border/40 pt-7 sm:pt-8">
            <Reveal instant className="mx-auto mb-4 max-w-2xl text-center">
              {/* Eyebrow + subtext bumped from text-muted-foreground to
                  foreground-tinted values so the 12px tracked uppercase
                  comfortably clears WCAG AA on ivory. The earlier pass
                  used muted-foreground which sat at the AA floor for
                  small tracked text. Tier 1 video-review fix 2026-05-26
                  (homepage-clkf). */}
              <p className="text-xs font-semibold text-foreground/80 uppercase tracking-[0.12em] mb-1">Coming next</p>
              <p className="text-sm text-foreground/70">Not taking requests yet. A small preview of services being prepared.</p>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2 max-w-3xl mx-auto">
              {comingSoonServices.map((service, i) => (
                <Reveal key={service.id} delay={i * 0.05}>
                  <ComingSoonCard service={service} />
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
