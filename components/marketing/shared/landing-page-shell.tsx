"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing/footer"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { UnavailableBanner } from "@/components/marketing/shared/unavailable-banner"
import { StickyCTA } from "@/components/marketing/shared/sticky-cta"
import { useReducedMotion } from "@/components/ui/motion"
import { useServiceAvailability, type ServiceId } from "@/components/providers/service-availability-provider"
import { useLandingAnalytics } from "@/lib/hooks/use-landing-analytics"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LandingPageConfig {
  /** Service ID for availability check */
  serviceId: ServiceId
  /** Analytics service name */
  analyticsId: string
  /** Sticky CTA configuration */
  sticky: {
    ctaText: string
    ctaHref: string
    mobileSummary: string
    desktopLabel?: string
    priceLabel?: string
    desktopCtaText?: string
    mobileFooter?: React.ReactNode
    pricingScrollTarget?: string
    responseTime?: string
  }
}

export interface LandingPageChildrenProps {
  isDisabled: boolean
  heroCTARef: React.RefObject<HTMLDivElement>
  analytics: ReturnType<typeof useLandingAnalytics>
  handleHeroCTA: () => void
  handleHowItWorksCTA: () => void
  handleFinalCTA: () => void
  handleStickyCTA: () => void
  handleFAQOpen: (question: string, index: number) => void
  prefersReducedMotion: boolean
}

interface LandingPageShellProps {
  config: LandingPageConfig
  children: (props: LandingPageChildrenProps) => React.ReactNode
  /** Optional content rendered after footer (SEO content, content hub links) */
  afterFooter?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LandingPageShell({ config, children, afterFooter }: LandingPageShellProps) {
  const isDisabled = useServiceAvailability().isServiceDisabled(config.serviceId)
  const heroCTARef = useRef<HTMLDivElement>(null!)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const analytics = useLandingAnalytics(config.analyticsId)

  useEffect(() => {
    const el = heroCTARef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleHeroCTA = useCallback(() => analytics.trackCTAClick("hero"), [analytics])
  const handleHowItWorksCTA = useCallback(() => analytics.trackCTAClick("how_it_works"), [analytics])
  const handleFinalCTA = useCallback(() => analytics.trackCTAClick("final_cta"), [analytics])
  const handleStickyCTA = useCallback(() => analytics.trackCTAClick("sticky_mobile"), [analytics])
  const handleFAQOpen = useCallback((question: string, index: number) => analytics.trackFAQOpen(question, index), [analytics])

  const stickyHref = isDisabled ? "/contact" : config.sticky.ctaHref
  const stickyCtaText = isDisabled ? "Contact us" : config.sticky.ctaText

  return (
    <MarketingPageShell>
      <div className="min-h-screen overflow-x-hidden">
        <UnavailableBanner show={isDisabled} />
        <ReturningPatientBanner className="mx-4 mt-2" />
        <Navbar variant="marketing" />

        <main className="relative">
          {children({
            isDisabled,
            heroCTARef,
            analytics,
            handleHeroCTA,
            handleHowItWorksCTA,
            handleFinalCTA,
            handleStickyCTA,
            handleFAQOpen,
            prefersReducedMotion,
          })}
        </main>

        <MarketingFooter />

        {afterFooter}

        <StickyCTA
          show={showStickyCTA}
          ctaText={stickyCtaText}
          ctaHref={stickyHref}
          mobileSummary={config.sticky.mobileSummary}
          desktopLabel={config.sticky.desktopLabel}
          priceLabel={isDisabled ? undefined : config.sticky.priceLabel}
          desktopCtaText={isDisabled ? "Contact us" : config.sticky.desktopCtaText}
          isDisabled={isDisabled}
          onCTAClick={handleStickyCTA}
          mobileFooter={config.sticky.mobileFooter}
          pricingScrollTarget={config.sticky.pricingScrollTarget}
          responseTime={config.sticky.responseTime}
        />
      </div>
    </MarketingPageShell>
  )
}
