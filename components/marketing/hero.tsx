import { ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { HeroCertifications } from '@/components/marketing/hero-certifications'
import { ProductReviewBadge } from '@/components/marketing/product-review-badge'
import { WaitCounter } from '@/components/marketing/wait-counter'
import { ServiceAvailabilityGate, type ServiceId } from '@/components/providers/service-availability-provider'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import type { WaitState } from '@/lib/brand/wait-counter'
import { buildMedCertSpeedClaimFromWaitState } from '@/lib/marketing/speed-claims'
import { GUARANTEE } from '@/lib/marketing/voice'
import { cn } from '@/lib/utils'

interface CtaConfig {
  text: string
  href: string
  /** Click handler, e.g. for analytics. */
  onClick?: () => void
  /** Optional ref to scroll into view on sticky-bar interactions. */
  ref?: React.RefObject<HTMLDivElement>
  /** Optional stable wrapper id for a route-owned observer. */
  wrapperId?: string
  /** Data attributes consumed by a narrow analytics control island. */
  dataAttributes?: Record<`data-${string}`, string>
}

interface SecondaryCtaConfig {
  text: string
  /** href starting with `#` will smooth-scroll to an in-page anchor. */
  href: string
}

interface HeroProps {
  className?: string
  title?: ReactNode
  titleClassName?: string
  /** Hide service-specific timing, reassurance and reviews while unavailable. */
  availabilityServiceId?: ServiceId
  /** A general hero can show timing from a different, specific service. */
  timingServiceId?: ServiceId
  children?: ReactNode
  primaryCta?: CtaConfig
  primaryCtaContent?: ReactNode
  secondaryCta?: SecondaryCtaConfig | null
  beforeCta?: ReactNode
  reassuranceRow?: ReactNode | null
  mockup: ReactNode | null
  mockupClassName?: string
  /** Server-fed certificate timing; never inferred from static marketing data. */
  liveWait?: WaitState
  showReviews?: boolean
  /** LegitScript + Google certification marks beside the reviews. On for every landing hero. */
  showCertifications?: boolean
}

export function Hero({
  className, title = 'Healthcare that fits your day.', titleClassName,
  availabilityServiceId, timingServiceId, children,
  primaryCta = { text: 'Get started', href: '/request' }, primaryCtaContent,
  secondaryCta, beforeCta, reassuranceRow, mockup, mockupClassName,
  liveWait, showReviews = true, showCertifications = true,
}: HeroProps) {
  const hasTiming = liveWait && buildMedCertSpeedClaimFromWaitState(liveWait).status === 'under_hour'
  const status = hasTiming ? <WaitCounter state={liveWait} /> : null
  const primaryButtonClassName = "h-auto min-h-12 rounded-lg px-6 py-3 text-base font-semibold whitespace-normal shadow-sm shadow-primary/15"
  const reassurance = reassuranceRow === undefined ? (
    <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
      <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      {GUARANTEE}
    </p>
  ) : reassuranceRow

  return (
    <section data-hero="" className={cn('relative overflow-x-clip pt-8 pb-8 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-10', className)}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0 text-left">
            {status && <ServiceAvailabilityGate serviceId={timingServiceId ?? availabilityServiceId}>
              <div data-hero-status="" className="mb-5 max-w-lg">{status}</div>
            </ServiceAvailabilityGate>}
            <Heading level="display" className={cn('mb-5 hyphens-none text-balance', titleClassName)}>{title}</Heading>
            <div>{children ?? <p className="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">Start with a secure form. Care from AHPRA-registered Australian doctors.</p>}</div>
            {beforeCta && <div className="mb-6">{beforeCta}</div>}
            <div id={primaryCta.wrapperId} ref={primaryCta.ref} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {primaryCtaContent ?? <ServiceAvailabilityGate serviceId={availabilityServiceId} fallback={
                <Button asChild size="lg" className={primaryButtonClassName}>
                  <Link href="/contact">Contact us<ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" /></Link>
                </Button>
              }>
                <Button asChild size="lg" className={primaryButtonClassName} onClick={primaryCta.onClick}>
                  <Link href={primaryCta.href} {...primaryCta.dataAttributes}>{primaryCta.text}<ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" /></Link>
                </Button>
              </ServiceAvailabilityGate>}
              {secondaryCta && <Button asChild variant="ghost" size="lg" className="h-auto min-h-12 px-4 py-3 text-base text-muted-foreground"><Link href={secondaryCta.href}>{secondaryCta.text}</Link></Button>}
            </div>
            <ServiceAvailabilityGate serviceId={availabilityServiceId}>
              {reassurance && <div data-hero-reassurance="" className="mt-3">{reassurance}</div>}
            </ServiceAvailabilityGate>
            <div data-hero-proof="" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              {showReviews && <ServiceAvailabilityGate serviceId={availabilityServiceId}>
                <div data-hero-reviews=""><ProductReviewBadge /></div>
              </ServiceAvailabilityGate>}
              {showCertifications && <HeroCertifications className="border-border/60 sm:border-l sm:pl-5" />}
            </div>
          </div>
          {mockup && <div data-hero-mockup="" className={cn('relative min-w-0 w-full max-w-md justify-self-center', mockupClassName)}>{mockup}</div>}
        </div>
      </div>
    </section>
  )
}
