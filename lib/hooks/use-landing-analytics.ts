"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"

import { usePostHog } from "@/lib/analytics/posthog-context"
import type { SpecialtyExperienceVersion } from "@/lib/growth/specialty-experiences"

export type CTALocation =
  | "hero"
  | "how_it_works"
  | "certificate_preview"
  | "pricing"
  | "final_cta"
  | "sticky_mobile"
  | "employer_link"
  | "verify_link"
  | "about_hero"
  | "about_what_we_wont_do"

type LandingAnalyticsProperties = Record<string, unknown>
type LandingAnalyticsCapture = (event: string, properties: LandingAnalyticsProperties) => void

export function createLandingAnalyticsTracker({
  service,
  growthExperienceVersion = null,
  capture,
}: {
  service: string
  growthExperienceVersion?: SpecialtyExperienceVersion | null
  capture?: LandingAnalyticsCapture
}) {
  let hasTrackedExperienceView = false
  const versionProperties = growthExperienceVersion
    ? { growth_experience_version: growthExperienceVersion }
    : {}

  const track = (event: string, properties: LandingAnalyticsProperties) => {
    try {
      capture?.(event, properties)
    } catch {
      // Analytics must never delay or interrupt patient navigation.
    }
  }

  return {
    trackLandingExperienceViewed: () => {
      if (!growthExperienceVersion || hasTrackedExperienceView) return
      hasTrackedExperienceView = true
      track("landing_experience_viewed", { service, ...versionProperties })
    },
    trackCTAClick: (location: CTALocation) => {
      track("landing_cta_clicked", {
        service,
        cta_location: location,
        ...versionProperties,
      })
    },
    trackFAQOpen: (_question: string, index: number) => {
      track("landing_faq_opened", {
        service,
        faq_index: index,
        ...versionProperties,
      })
    },
    trackSectionView: (section: string) => {
      track("landing_section_viewed", {
        service,
        section,
        ...versionProperties,
      })
    },
    trackScrollDepth: (depth: number) => {
      track("landing_scroll_depth", {
        service,
        depth_percent: depth,
        ...versionProperties,
      })
    },
  }
}

/**
 * Analytics hook for service landing pages.
 * Tracks CTA clicks, scroll depth milestones, section views, and interactions.
 */
export function useLandingAnalytics(
  service: string,
  growthExperienceVersion: SpecialtyExperienceVersion | null = null,
) {
  const posthog = usePostHog()
  const scrollMilestones = useRef(new Set<number>())
  const trackedExperienceVersion = useRef<SpecialtyExperienceVersion | null>(null)
  const analytics = useMemo(
    () => createLandingAnalyticsTracker({
      service,
      growthExperienceVersion,
      capture: posthog?.capture.bind(posthog),
    }),
    [growthExperienceVersion, posthog, service],
  )

  useEffect(() => {
    if (!growthExperienceVersion || trackedExperienceVersion.current === growthExperienceVersion) return
    trackedExperienceVersion.current = growthExperienceVersion
    analytics.trackLandingExperienceViewed()
  }, [analytics, growthExperienceVersion])

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
  }, [analytics])

  return {
    trackCTAClick,
    trackFAQOpen,
    trackSectionView,
  }
}
