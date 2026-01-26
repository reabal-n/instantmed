"use client"

/**
 * Conversion Events Library
 * 
 * Tracks key conversion events across the patient journey.
 * Integrates with Google Analytics 4, Google Ads, and PostHog.
 */

// Event types for the conversion funnel
export type ConversionEvent = 
  | "page_view"
  | "service_hub_viewed"
  | "service_selected"
  | "consult_subtype_selected"
  | "draft_resumed"
  | "draft_cleared"
  | "request_again_clicked"
  | "signup_started"
  | "signup_completed"
  | "onboarding_started"
  | "onboarding_completed"
  | "intake_started"
  | "intake_step_completed"
  | "intake_submitted"
  | "payment_initiated"
  | "payment_completed"
  | "payment_failed"
  | "request_approved"
  | "request_rejected"
  | "document_downloaded"
  | "return_visit"

interface EventProperties {
  // Service context
  service_type?: "med_cert" | "prescription" | "consult"
  service_price?: number
  
  // Funnel context
  step_name?: string
  step_number?: number
  total_steps?: number
  
  // User context
  user_id?: string
  is_new_user?: boolean
  
  // Transaction context
  transaction_id?: string
  payment_method?: string
  
  // Attribution
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  
  // Custom
  [key: string]: unknown
}

// Get window with gtag typed
function getWindow(): Window & { 
  gtag?: (...args: unknown[]) => void
  posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
} {
  return typeof window !== "undefined" ? window as Window & { 
    gtag?: (...args: unknown[]) => void
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  } : {} as Window & { gtag?: (...args: unknown[]) => void; posthog?: { capture: (event: string, props?: Record<string, unknown>) => void } }
}

/**
 * Track a conversion event
 */
export function trackConversion(event: ConversionEvent, properties?: EventProperties) {
  const win = getWindow()
  const eventData = {
    event_name: event,
    timestamp: new Date().toISOString(),
    page_url: typeof window !== "undefined" ? window.location.href : "",
    page_path: typeof window !== "undefined" ? window.location.pathname : "",
    ...properties,
  }

  // Development logging
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[Conversion]", event, eventData)
  }

  // Google Analytics 4
  if (win.gtag) {
    win.gtag("event", event, {
      ...properties,
      send_to: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    })
  }

  // Google Ads conversion tracking
  if (win.gtag && isGoogleAdsConversion(event)) {
    const conversionId = getGoogleAdsConversionId(event)
    if (conversionId) {
      win.gtag("event", "conversion", {
        send_to: conversionId,
        value: properties?.service_price,
        currency: "AUD",
        transaction_id: properties?.transaction_id,
      })
    }
  }

  // PostHog
  if (win.posthog) {
    win.posthog.capture(event, eventData)
  }
}

/**
 * Check if event should trigger Google Ads conversion
 */
function isGoogleAdsConversion(event: ConversionEvent): boolean {
  return [
    "signup_completed",
    "payment_completed",
    "request_approved",
  ].includes(event)
}

/**
 * Get Google Ads conversion ID for event
 */
function getGoogleAdsConversionId(event: ConversionEvent): string | null {
  const conversionIds: Partial<Record<ConversionEvent, string>> = {
    signup_completed: process.env.NEXT_PUBLIC_GADS_SIGNUP_CONVERSION,
    payment_completed: process.env.NEXT_PUBLIC_GADS_PAYMENT_CONVERSION,
    request_approved: process.env.NEXT_PUBLIC_GADS_APPROVAL_CONVERSION,
  }
  return conversionIds[event] || null
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

// ============================================
// SERVICE HUB FUNNEL TRACKING
// ============================================

/**
 * Track service hub viewed
 */
export function trackServiceHubViewed(hasDraft: boolean, hasLastService: boolean) {
  trackConversion("service_hub_viewed", {
    has_draft: hasDraft,
    has_last_service: hasLastService,
  })
}

/**
 * Track service selection from hub
 */
export function trackServiceSelected(
  serviceType: "med_cert" | "prescription" | "consult",
  price: number,
  source?: "hub" | "direct" | "request_again"
) {
  trackConversion("service_selected", {
    service_type: serviceType,
    service_price: price,
    selection_source: source || "hub",
  })
}

/**
 * Track consult subtype selection
 */
export function trackConsultSubtypeSelected(subtype: string) {
  trackConversion("consult_subtype_selected", {
    consult_subtype: subtype,
    service_type: "consult",
  })
}

/**
 * Track draft resume
 */
export function trackDraftResumed(
  serviceType: "med_cert" | "prescription" | "consult",
  stepId: string
) {
  trackConversion("draft_resumed", {
    service_type: serviceType,
    step_id: stepId,
  })
}

/**
 * Track draft cleared
 */
export function trackDraftCleared(serviceType: "med_cert" | "prescription" | "consult") {
  trackConversion("draft_cleared", {
    service_type: serviceType,
  })
}

/**
 * Track request again clicked
 */
export function trackRequestAgainClicked(serviceType: "med_cert" | "prescription" | "consult") {
  trackConversion("request_again_clicked", {
    service_type: serviceType,
  })
}

/**
 * Track signup completion
 */
export function trackSignupCompleted(userId: string, isNewUser: boolean = true) {
  trackConversion("signup_completed", {
    user_id: userId,
    is_new_user: isNewUser,
  })
}

/**
 * Track intake step
 */
export function trackIntakeStep(
  serviceType: "med_cert" | "prescription" | "consult",
  stepName: string,
  stepNumber: number,
  totalSteps: number
) {
  trackConversion("intake_step_completed", {
    service_type: serviceType,
    step_name: stepName,
    step_number: stepNumber,
    total_steps: totalSteps,
  })
}

/**
 * Track payment completion
 */
export function trackPaymentCompleted(
  serviceType: "med_cert" | "prescription" | "consult",
  price: number,
  transactionId: string
) {
  trackConversion("payment_completed", {
    service_type: serviceType,
    service_price: price,
    transaction_id: transactionId,
  })
}

/**
 * Track request approval
 */
export function trackRequestApproved(
  serviceType: "med_cert" | "prescription" | "consult",
  requestId: string
) {
  trackConversion("request_approved", {
    service_type: serviceType,
    transaction_id: requestId,
  })
}

// ============================================
// UTM TRACKING
// ============================================

/**
 * Get UTM parameters from URL
 */
export function getUTMParams(): Pick<EventProperties, "utm_source" | "utm_medium" | "utm_campaign"> {
  if (typeof window === "undefined") return {}
  
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  }
}

/**
 * Store UTM params in session for attribution
 */
export function storeUTMParams() {
  if (typeof window === "undefined") return
  
  const params = getUTMParams()
  if (params.utm_source) {
    sessionStorage.setItem("utm_params", JSON.stringify(params))
  }
}

/**
 * Get stored UTM params
 */
export function getStoredUTMParams(): Pick<EventProperties, "utm_source" | "utm_medium" | "utm_campaign"> {
  if (typeof window === "undefined") return {}
  
  try {
    const stored = sessionStorage.getItem("utm_params")
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}
