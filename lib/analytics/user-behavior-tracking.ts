// import { getPostHogClient } from "@/lib/posthog-server"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("user-behavior-tracking")

export interface UserBehaviorEvent {
  eventType: 'page_view' | 'click' | 'form_start' | 'form_complete' | 'conversion' | 'error' | 'feature_use'
  eventName: string
  properties: Record<string, unknown>
  timestamp: Date
  userId?: string
  sessionId?: string
  userAgent?: string
  referrer?: string
}

export interface ConversionFunnelStep {
  stepName: string
  stepOrder: number
  eventName: string
  properties: Record<string, unknown>
}

export interface UserJourney {
  userId: string
  sessionId: string
  events: UserBehaviorEvent[]
  startTime: Date
  endTime?: Date
  conversionSteps: ConversionFunnelStep[]
  completed: boolean
}

interface PostHogClient {
  capture: (eventName: string, properties: Record<string, unknown>) => void
  identify: (userId: string, properties: Record<string, unknown>) => void
  setPeopleProperties: (properties: Record<string, unknown>) => void
  reset: () => void
}

class UserBehaviorTracker {
  private static instance: UserBehaviorTracker
  private posthog: PostHogClient | null = null
  private isEnabled: boolean

  private constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
    // PostHog client initialization disabled for build compatibility
    // this.posthog = getPostHogClient()
  }

  static getInstance(): UserBehaviorTracker {
    if (!UserBehaviorTracker.instance) {
      UserBehaviorTracker.instance = new UserBehaviorTracker()
    }
    return UserBehaviorTracker.instance
  }

  // Track page views
  trackPageView(pageName: string, properties: Record<string, unknown> = {}) {
    const event: UserBehaviorEvent = {
      eventType: 'page_view',
      eventName: `page_view_${pageName}`,
      properties: {
        page: pageName,
        path: window.location.pathname,
        search: window.location.search,
        ...properties
      },
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    }

    this.sendEvent(event)
  }

  // Track user interactions
  trackClick(element: string, properties: Record<string, unknown> = {}) {
    const event: UserBehaviorEvent = {
      eventType: 'click',
      eventName: `click_${element}`,
      properties: {
        element,
        ...properties
      },
      timestamp: new Date(),
      userAgent: navigator.userAgent
    }

    this.sendEvent(event)
  }

  // Track form interactions
  trackFormStart(formName: string, properties: Record<string, unknown> = {}) {
    const event: UserBehaviorEvent = {
      eventType: 'form_start',
      eventName: `form_start_${formName}`,
      properties: {
        formName,
        ...properties
      },
      timestamp: new Date()
    }

    this.sendEvent(event)
  }

  trackFormComplete(formName: string, properties: Record<string, unknown> = {}) {
    const event: UserBehaviorEvent = {
      eventType: 'form_complete',
      eventName: `form_complete_${formName}`,
      properties: {
        formName,
        ...properties
      },
      timestamp: new Date()
    }

    this.sendEvent(event)
  }

  // Track conversions
  trackConversion(conversionType: string, value?: number, properties: Record<string, unknown> = {}) {
    const event: UserBehaviorEvent = {
      eventType: 'conversion',
      eventName: `conversion_${conversionType}`,
      properties: {
        conversionType,
        value,
        ...properties
      },
      timestamp: new Date()
    }

    this.sendEvent(event)
  }

  // Track feature usage
  trackFeatureUse(featureName: string, properties: Record<string, unknown> = {}) {
    const event: UserBehaviorEvent = {
      eventType: 'feature_use',
      eventName: `feature_${featureName}`,
      properties: {
        featureName,
        ...properties
      },
      timestamp: new Date()
    }

    this.sendEvent(event)
  }

  // Track errors
  trackError(error: Error, context: Record<string, unknown> = {}) {
    const event: UserBehaviorEvent = {
      eventType: 'error',
      eventName: `error_${error.name}`,
      properties: {
        errorMessage: error.message,
        errorStack: error.stack,
        ...context
      },
      timestamp: new Date()
    }

    this.sendEvent(event)
  }

  // Send event to analytics
  private sendEvent(event: UserBehaviorEvent) {
    if (!this.isEnabled) {
      logger.debug("Analytics disabled, skipping event", { event })
      return
    }

    try {
      // Send to PostHog
      if (this.posthog) {
        this.posthog.capture(event.eventName, event.properties)
      }

      // Log for debugging
      logger.debug("User behavior event tracked", { event })
    } catch (error) {
      logger.error("Failed to track user behavior event", { error, event })
    }
  }

  // Identify user
  identifyUser(userId: string, properties: Record<string, unknown> = {}) {
    if (!this.isEnabled || !this.posthog) return

    try {
      this.posthog.identify(userId, properties)
      logger.info("User identified in analytics", { userId })
    } catch (error) {
      logger.error("Failed to identify user in analytics", { error, userId })
    }
  }

  // Set user properties
  setUserProperties(properties: Record<string, unknown>) {
    if (!this.isEnabled || !this.posthog) return

    try {
      this.posthog.setPeopleProperties(properties)
      logger.debug("User properties set", { properties })
    } catch (error) {
      logger.error("Failed to set user properties", { error, properties })
    }
  }

  // Reset user session
  resetSession() {
    if (!this.isEnabled || !this.posthog) return

    try {
      this.posthog.reset()
      logger.info("Analytics session reset")
    } catch (error) {
      logger.error("Failed to reset analytics session", { error })
    }
  }
}

