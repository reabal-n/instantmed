"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePostHog } from "posthog-js/react"

type CTALocation =
  | "hero"
  | "how_it_works"
  | "certificate_preview"
  | "pricing"
  | "final_cta"
  | "sticky_mobile"
  | "exit_intent"

/**
 * Analytics hook for service landing pages.
 * Tracks CTA clicks, scroll depth milestones, section views, and interactions.
 */
export function useLandingAnalytics(service: string) {
  const posthog = usePostHog()
  const scrollMilestones = useRef(new Set<number>())

  // Track CTA clicks
  const trackCTAClick = useCallback(
    (location: CTALocation) => {
      posthog?.capture("landing_cta_clicked", {
        service,
        cta_location: location,
      })
    },
    [posthog, service]
  )

  // Track exit intent interactions
  const trackExitIntent = useCallback(
    (action: "shown" | "clicked" | "dismissed" | "email_captured") => {
      posthog?.capture("landing_exit_intent", {
        service,
        action,
      })
    },
    [posthog, service]
  )

  // Track FAQ interactions
  const trackFAQOpen = useCallback(
    (question: string, index: number) => {
      posthog?.capture("landing_faq_opened", {
        service,
        question,
        faq_index: index,
      })
    },
    [posthog, service]
  )

  // Track section views via IntersectionObserver
  const trackSectionView = useCallback(
    (section: string) => {
      posthog?.capture("landing_section_viewed", {
        service,
        section,
      })
    },
    [posthog, service]
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
          posthog?.capture("landing_scroll_depth", {
            service,
            depth_percent: milestone,
          })
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [posthog, service])

  return {
    trackCTAClick,
    trackExitIntent,
    trackFAQOpen,
    trackSectionView,
  }
}
