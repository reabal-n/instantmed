"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

type WebVitalMetric = {
  id: string
  name: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB"
  value: number
  rating: "good" | "needs-improvement" | "poor"
  delta: number
  navigationType: string
}

interface WebVitalsConfig {
  analyticsId?: string
  debug?: boolean
  sampleRate?: number
}

const defaultConfig: WebVitalsConfig = {
  debug: process.env.NODE_ENV === "development",
  sampleRate: 1, // 100% sampling in production
}

/**
 * Get rating for a Web Vital metric
 */
function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    FID: [100, 300],
    INP: [200, 500],
    LCP: [2500, 4000],
    TTFB: [800, 1800],
  }

  const [good, poor] = thresholds[name] || [0, 0]
  if (value <= good) return "good"
  if (value <= poor) return "needs-improvement"
  return "poor"
}

/**
 * Report Web Vital metric to analytics
 */
function reportMetric(metric: WebVitalMetric, config: WebVitalsConfig) {
  const { debug } = config

  // Log in development
  if (debug) {
    const color = metric.rating === "good" ? "green" : metric.rating === "needs-improvement" ? "orange" : "red"
    // eslint-disable-next-line no-console
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      `color: ${color}; font-weight: bold`
    )
  }

  // Send to Vercel Analytics (automatically handled by @vercel/analytics)
  // For custom analytics, you can add here:
  
  // Send to PostHog for production monitoring
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    // Use PostHog to track Web Vitals
    const posthog = (window as unknown as { posthog?: { capture: (event: string, properties: Record<string, unknown>) => void } }).posthog
    if (posthog?.capture) {
      posthog.capture("$web_vitals", {
        $web_vitals_name: metric.name,
        $web_vitals_value: metric.value,
        $web_vitals_rating: metric.rating,
        $web_vitals_id: metric.id,
        $web_vitals_delta: metric.delta,
        $current_url: window.location.href,
        $pathname: window.location.pathname,
      })
    }
  }
}

/**
 * Initialize Web Vitals monitoring
 *
 * Uses the PerformanceObserver API directly to avoid the web-vitals package dependency.
 * PostHog's JS SDK also auto-captures $web_vitals events, so this provides
 * supplemental dev-mode logging and custom analytics reporting.
 */
export function initWebVitals(config: WebVitalsConfig = defaultConfig) {
  if (typeof window === "undefined") return
  if (typeof PerformanceObserver === "undefined") return

  // Use native PerformanceObserver for Web Vitals
  try {
    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
      if (lastEntry) {
        reportMetric({
          id: `lcp-${Date.now()}`,
          name: "LCP",
          value: lastEntry.startTime,
          rating: getRating("LCP", lastEntry.startTime),
          delta: lastEntry.startTime,
          navigationType: "navigate",
        }, config)
      }
    })
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true })

    // FCP
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const fcpEntry = entries.find(e => e.name === "first-contentful-paint")
      if (fcpEntry) {
        reportMetric({
          id: `fcp-${Date.now()}`,
          name: "FCP",
          value: fcpEntry.startTime,
          rating: getRating("FCP", fcpEntry.startTime),
          delta: fcpEntry.startTime,
          navigationType: "navigate",
        }, config)
      }
    })
    fcpObserver.observe({ type: "paint", buffered: true })

    // CLS
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value
        }
      }
    })
    clsObserver.observe({ type: "layout-shift", buffered: true })

    // Report CLS on page hide
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        reportMetric({
          id: `cls-${Date.now()}`,
          name: "CLS",
          value: clsValue,
          rating: getRating("CLS", clsValue),
          delta: clsValue,
          navigationType: "navigate",
        }, config)
      }
    }, { once: true })
  } catch {
    // PerformanceObserver not fully supported, skip monitoring
  }
}

/**
 * React hook to initialize Web Vitals monitoring
 */
export function useWebVitals(config?: WebVitalsConfig) {
  const pathname = usePathname()

  useEffect(() => {
    initWebVitals(config)
  }, [pathname, config])
}

/**
 * Component to add Web Vitals monitoring to app
 */
export function WebVitalsReporter({ config }: { config?: WebVitalsConfig }) {
  useWebVitals(config)
  return null
}