// Export singleton instance
export const userBehaviorTracker = UserBehaviorTracker.getInstance()

// React hook for easy usage
export function useUserBehaviorTracking() {
  const tracker = UserBehaviorTracker.getInstance()

  return {
    trackPageView: tracker.trackPageView.bind(tracker),
    trackClick: tracker.trackClick.bind(tracker),
    trackFormStart: tracker.trackFormStart.bind(tracker),
    trackFormComplete: tracker.trackFormComplete.bind(tracker),
    trackConversion: tracker.trackConversion.bind(tracker),
    trackFeatureUse: tracker.trackFeatureUse.bind(tracker),
    trackError: tracker.trackError.bind(tracker),
    identifyUser: tracker.identifyUser.bind(tracker),
    setUserProperties: tracker.setUserProperties.bind(tracker),
    resetSession: tracker.resetSession.bind(tracker)
  }
}

// Conversion funnel analysis
export class ConversionFunnelAnalyzer {
  private static instance: ConversionFunnelAnalyzer
  private tracker: UserBehaviorTracker

  private constructor() {
    this.tracker = UserBehaviorTracker.getInstance()
  }

  static getInstance(): ConversionFunnelAnalyzer {
    if (!ConversionFunnelAnalyzer.instance) {
      ConversionFunnelAnalyzer.instance = new ConversionFunnelAnalyzer()
    }
    return ConversionFunnelAnalyzer.instance
  }

  // Define conversion funnel steps
  private getFunnelSteps(): ConversionFunnelStep[] {
    return [
      {
        stepName: 'landing_page',
        stepOrder: 1,
        eventName: 'page_view_landing',
        properties: {}
      },
      {
        stepName: 'intake_start',
        stepOrder: 2,
        eventName: 'form_start_medical_certificate',
        properties: {}
      },
      {
        stepName: 'personal_info',
        stepOrder: 3,
        eventName: 'form_complete_personal_info',
        properties: {}
      },
      {
        stepName: 'symptoms_info',
        stepOrder: 4,
        eventName: 'form_complete_symptoms',
        properties: {}
      },
      {
        stepName: 'payment_start',
        stepOrder: 5,
        eventName: 'page_view_payment',
        properties: {}
      },
      {
        stepName: 'payment_complete',
        stepOrder: 6,
        eventName: 'conversion_payment',
        properties: {}
      },
      {
        stepName: 'certificate_received',
        stepOrder: 7,
        eventName: 'conversion_certificate',
        properties: {}
      }
    ]
  }

  // Track funnel step completion
  trackFunnelStep(stepName: string, properties: Record<string, unknown> = {}) {
    const step = this.getFunnelSteps().find(s => s.stepName === stepName)
    if (!step) {
      logger.warn("Unknown funnel step", { stepName })
      return
    }

    this.tracker.trackFeatureUse(`funnel_step_${stepName}`, {
      stepOrder: step.stepOrder,
      ...properties
    })
  }

  // Calculate funnel conversion rates
  async calculateFunnelMetrics(_timeRange: { start: Date; end: Date }) {
    // This would typically query your analytics data
    // For now, return mock data
    const steps = this.getFunnelSteps()
    
    return steps.map(step => ({
      stepName: step.stepName,
      stepOrder: step.stepOrder,
      users: Math.floor(Math.random() * 1000), // Mock data
      conversionRate: Math.random() * 100, // Mock data
      dropOffRate: Math.random() * 20 // Mock data
    }))
  }

  // Get funnel drop-off analysis
  async getDropOffAnalysis() {
    const metrics = await this.calculateFunnelMetrics({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    })

    return metrics.map((metric, index) => {
      if (index === 0) return { ...metric, dropOffReason: 'Starting point' }
      
      const previousUsers = metrics[index - 1].users
      const dropOff = previousUsers - metric.users
      const dropOffRate = (dropOff / previousUsers) * 100

      return {
        ...metric,
        dropOffUsers: dropOff,
        dropOffRate,
        dropOffReason: this.getDropOffReason(metric.stepName, dropOffRate)
      }
    })
  }

  private getDropOffReason(stepName: string, dropOffRate: number): string {
    if (dropOffRate > 50) return 'High friction detected'
    if (dropOffRate > 25) return 'Moderate friction'
    if (dropOffRate > 10) return 'Minor friction'
    return 'Normal drop-off'
  }
}

export const conversionFunnelAnalyzer = ConversionFunnelAnalyzer.getInstance()
