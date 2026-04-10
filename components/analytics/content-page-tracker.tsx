"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

interface ContentPageTrackerProps {
  pageType: "condition" | "symptom" | "guide" | "medication" | "compare" | "intent" | "location" | "audience" | "blog" | "employer"
  slug: string
  /** Optional service recommendation type shown on the page */
  serviceRecommendation?: "med-cert" | "consult" | "prescription" | "both"
}

/**
 * Tracks content page views with attribution data for conversion analysis.
 *
 * Fires a `content_page_viewed` PostHog event with page metadata,
 * enabling funnel analysis: content page → intake start → payment.
 *
 * Drop this into any content page — it fires once per mount.
 */
export function ContentPageTracker({ pageType, slug, serviceRecommendation }: ContentPageTrackerProps) {
  const pathname = usePathname()
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    import("posthog-js").then(({ default: posthog }) => {
      if (!posthog.__loaded) return

      posthog.capture("content_page_viewed", {
        page_type: pageType,
        slug,
        pathname,
        service_recommendation: serviceRecommendation,
        referrer: document.referrer || undefined,
        utm_source: new URLSearchParams(window.location.search).get("utm_source") || undefined,
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
      })
    }).catch(() => {})
  }, [pageType, slug, pathname, serviceRecommendation])

  return null
}
