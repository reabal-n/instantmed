"use client"

// Analytics tracking for intake flow conversion comparison
// Tracks events for both old and new flows to measure improvement

export type IntakeFlowType = "med_cert" | "prescription"
export type IntakeFlowVersion = "legacy" | "streamlined"

export interface IntakeEvent {
  flow: IntakeFlowType
  version: IntakeFlowVersion
  step: string
  action: "view" | "complete" | "abandon" | "error"
  metadata?: Record<string, unknown>
}

// Track intake funnel events
export function trackIntakeEvent(event: IntakeEvent) {
  const eventData = {
    ...event,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.pathname : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Intake Analytics]", eventData)
  }

  // Send to analytics provider (Google Analytics, Mixpanel, etc.)
  if (typeof window !== "undefined") {
    // Google Analytics 4
    const win = window as Window & { gtag?: (...args: unknown[]) => void }
    if (typeof win.gtag === "function") {
      win.gtag("event", `intake_${event.action}`, {
        flow_type: event.flow,
        flow_version: event.version,
        step_name: event.step,
        ...event.metadata,
      })
    }

    // Custom analytics endpoint (optional)
    try {
      navigator.sendBeacon?.(
        "/api/analytics/intake",
        JSON.stringify(eventData)
      )
    } catch {
      // Silently fail if beacon not available
    }
  }
}

// Track step view
export function trackStepView(
  flow: IntakeFlowType,
  version: IntakeFlowVersion,
  step: string
) {
  trackIntakeEvent({ flow, version, step, action: "view" })
}

// Track step completion
export function trackStepComplete(
  flow: IntakeFlowType,
  version: IntakeFlowVersion,
  step: string,
  metadata?: Record<string, unknown>
) {
  trackIntakeEvent({ flow, version, step, action: "complete", metadata })
}

// Track flow abandonment
export function trackAbandon(
  flow: IntakeFlowType,
  version: IntakeFlowVersion,
  step: string
) {
  trackIntakeEvent({ flow, version, step, action: "abandon" })
}

// Track errors
export function trackError(
  flow: IntakeFlowType,
  version: IntakeFlowVersion,
  step: string,
  error: string
) {
  trackIntakeEvent({
    flow,
    version,
    step,
    action: "error",
    metadata: { error },
  })
}

// Hook for tracking page visibility changes (abandonment detection)
export function useAbandonmentTracking(
  flow: IntakeFlowType,
  version: IntakeFlowVersion,
  currentStep: string
) {
  if (typeof window === "undefined") return

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      trackAbandon(flow, version, currentStep)
    }
  }

  const handleBeforeUnload = () => {
    trackAbandon(flow, version, currentStep)
  }

  // Note: These should be added/removed in useEffect in the component
  return {
    addListeners: () => {
      document.addEventListener("visibilitychange", handleVisibilityChange)
      window.addEventListener("beforeunload", handleBeforeUnload)
    },
    removeListeners: () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    },
  }
}

// Conversion rate calculation helper (for dashboard)
export function calculateConversionRate(
  started: number,
  completed: number
): number {
  if (started === 0) return 0
  return Math.round((completed / started) * 100 * 10) / 10
}

// Funnel analysis helper
export interface FunnelStep {
  name: string
  count: number
  dropoff: number
  dropoffPercent: number
}

export function analyzeFunnel(stepCounts: Record<string, number>): FunnelStep[] {
  const steps = Object.entries(stepCounts)
  const result: FunnelStep[] = []

  for (let i = 0; i < steps.length; i++) {
    const [name, count] = steps[i]
    const prevCount = i > 0 ? steps[i - 1][1] : count
    const dropoff = prevCount - count
    const dropoffPercent = prevCount > 0 ? Math.round((dropoff / prevCount) * 100 * 10) / 10 : 0

    result.push({ name, count, dropoff, dropoffPercent })
  }

  return result
}
