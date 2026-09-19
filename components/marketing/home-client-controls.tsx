"use client"

import { useEffect, useState } from "react"

import { StickyCTA } from "@/components/marketing/shared/sticky-cta"
import { PRICING_DISPLAY } from "@/lib/constants"
import { useLandingAnalytics } from "@/lib/hooks/use-landing-analytics"
import { HOME_HERO_CTA_ID } from "@/lib/marketing/home-anchors"
import { GUARANTEE } from "@/lib/marketing/voice"

/**
 * Home sticky CTA. Mirrors med-cert-client-controls.tsx: observe the hero CTA
 * wrapper, show the quick-purchase bar once it scrolls out. The home page
 * body stays server-rendered; this island owns only the bar.
 */
export function HomeClientControls() {
  const analytics = useLandingAnalytics("home")
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  useEffect(() => {
    const el = document.getElementById(HOME_HERO_CTA_ID)
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <StickyCTA
      show={showStickyCTA}
      ctaText="Get started"
      ctaHref="/request"
      mobileSummary={`From ${PRICING_DISPLAY.MED_CERT} · ${GUARANTEE}`}
      onCTAClick={() => analytics.trackCTAClick("sticky_mobile")}
    />
  )
}
