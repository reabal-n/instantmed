"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Analytics event types
 */
export type AnalyticsEvent =
  | { name: "page_view"; properties: { path: string; title?: string } }
  | { name: "request_started"; properties: { type: string; subtype?: string } }
  | { name: "request_completed"; properties: { type: string; subtype?: string; requestId: string } }
  | { name: "payment_initiated"; properties: { amount: number; currency: string } }
  | { name: "payment_completed"; properties: { amount: number; currency: string; requestId: string } }
  | { name: "auth_signup"; properties: { method: string } }
  | { name: "auth_login"; properties: { method: string } }
  | { name: "error"; properties: { message: string; code?: string; context?: string } }
  | { name: "button_click"; properties: { label: string; location: string } }
  | { name: "form_submit"; properties: { form: string; success: boolean } }

/**
 * Analytics context
 */
interface AnalyticsContextValue {
  track: (event: AnalyticsEvent) => void
  identify: (userId: string, traits?: Record<string, unknown>) => void
}

const AnalyticsContext = React.createContext<AnalyticsContextValue | null>(null)

/**
 * Analytics provider component
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track page views
  React.useEffect(() => {
    track({
      name: "page_view",
      properties: {
        path: pathname,
        title: document.title,
      },
    })
  }, [pathname, searchParams])

  const track = React.useCallback((event: AnalyticsEvent) => {
    // Development logging
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics]", event.name, event.properties)
    }

    // Vercel Analytics (if available)
    if (typeof window !== "undefined" && "va" in window) {
      // @ts-expect-error - Vercel Analytics global
      window.va("event", {
        name: event.name,
        ...event.properties,
      })
    }

    // Google Analytics 4 (if available)
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-expect-error - gtag global
      window.gtag("event", event.name, event.properties)
    }

    // Custom analytics endpoint (optional)
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: event.name,
          properties: event.properties,
          timestamp: new Date().toISOString(),
          url: typeof window !== "undefined" ? window.location.href : "",
        }),
        keepalive: true,
      }).catch(() => {
        // Silently fail analytics
      })
    }
  }, [])

  const identify = React.useCallback((userId: string, traits?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] Identify:", userId, traits)
    }

    // Vercel Analytics doesn't have identify, but we can store for events
    if (typeof window !== "undefined") {
      // @ts-expect-error - Custom property
      window.__analytics_user_id = userId
    }

    // Google Analytics 4
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-expect-error - gtag global
      window.gtag("set", { user_id: userId })
    }
  }, [])

  return (
    <AnalyticsContext.Provider value={{ track, identify }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

/**
 * Hook to use analytics
 */
export function useAnalytics() {
  const context = React.useContext(AnalyticsContext)

  if (!context) {
    // Return no-op functions if not wrapped in provider
    return {
      track: () => {},
      identify: () => {},
    }
  }

  return context
}

/**
 * Error boundary with error reporting
 */
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundaryWithReporting extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error("Error caught by boundary:", error, errorInfo)

    // Report to analytics
    if (typeof window !== "undefined" && "va" in window) {
      // @ts-expect-error - Vercel Analytics
      window.va("event", {
        name: "error",
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      })
    }

    // Custom error reporting
    if (process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => {})
    }

    // Call custom handler
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-[200px] items-center justify-center p-4">
            <div className="text-center">
              <p className="text-muted-foreground">Something went wrong.</p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

/**
 * Performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now()

    return () => {
      const duration = performance.now() - startTime
      if (duration > 1000 && process.env.NODE_ENV === "development") {
        console.warn(`[Performance] ${componentName} was mounted for ${duration.toFixed(2)}ms`)
      }
    }
  }, [componentName])
}
