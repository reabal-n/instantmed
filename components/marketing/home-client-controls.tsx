"use client"

import { useEffect, useState } from "react"

import { hasScrolledPastTarget, StickyCTA } from "@/components/marketing/shared/sticky-cta"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { PRICING_DISPLAY } from "@/lib/constants"
import { useLandingAnalytics } from "@/lib/hooks/use-landing-analytics"
import { HOME_HERO_CTA_ID } from "@/lib/marketing/home-anchors"
import { GUARANTEE } from "@/lib/marketing/voice"

const HOME_CTA_LOCATIONS = new Set(["hero", "how_it_works"])

/**
 * Home sticky CTA. Mirrors med-cert-client-controls.tsx: observe the hero CTA
 * wrapper, show the quick-purchase bar once it scrolls out. The home page
 * body stays server-rendered; this island owns the bar and the delegated
 * click tracking for the page's data-home-cta controls.
 */
export function HomeClientControls() {
  // During the platform kill switch the bar must not offer an active request
  // link, and its contact clicks must not count as CTA engagement. Tracking
  // stays on while availability loads: the page presents an enabled action
  // then, so those clicks are real engagement.
  const { maintenanceMode } = useServiceAvailability()
  const analytics = useLandingAnalytics("home", null, !maintenanceMode)
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  useEffect(() => {
    const el = document.getElementById(HOME_HERO_CTA_ID)
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(hasScrolledPastTarget(entry)),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The page body is server-rendered, so its CTAs cannot call the tracker;
  // they carry data-home-cta and this island reports the click (the
  // medical-certificate controls use the same pattern).
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const location = target.closest<HTMLElement>("[data-home-cta]")?.dataset.homeCta
      if (!location || !HOME_CTA_LOCATIONS.has(location)) return
      analytics.trackCTAClick(location as Parameters<typeof analytics.trackCTAClick>[0])
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [analytics])

  return (
    <StickyCTA
      show={showStickyCTA}
      ctaText="Get started"
      ctaHref="/request"
      isDisabled={maintenanceMode}
      mobileSummary={`From ${PRICING_DISPLAY.MED_CERT} · ${GUARANTEE}`}
      onCTAClick={() => analytics.trackCTAClick("sticky_mobile")}
    />
  )
}
