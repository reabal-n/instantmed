import { CTABanner } from '@/components/sections'

import type { ServiceFunnelConfig } from './funnel-types'

interface FinalCtaSectionProps {
  config: ServiceFunnelConfig
  isDisabled?: boolean
}

/**
 * Funnel-page final CTA. Now a thin wrapper around the shared <CTABanner>
 * primitive so every service page (funnel-shelled or bespoke landing)
 * shares the same final-CTA pattern.
 *
 * Refund line auto-renders from GUARANTEE constant inside CTABanner.
 *
 * Pre-Pass-3 implementation rendered a bespoke gradient section with
 * white-on-color typography. Retired here in favor of the canonical
 * white-card pattern used everywhere else on the site — premium peer
 * pages (Stripe / Linear) keep CTAs consistent rather than gradient-ing
 * each one differently.
 */
export function FinalCtaSection({ config, isDisabled }: FinalCtaSectionProps) {
  return (
    <CTABanner
      title={config.finalCta.headline}
      subtitle={config.finalCta.subheadline}
      ctaText={config.finalCta.ctaText}
      ctaHref={config.hero.ctaHref}
      isDisabled={isDisabled}
      price={config.pricing.price}
      microcopy="Takes about 2 minutes."
    />
  )
}
