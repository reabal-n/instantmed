/**
 * Enhanced Intake Abandonment Tracking
 * 
 * OBSERVABILITY_AUDIT P1: Enhanced Abandon Tracking
 * 
 * Tracks detailed abandon reasons including payment, safety blocks, and form context.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface EnhancedAbandonEvent {
  // Base fields (from existing IntakeAbandonEvent)
  sessionId: string
  serviceType: string
  lastStep: string
  stepNumber: number
  timeSpentMs: number
  messageCount: number
  reason: "closed" | "timeout" | "error" | "navigated_away" | "safety_block" | "payment_failed"
  
  // Payment context
  reachedPayment: boolean
  stripeCheckoutStarted: boolean
  paymentError: string | null
  
  // Safety context
  wasBlockedBySafety: boolean
  safetyBlockReason: string | null
  safetyBlockCode: string | null
  
  // Form context
  fieldsCompleted: string[]
  lastFieldEdited: string | null
  formProgress: number // 0-100
  
  // Technical context
  deviceType: "mobile" | "tablet" | "desktop"
  browser: string
  browserVersion: string
  osName: string
  hasNetworkError: boolean
  lastNetworkError: string | null
  
  // Session context
  pageViewCount: number
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
}

/**
 * Detect device type from user agent
 */
export function detectDeviceType(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet"
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile"
  return "desktop"
}

/**
 * Parse browser info from user agent
 */
export function parseBrowserInfo(userAgent: string): { browser: string; version: string; os: string } {
  const ua = userAgent
  
  let browser = "Unknown"
  let version = ""
  let os = "Unknown"
  
  // Browser detection
  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    browser = "Chrome"
    const match = ua.match(/Chrome\/(\d+)/)
    version = match?.[1] || ""
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browser = "Safari"
    const match = ua.match(/Version\/(\d+)/)
    version = match?.[1] || ""
  } else if (ua.includes("Firefox")) {
    browser = "Firefox"
    const match = ua.match(/Firefox\/(\d+)/)
    version = match?.[1] || ""
  } else if (ua.includes("Edg")) {
    browser = "Edge"
    const match = ua.match(/Edg\/(\d+)/)
    version = match?.[1] || ""
  }
  
  // OS detection
  if (ua.includes("Windows")) os = "Windows"
  else if (ua.includes("Mac")) os = "macOS"
  else if (ua.includes("Linux")) os = "Linux"
  else if (ua.includes("Android")) os = "Android"
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"
  
  return { browser, version, os }
}

/**
 * Track enhanced abandon event
 */
export async function trackEnhancedAbandon(event: EnhancedAbandonEvent): Promise<void> {
  const supabase = createServiceRoleClient()
  
  await supabase.from("intake_abandonment").insert({
    session_id: event.sessionId,
    service_type: event.serviceType,
    last_step: event.lastStep,
    step_number: event.stepNumber,
    time_spent_ms: event.timeSpentMs,
    message_count: event.messageCount,
    abandon_reason: event.reason,
    
    // Payment context
    reached_payment: event.reachedPayment,
    stripe_checkout_started: event.stripeCheckoutStarted,
    payment_error: event.paymentError,
    
    // Safety context
    was_blocked_by_safety: event.wasBlockedBySafety,
    safety_block_reason: event.safetyBlockReason,
    safety_block_code: event.safetyBlockCode,
    
    // Form context
    fields_completed: event.fieldsCompleted,
    last_field_edited: event.lastFieldEdited,
    form_progress: event.formProgress,
    
    // Technical context
    device_type: event.deviceType,
    browser: event.browser,
    browser_version: event.browserVersion,
    os_name: event.osName,
    has_network_error: event.hasNetworkError,
    last_network_error: event.lastNetworkError,
    
    // Session context
    page_view_count: event.pageViewCount,
    referrer: event.referrer,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
    
    created_at: new Date().toISOString(),
  })
}

/**
 * Get abandonment analytics for a time period
 */
export async function getAbandonmentAnalytics(
  periodHours: number = 24
): Promise<{
  totalAbandons: number
  byReason: Record<string, number>
  byStep: Record<string, number>
  byServiceType: Record<string, number>
  byDeviceType: Record<string, number>
  avgTimeSpentMs: number
  paymentAbandons: number
  safetyBlockAbandons: number
}> {
  const supabase = createServiceRoleClient()
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString()
  
  const { data } = await supabase
    .from("intake_abandonment")
    .select("*")
    .gte("created_at", since)
  
  if (!data || data.length === 0) {
    return {
      totalAbandons: 0,
      byReason: {},
      byStep: {},
      byServiceType: {},
      byDeviceType: {},
      avgTimeSpentMs: 0,
      paymentAbandons: 0,
      safetyBlockAbandons: 0,
    }
  }
  
  const byReason = data.reduce((acc, d) => {
    acc[d.abandon_reason] = (acc[d.abandon_reason] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const byStep = data.reduce((acc, d) => {
    acc[d.last_step] = (acc[d.last_step] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const byServiceType = data.reduce((acc, d) => {
    acc[d.service_type] = (acc[d.service_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const byDeviceType = data.reduce((acc, d) => {
    acc[d.device_type] = (acc[d.device_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const avgTimeSpentMs = data.reduce((sum, d) => sum + (d.time_spent_ms || 0), 0) / data.length
  
  return {
    totalAbandons: data.length,
    byReason,
    byStep,
    byServiceType,
    byDeviceType,
    avgTimeSpentMs: Math.round(avgTimeSpentMs),
    paymentAbandons: data.filter(d => d.reached_payment && !d.stripe_checkout_started).length,
    safetyBlockAbandons: data.filter(d => d.was_blocked_by_safety).length,
  }
}
