/**
 * Google Ads Conversion Tracking
 * Fires conversion events for checkout completion and funnel steps
 *
 * Includes:
 * - Enhanced Conversions (hashed email for better attribution)
 * - Conversion value optimization (actual $ values for micro-conversions)
 * - Google Consent Mode v2 support
 */

// Conversion action IDs — Google Ads account AW-17795889471 (account 920-501-0513)
// Get conversion labels from: Google Ads → Goals → Conversions → click each action → Tag setup
// Micro-conversion IDs need to be created in Google Ads UI:
//   Goals → Conversions → + New conversion action → Website
//   Create: Landing Page View, Start Intake, Intake Complete, Checkout Start
//   Then replace the placeholder IDs below with the real ones.
const CONVERSION_IDS = {
  // Main conversion: Payment completed
  PURCHASE: 'AW-17795889471/SqypCNva94YcEL_y3qVC',
  // Micro-conversions
  LANDING_VIEW: 'AW-17795889471/0nc1CO2Q8IYcEL_y3qVC',
  // START_INTAKE: no conversion action in Google Ads — tracked via trackStepEvent instead
  INTAKE_COMPLETE: 'AW-17795889471/sndHCPjy-IYcEL_y3qVC',
  CHECKOUT_START: 'AW-17795889471/4MCMCMrGhYccEL_y3qVC',
} as const

type ConversionEvent = keyof typeof CONVERSION_IDS

// Estimated conversion values for micro-conversions (used for Smart Bidding optimization)
const MICRO_CONVERSION_VALUES: Record<string, number> = {
  LANDING_VIEW: 0.50,
  INTAKE_COMPLETE: 5.00,
  CHECKOUT_START: 10.00,
}

interface ConversionData {
  value?: number
  currency?: string
  transaction_id?: string
  service?: string
  new_customer?: boolean
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
 * SHA-256 hash a string (for Enhanced Conversions)
 * Returns hex-encoded hash, or null if crypto unavailable
 */
async function sha256Hash(value: string): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null
  try {
    const normalized = value.trim().toLowerCase()
    const encoder = new TextEncoder()
    const data = encoder.encode(normalized)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

/**
 * Set Enhanced Conversions user data (hashed email/phone)
 * Call this when you have the user's email (e.g. after patient details step)
 */
export async function setEnhancedConversionsData(params: {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
}) {
  if (typeof window === 'undefined') return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData: Record<string, any> = {}

  if (params.email) {
    const hashedEmail = await sha256Hash(params.email)
    if (hashedEmail) userData.sha256_email_address = hashedEmail
  }

  if (params.phone) {
    const hashedPhone = await sha256Hash(params.phone)
    if (hashedPhone) userData.sha256_phone_number = hashedPhone
  }

  // Address-level Enhanced Conversions data
  const address: Record<string, string> = {}
  if (params.firstName) {
    const hashed = await sha256Hash(params.firstName)
    if (hashed) address.sha256_first_name = hashed
  }
  if (params.lastName) {
    const hashed = await sha256Hash(params.lastName)
    if (hashed) address.sha256_last_name = hashed
  }
  if (Object.keys(address).length > 0) {
    userData.address = address
  }

  if (Object.keys(userData).length > 0) {
    if (window.gtag) {
      window.gtag('set', 'user_data', userData)
    } else {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push(['set', 'user_data', userData])
    }
  }
}

/**
 * Initialize Google Consent Mode v2
 * Call this before any gtag calls (typically in layout)
 * Australian implied consent model: defaults to granted, users opt out via cookie banner.
 */
export function initConsentMode() {
  if (typeof window === 'undefined') return

  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }

  // Australian Privacy Act 1988 - implied consent model.
  // Defaults to granted; cookie banner provides opt-out.
  gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted',
  })
}

/**
 * Update consent state (call after user accepts cookies/consent)
 */
