"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"

import {
  createLandingAnalyticsTracker,
  createLandingExperienceViewLatch,
  type CTALocation,
} from "@/lib/analytics/landing-analytics"
import { usePostHog } from "@/lib/analytics/posthog-context"
import type { SpecialtyExperienceVersion } from "@/lib/growth/specialty-experiences"

/**
 * Analytics hook for service landing pages.
 * Tracks CTA clicks, scroll depth milestones, section views, and interactions.
 */
export function useLandingAnalytics(
  service: string,
  growthExperienceVersion: SpecialtyExperienceVersion | null = null,
  enabled = true,
) {
  const posthog = usePostHog()
  const scrollMilestones = useRef(new Set<number>())
  const experienceView = useMemo(
    () => createLandingExperienceViewLatch({ service, growthExperienceVersion, enabled }),
    [enabled, growthExperienceVersion, service],
  )
  const analytics = useMemo(
    () => createLandingAnalyticsTracker({
      service,
      growthExperienceVersion,
      capture: posthog?.capture.bind(posthog),
      enabled,
    }),
    [enabled, growthExperienceVersion, posthog, service],
  )

  useEffect(() => {
    experienceView.track(posthog?.capture.bind(posthog))
  }, [experienceView, posthog])

  // Track CTA clicks
  const trackCTAClick = useCallback(
    (location: CTALocation) => analytics.trackCTAClick(location),
    [analytics],
  )

  // Track FAQ interactions
  const trackFAQOpen = useCallback(
    (question: string, index: number) => analytics.trackFAQOpen(question, index),
    [analytics],
  )

  // Track section views via IntersectionObserver
  const trackSectionView = useCallback(
    (section: string) => analytics.trackSectionView(section),
    [analytics],
  )

  // Scroll depth tracking (25/50/75/100%)
  useEffect(() => {
    if (!enabled) return

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollHeight <= 0) return
      const percent = Math.round((window.scrollY / scrollHeight) * 100)

      for (const milestone of [25, 50, 75, 100]) {
        if (percent >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone)
          analytics.trackScrollDepth(milestone)
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [analytics, enabled])

  return {
    trackCTAClick,
    trackFAQOpen,
    trackSectionView,
  }
}
