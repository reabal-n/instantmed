"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { StickyCTA } from "@/components/marketing/shared/sticky-cta"
import { UnavailableBanner } from "@/components/marketing/shared/unavailable-banner"
import { type ServiceId,useServiceAvailability } from "@/components/providers/service-availability-provider"
import { Navbar } from "@/components/shared/navbar"
import { ReturningPatientBanner } from "@/components/shared/returning-patient-banner"
import { normalizeIncomingGrowthExperienceVersion } from "@/lib/growth/specialty-experience-attribution"
import {
  normalizeSpecialtyExperienceVersion,
  type SpecialtyExperienceService,
  type SpecialtyExperienceVersion,
} from "@/lib/growth/specialty-experiences"
import { useLandingAnalytics } from "@/lib/hooks/use-landing-analytics"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LandingPageConfig {
  /** Service ID for availability check */
  serviceId: ServiceId
  /** Analytics service name */
  analyticsId: string
  /** Code-owned specialty landing cohort. Flags and analytics never assign it. */
  growthExperience?: {
    service: SpecialtyExperienceService
    version: string | null
  }
  /** Sticky CTA configuration */
  sticky: {
    ctaText: string
    ctaHref: string
    mobileSummary: string
    mobileFooter?: React.ReactNode
    responseTime?: string
  }
}

export interface LandingPageChildrenProps {
  isDisabled: boolean
  heroCTARef: React.RefObject<HTMLDivElement>
  analytics: ReturnType<typeof useLandingAnalytics>
  requestCtaHref: string
  handleHeroCTA: () => void
  handleHowItWorksCTA: () => void
  handlePricingCTA: () => void
  handleFinalCTA: () => void
  handleStickyCTA: () => void
  handleFAQOpen: (question: string, index: number) => void
}

export function resolveLandingGrowthExperienceVersion(
  service: SpecialtyExperienceService,
  version: unknown,
): SpecialtyExperienceVersion | null {
  return normalizeSpecialtyExperienceVersion(version, service, "landing")
}

export function buildGrowthExperienceRequestHref(
  href: string,
  growthExperienceVersion: SpecialtyExperienceVersion | null,
): string {
  if (!growthExperienceVersion || !href.startsWith("/request") || href.startsWith("//")) {
    return href
  }

  let requestUrl: URL
  try {
    requestUrl = new URL(href, "https://instantmed.local")
  } catch {
    return href
  }
  if (requestUrl.pathname !== "/request") return href

  const validatedVersion = normalizeIncomingGrowthExperienceVersion(
    growthExperienceVersion,
    {
      serviceType: requestUrl.searchParams.get("service"),
      subtype: requestUrl.searchParams.get("subtype"),
    },
  )
  if (!validatedVersion) return href

  requestUrl.searchParams.set("growth_experience_version", validatedVersion)
  return `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`
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
  const growthExperienceVersion = config.growthExperience
    ? resolveLandingGrowthExperienceVersion(
      config.growthExperience.service,
      config.growthExperience.version,
    )
    : null
  const analytics = useLandingAnalytics(config.analyticsId, growthExperienceVersion)

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
  const handlePricingCTA = useCallback(() => analytics.trackCTAClick("pricing"), [analytics])
  const handleFinalCTA = useCallback(() => analytics.trackCTAClick("final_cta"), [analytics])
  const handleStickyCTA = useCallback(() => analytics.trackCTAClick("sticky_mobile"), [analytics])
  const handleFAQOpen = useCallback((question: string, index: number) => analytics.trackFAQOpen(question, index), [analytics])

  const requestCtaHref = buildGrowthExperienceRequestHref(
    config.sticky.ctaHref,
    growthExperienceVersion,
  )
  const stickyHref = isDisabled ? "/contact" : requestCtaHref
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
            requestCtaHref,
            handleHeroCTA,
            handleHowItWorksCTA,
            handlePricingCTA,
            handleFinalCTA,
            handleStickyCTA,
            handleFAQOpen,
          })}
        </main>

        <MarketingFooter />

        {afterFooter}

        <StickyCTA
          show={showStickyCTA}
          ctaText={stickyCtaText}
          ctaHref={stickyHref}
          mobileSummary={config.sticky.mobileSummary}
          isDisabled={isDisabled}
          onCTAClick={handleStickyCTA}
          mobileFooter={config.sticky.mobileFooter}
          responseTime={config.sticky.responseTime}
        />
      </div>
    </MarketingPageShell>
  )
}
