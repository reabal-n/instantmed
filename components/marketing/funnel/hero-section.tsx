'use client'

import { Phone, Shield } from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'

import { Hero } from '@/components/marketing/hero'
import { CONTACT_EMAIL } from '@/lib/constants'
import { SOCIAL_PROOF_DISPLAY } from '@/lib/social-proof'
import { cn } from '@/lib/utils'

import type { ColorClasses, ServiceFunnelConfig } from './funnel-types'

interface HeroSectionProps {
  config: ServiceFunnelConfig
  colors: ColorClasses
  isDisabled?: boolean
  /**
   * Optional mockup override for the right column. When the funnel config
   * specifies `hero.images.primary`, that photo renders by default. Pass
   * a React node here to override (e.g. /consult passes <ConsultChatMockup />).
   */
  mockupOverride?: ReactNode
}

/**
 * Funnel-page hero. Wraps the canonical <Hero> primitive and maps
 * ServiceFunnelConfig's hero block to slot props. ServiceFunnelPage
 * consumers (`/consult`, `/repeat-prescriptions`) get the same display-tier
 * h1 + Morning Canvas-consistent composition as the bespoke landing pages.
 *
 * Drops the previous bespoke composition's:
 *   - `headlineGradient` `<br>` split (just one clean H1 now)
 *   - `headlineRotatingWords` static chips (over-trusted, the funnel page
 *     has its own TrustBadgeSlider below the hero)
 *   - `highlightBadge` pseudo-CTA glow pill (was misleading — looked
 *     clickable but wasn't)
 *   - `reassurances` block (covered by the dedicated trust strips below)
 *
 * The funnel's `<TrustBadgeSlider />` directly below the hero replaces
 * the canonical Hero's trust row, so we suppress the trust row here.
 */
export function HeroSection({ config, colors, isDisabled, mockupOverride }: HeroSectionProps) {
  // Funnel-page availability pill — green chip with phone icon. Distinct from
  // the canonical home-page stars pill but the same shape and animation.
  const pill = (
    <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300">
      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
      {config.serviceId === 'med-cert'
        ? 'Med certs available 24/7'
        : `Open ${SOCIAL_PROOF_DISPLAY.operatingHours} AEST · 7 days`}
    </div>
  )

  // Mockup: explicit override > config-driven photo > nothing
  let mockup: ReactNode | null = null
  if (mockupOverride) {
    mockup = mockupOverride
  } else if (config.hero.images?.primary) {
    mockup = <FunnelHeroPhoto src={config.hero.images.primary} colors={colors} />
  }

  return (
    <Hero
      title={config.hero.headline}
      pill={pill}
      primaryCta={{
        text: isDisabled ? 'Contact us' : config.hero.ctaText,
        href: isDisabled ? `mailto:${CONTACT_EMAIL}` : config.hero.ctaHref,
      }}
      secondaryCta={null}
      mockup={mockup}
      trustRow={null}
    >
      <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-7 leading-relaxed text-balance">
        {config.hero.subheadline}
      </p>
    </Hero>
  )
}

/** Photo + AHPRA shield badge — the original funnel hero's right-column
 *  treatment, lifted into a small component now that the surrounding hero
 *  composition is owned by the canonical <Hero>. */
function FunnelHeroPhoto({ src, colors }: { src: string; colors: ColorClasses }) {
  return (
    <div className="relative">
      <div className="relative w-72 xl:w-80 aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl dark:shadow-black/40">
        <Image
          src={src}
          alt="Patient using InstantMed from home"
          fill
          className="object-cover"
          priority
          sizes="(min-width: 1024px) 320px, 0px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
      </div>

      <div className="absolute -bottom-4 -left-6 bg-white dark:bg-card rounded-2xl p-3 shadow-xl shadow-primary/[0.08] dark:shadow-none border border-border/50 dark:border-white/15">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', colors.light)}>
            <Shield className={cn('w-4 h-4', colors.text)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">AHPRA Verified Doctors</p>
          </div>
        </div>
      </div>
    </div>
  )
}
