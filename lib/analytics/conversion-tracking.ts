/**
 * Google Ads Conversion Tracking
 * Fires conversion events for checkout completion and funnel steps
 */

// Conversion action IDs - configure these in Google Ads
const CONVERSION_IDS = {
  // Main conversion: Payment completed
  PURCHASE: 'AW-17795889471/purchase',
  // Micro-conversions for funnel optimization
  LANDING_VIEW: 'AW-17795889471/landing_view',
  START_INTAKE: 'AW-17795889471/start_intake',
  INTAKE_COMPLETE: 'AW-17795889471/intake_complete',
  CHECKOUT_START: 'AW-17795889471/checkout_start',
} as const

type ConversionEvent = keyof typeof CONVERSION_IDS

interface ConversionData {
  value?: number
  currency?: string
  transaction_id?: string
  service?: string
  items?: Array<{
    id: string
    name: string
    price: number
  }>
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/**
 * Fire a Google Ads conversion event
 */
export function trackConversion(event: ConversionEvent, data?: ConversionData) {
  if (typeof window === 'undefined' || !window.gtag) {
    return
  }

  const conversionId = CONVERSION_IDS[event]
  
  window.gtag('event', 'conversion', {
    send_to: conversionId,
    value: data?.value,
    currency: data?.currency || 'AUD',
    transaction_id: data?.transaction_id,
  })

  // Also send to GA4 for unified reporting
  window.gtag('event', event.toLowerCase(), {
    event_category: 'conversion',
    event_label: data?.service,
    value: data?.value,
    currency: data?.currency || 'AUD',
    transaction_id: data?.transaction_id,
    items: data?.items,
  })
}

/**
 * Track purchase completion (main conversion)
 */
export function trackPurchase(params: {
  transactionId: string
  value: number
  service: string
  serviceName: string
}) {
  trackConversion('PURCHASE', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: 'AUD',
    service: params.service,
    items: [{
      id: params.service,
      name: params.serviceName,
      price: params.value,
    }],
  })

  // Store conversion for attribution
  storeConversion({
    type: 'purchase',
    transactionId: params.transactionId,
    value: params.value,
    service: params.service,
    timestamp: Date.now(),
  })
}

/**
 * Track funnel step progression
 */
export function trackFunnelStep(step: 'landing' | 'start' | 'intake_complete' | 'checkout', service?: string) {
  const eventMap: Record<string, ConversionEvent> = {
    landing: 'LANDING_VIEW',
    start: 'START_INTAKE',
    intake_complete: 'INTAKE_COMPLETE',
    checkout: 'CHECKOUT_START',
  }

  const event = eventMap[step]
  if (event) {
    trackConversion(event, { service })
  }

  // Store funnel progression
  storeFunnelStep(step, service)
}

// Local storage helpers for attribution
const FUNNEL_KEY = 'instantmed_funnel'
const CONVERSION_KEY = 'instantmed_conversions'

interface FunnelData {
  steps: Array<{
    step: string
    service?: string
    timestamp: number
  }>
  startedAt: number
}

interface StoredConversion {
  type: string
  transactionId: string
  value: number
  service: string
  timestamp: number
}

function storeFunnelStep(step: string, service?: string) {
  if (typeof window === 'undefined') return

  try {
    const existing = localStorage.getItem(FUNNEL_KEY)
    const data: FunnelData = existing 
      ? JSON.parse(existing) 
      : { steps: [], startedAt: Date.now() }

    data.steps.push({
      step,
      service,
      timestamp: Date.now(),
    })

    // Keep only last 20 steps
    if (data.steps.length > 20) {
      data.steps = data.steps.slice(-20)
    }

    localStorage.setItem(FUNNEL_KEY, JSON.stringify(data))
  } catch {
    // Storage not available
  }
}

function storeConversion(conversion: StoredConversion) {
  if (typeof window === 'undefined') return

  try {
    const existing = localStorage.getItem(CONVERSION_KEY)
    const conversions: StoredConversion[] = existing ? JSON.parse(existing) : []

    conversions.push(conversion)

    // Keep only last 10 conversions
    if (conversions.length > 10) {
      conversions.shift()
    }

    localStorage.setItem(CONVERSION_KEY, JSON.stringify(conversions))
  } catch {
    // Storage not available
  }
}

/**
 * Get user's conversion history for personalization
 */
export function getConversionHistory(): StoredConversion[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(CONVERSION_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Get current funnel data for analytics
 */
export function getFunnelData(): FunnelData | null {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(FUNNEL_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Clear funnel data (after conversion)
 */
export function clearFunnelData() {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(FUNNEL_KEY)
  } catch {
    // Storage not available
  }
}
