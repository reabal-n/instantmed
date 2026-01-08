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
  
  // Example: Send to custom endpoint
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    // Beacon API for reliable delivery - uncomment when you have an analytics endpoint
    // const body = JSON.stringify({
    //   name: metric.name,
    //   value: metric.value,
    //   rating: metric.rating,
    //   id: metric.id,
    //   page: window.location.pathname,
    //   timestamp: Date.now(),
    // })
    // navigator.sendBeacon?.('/api/analytics/vitals', body)
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(config: WebVitalsConfig = defaultConfig) {
  if (typeof window === "undefined") return

  // Dynamic import to reduce initial bundle size
  import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    const handleMetric = (metric: { name: string; value: number; id: string; delta: number; navigationType: string }) => {
      const webVitalMetric: WebVitalMetric = {
        ...metric,
        name: metric.name as WebVitalMetric["name"],
        rating: getRating(metric.name, metric.value),
      }
      reportMetric(webVitalMetric, config)
    }

    onCLS(handleMetric)
    onFCP(handleMetric)
    onINP(handleMetric) // INP replaces FID in web-vitals v4+
    onLCP(handleMetric)
    onTTFB(handleMetric)
  }).catch(() => {
    // web-vitals not available, skip monitoring
  })
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
