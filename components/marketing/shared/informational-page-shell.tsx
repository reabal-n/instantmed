"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { MarketingFooter } from "@/components/marketing/footer"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { StickyCTA } from "@/components/marketing/shared/sticky-cta"
import { Navbar } from "@/components/shared"
import { useReducedMotion } from "@/components/ui/motion"
import { useLandingAnalytics } from "@/lib/hooks/use-landing-analytics"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InformationalPageConfig {
  /** Analytics page name (e.g. "homepage", "pricing", "faq") */
  analyticsId: string
  /** Optional sticky CTA. Pass false or omit to disable. */
  sticky?: {
    ctaText: string
    ctaHref: string
    mobileSummary: string
    desktopLabel?: string
    priceLabel?: string
    desktopCtaText?: string
    mobileFooter?: React.ReactNode
  } | false
}

export interface InformationalPageChildrenProps {
  analytics: ReturnType<typeof useLandingAnalytics>
  prefersReducedMotion: boolean
  handleFAQOpen: (question: string, index: number) => void
}

interface InformationalPageShellProps {
  config: InformationalPageConfig
  children: (props: InformationalPageChildrenProps) => React.ReactNode
  /** Optional content rendered after footer (SEO content, content hub links) */
  afterFooter?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InformationalPageShell({ config, children, afterFooter }: InformationalPageShellProps) {
  const heroCTARef = useRef<HTMLDivElement>(null!)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const analytics = useLandingAnalytics(config.analyticsId)

  const hasSticky = !!config.sticky

  useEffect(() => {
    if (!hasSticky) return
    const el = heroCTARef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasSticky])

  const handleFAQOpen = useCallback(
    (question: string, index: number) => analytics.trackFAQOpen(question, index),
    [analytics]
  )

  return (
    <MarketingPageShell>
      <div className="min-h-screen overflow-x-hidden">
        <Navbar variant="marketing" />

        {/* Invisible anchor for sticky CTA intersection observer */}
        {hasSticky && <div ref={heroCTARef} />}

        <main className="relative">
          {children({ analytics, prefersReducedMotion, handleFAQOpen })}
        </main>

        <MarketingFooter />

        {afterFooter}

        {hasSticky && config.sticky && (
          <StickyCTA
            show={showStickyCTA}
            ctaText={config.sticky.ctaText}
            ctaHref={config.sticky.ctaHref}
            mobileSummary={config.sticky.mobileSummary}
            desktopLabel={config.sticky.desktopLabel}
            priceLabel={config.sticky.priceLabel}
            desktopCtaText={config.sticky.desktopCtaText}
            onCTAClick={() => analytics.trackCTAClick("sticky_mobile")}
            mobileFooter={config.sticky.mobileFooter}
          />
        )}
      </div>
    </MarketingPageShell>
  )
}
