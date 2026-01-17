/**
 * Prefetch & Preload Utilities
 * 
 * Optimize loading performance by prefetching resources
 * that users are likely to need next.
 */

/**
 * Prefetch a page for faster navigation
 */
export function prefetchPage(href: string) {
  if (typeof window === "undefined") return
  
  // Check if already prefetched
  const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`)
  if (existing) return
  
  const link = document.createElement("link")
  link.rel = "prefetch"
  link.href = href
  document.head.appendChild(link)
}

/**
 * Preconnect to external origins
 */
export function preconnect(origin: string) {
  if (typeof window === "undefined") return
  
  const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`)
  if (existing) return
  
  const link = document.createElement("link")
  link.rel = "preconnect"
  link.href = origin
  link.crossOrigin = "anonymous"
  document.head.appendChild(link)
}

/**
 * Prefetch common next pages based on current route
 */
export function prefetchLikelyNextPages(currentPath: string) {
  const prefetchMap: Record<string, string[]> = {
    "/": ["/medical-certificate", "/prescriptions", "/sign-up"],
    "/medical-certificate": ["/start/med-cert", "/sign-up"],
    "/prescriptions": ["/start/prescription", "/sign-up"],
    "/sign-up": ["/patient"],
    "/auth/login": ["/patient"],
  }
  
  const pagesToPrefetch = prefetchMap[currentPath] || []
  pagesToPrefetch.forEach(prefetchPage)
}

/**
 * Preconnect to commonly used external services
 */
export function preconnectExternalServices() {
  const origins = [
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://js.stripe.com",
    "https://api.stripe.com",
  ]
  
  origins.forEach(preconnect)
}

/**
 * Intersection Observer for lazy prefetching links on hover/visibility
 */
export function setupLinkPrefetching() {
  if (typeof window === "undefined") return
  
  // Prefetch on hover
  document.addEventListener("mouseover", (e) => {
    const target = e.target as HTMLElement
    const link = target.closest("a[href^='/']") as HTMLAnchorElement
    
    if (link && link.href) {
      const url = new URL(link.href)
      if (url.origin === window.location.origin) {
        prefetchPage(url.pathname)
      }
    }
  }, { passive: true })
}

/**
 * Report Core Web Vitals to analytics
 */
export function reportWebVitals() {
  if (typeof window === "undefined") return
  
  // Use web-vitals library if available (v4+ uses INP instead of FID)
  import("web-vitals").then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
    const sendToAnalytics = (metric: { name: string; value: number; id: string }) => {
      // Send to GA4
      const win = window as Window & { gtag?: (...args: unknown[]) => void }
      if (win.gtag) {
        win.gtag("event", metric.name, {
          value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
          event_label: metric.id,
          non_interaction: true,
        })
      }
    }
    
    onCLS(sendToAnalytics)
    onINP(sendToAnalytics)
    onLCP(sendToAnalytics)
    onFCP(sendToAnalytics)
    onTTFB(sendToAnalytics)
  }).catch(() => {
    // web-vitals not available
  })
}