export function updateConsent(granted: {
  adStorage?: boolean
  adUserData?: boolean
  adPersonalization?: boolean
  analyticsStorage?: boolean
}) {
  if (typeof window === 'undefined') return

  const update = {
    ad_storage: granted.adStorage ? 'granted' : 'denied',
    ad_user_data: granted.adUserData ? 'granted' : 'denied',
    ad_personalization: granted.adPersonalization ? 'granted' : 'denied',
    analytics_storage: granted.analyticsStorage !== false ? 'granted' : 'denied',
  }

  if (window.gtag) {
    window.gtag('consent', 'update', update)
  } else {
    // Queue via dataLayer if gtag hasn't loaded yet (mirrors setEnhancedConversionsData)
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(['consent', 'update', update])
  }
}

/**
 * Fire a Google Ads conversion event
 * Uses dataLayer.push when gtag not yet loaded (e.g. lazyOnload) so events are queued
 */
export function trackConversion(event: ConversionEvent, data?: ConversionData) {
  if (typeof window === 'undefined') return

  const conversionId = CONVERSION_IDS[event]

  // Use micro-conversion value if no explicit value provided
  const value = data?.value ?? MICRO_CONVERSION_VALUES[event] ?? undefined

  const conversionPayload: Record<string, unknown> = {
    send_to: conversionId,
    value,
    currency: data?.currency || 'AUD',
    transaction_id: data?.transaction_id,
  }
  if (data?.new_customer !== undefined) {
    conversionPayload.new_customer = data.new_customer
  }

  const fireEvent = (fn: (...args: unknown[]) => void) => {
    fn('event', 'conversion', conversionPayload)
    fn('event', event.toLowerCase(), {
      event_category: 'conversion',
      event_label: data?.service,
      value,
      currency: data?.currency || 'AUD',
      transaction_id: data?.transaction_id,
      items: data?.items,
    })
  }

  if (window.gtag) {
    fireEvent(window.gtag)
  } else {
    // Queue for when gtag loads (dataLayer processes in order)
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(['event', 'conversion', conversionPayload])
    window.dataLayer.push(['event', event.toLowerCase(), {
      event_category: 'conversion',
      event_label: data?.service,
      value,
      currency: data?.currency || 'AUD',
      transaction_id: data?.transaction_id,
      items: data?.items,
    }])
  }
}

/**
 * Track purchase completion (main conversion)
 * Sets Enhanced Conversions user data (hashed email) before firing conversion
 */
export async function trackPurchase(params: {
  transactionId: string
  value: number
  service: string
  serviceName: string
  email?: string
  isNewCustomer?: boolean
}) {
  // Set enhanced conversions data before conversion (for better attribution)
  if (params.email) {
    await setEnhancedConversionsData({ email: params.email })
  }

  trackConversion('PURCHASE', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: 'AUD',
    service: params.service,
    new_customer: params.isNewCustomer,
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
 * Track funnel step progression with conversion values.
 * Optionally accepts email to set Enhanced Conversions user data
 * before firing the conversion event (improves cross-device attribution).
 */
export async function trackFunnelStep(
  step: 'landing' | 'start' | 'intake_complete' | 'checkout',
  service?: string,
  email?: string,
) {
  const eventMap: Record<string, ConversionEvent | null> = {
    landing: 'LANDING_VIEW',
    start: null,  // No Google Ads conversion action — tracked via trackStepEvent instead
    intake_complete: 'INTAKE_COMPLETE',
    checkout: 'CHECKOUT_START',
  }

  // Set Enhanced Conversions user data when email is available.
  // This links the conversion event to the user across devices.
  if (email) {
    await setEnhancedConversionsData({ email })
  }

  const event = eventMap[step]
  if (event) {
    trackConversion(event, { service })
  }

  // Store funnel progression
  storeFunnelStep(step, service)
}

/**
 * Track each intake step as a gtag event for remarketing audience building.
 * Fires a generic `funnel_step` event (not a conversion action) so Google Ads
 * can build audiences like "users who reached step 3 but didn't check out".
 */
export function trackStepEvent(params: {
  stepName: string
  stepIndex: number
  serviceType: string
  totalSteps: number
  email?: string
}) {
  if (typeof window === 'undefined') return

  const eventParams = {
    step_name: params.stepName,
    step_index: params.stepIndex,
    service_type: params.serviceType,
    total_steps: params.totalSteps,
  }

  if (window.gtag) {
    window.gtag('event', 'funnel_step', eventParams)
  } else {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(['event', 'funnel_step', eventParams])
  }
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
