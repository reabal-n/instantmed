/**
 * Google Ads Conversion Tracking
 * Fires purchase conversion events and non-conversion funnel analytics events.
 *
 * Includes:
 * - Enhanced Conversions (hashed email for better attribution)
 * - Conversion value optimization (actual $ values for purchases)
 * - Google Consent Mode v2 support
 */

// Conversion action IDs — Google Ads account AW-17795889471 (account 920-501-0513)
// Get conversion labels from: Google Ads → Goals → Conversions → click each action → Tag setup
const CONVERSION_IDS = {
  // Main conversion: Payment completed
  PURCHASE: 'AW-17795889471/SqypCNva94YcEL_y3qVC',
} as const

type ConversionEvent = keyof typeof CONVERSION_IDS
type GtagFunction = (...args: unknown[]) => void

interface ConversionData {
  value?: number
  currency?: string
  transaction_id?: string
  service?: string
  new_customer?: boolean
  // GA4 Enhanced Ecommerce items[] schema (item_id/item_name/price/quantity).
  items?: Array<{
    item_id: string
    item_name: string
    price: number
    quantity: number
  }>
}

export interface EnhancedConversionsAddressData {
  sha256_first_name?: string
  sha256_last_name?: string
}

export interface EnhancedConversionsUserData {
  sha256_email_address?: string
  sha256_phone_number?: string
  address?: EnhancedConversionsAddressData
}

export interface EnhancedConversionsInput {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
}

declare global {
  interface Window {
    gtag?: GtagFunction
    dataLayer?: unknown[]
  }
}

function getOrCreateGtag(): GtagFunction {
  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function queuedGtag() {
      // eslint-disable-next-line prefer-rest-params -- Google tag's bootstrap shim pushes the Arguments object.
      window.dataLayer!.push(arguments)
    } as GtagFunction
  }

  return window.gtag
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

export async function buildEnhancedConversionsUserData(
  params: EnhancedConversionsInput,
): Promise<EnhancedConversionsUserData | null> {
  const userData: EnhancedConversionsUserData = {}

  if (params.email) {
    const hashedEmail = await sha256Hash(params.email)
    if (hashedEmail) userData.sha256_email_address = hashedEmail
  }

  if (params.phone) {
    const hashedPhone = await sha256Hash(params.phone)
    if (hashedPhone) userData.sha256_phone_number = hashedPhone
  }

  const address: EnhancedConversionsAddressData = {}
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

  return Object.keys(userData).length > 0 ? userData : null
}

/**
 * Set Enhanced Conversions user data (hashed email/phone)
 * Call this when you have the user's email (e.g. after patient details step)
 */
export async function setEnhancedConversionsData(params: EnhancedConversionsInput) {
  if (typeof window === 'undefined') return

  const userData = await buildEnhancedConversionsUserData(params)
  if (!userData) return

  getOrCreateGtag()('set', 'user_data', userData)
}

/**
 * Initialize Google Consent Mode v2
 * Call this before any gtag calls (typically in layout)
 * Australian implied consent model: defaults to granted, users opt out via cookie banner.
 */
export function initConsentMode() {
  if (typeof window === 'undefined') return

  const gtag = getOrCreateGtag()

  // Australian Privacy Act 1988 - implied consent model.
  // Defaults to granted; cookie banner provides opt-out.
  gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
    functionality_storage: 'granted',
    personalization_storage: 'granted',
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

  getOrCreateGtag()('consent', 'update', update)
}

/**
 * Fire a Google Ads conversion event
 * Queues through the same arguments-shaped dataLayer shim as Google tag when
 * gtag has not loaded yet.
 */
export function trackConversion(event: ConversionEvent, data?: ConversionData) {
  if (typeof window === 'undefined') return

  const conversionId = CONVERSION_IDS[event]
  const value = data?.value

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

  fireEvent(getOrCreateGtag())
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
    // GA4 Enhanced Ecommerce schema: item_id + item_name + price + quantity.
    // Sending {id, name} silently drops the row from GA4 ecommerce reports.
    items: [{
      item_id: params.service,
      item_name: params.serviceName,
      price: params.value,
      quantity: 1,
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
 * Track funnel step progression as analytics only.
 *
 * These milestones deliberately do not fire Google Ads conversion actions or
 * invented values. Purchase imports are the bidding source; funnel state stays
 * available for internal diagnostics and aggregate analytics.
 */
export async function trackFunnelStep(
  step: 'landing' | 'start' | 'intake_complete' | 'checkout',
  service?: string,
  _email?: string,
) {
  if (typeof window !== 'undefined') {
    getOrCreateGtag()('event', 'funnel_milestone', {
      event_category: 'funnel',
      funnel_step: step,
      service_type: service,
    })
  }

  // Store funnel progression
  storeFunnelStep(step, service)
}

/**
 * Track each intake step as a generic gtag event for aggregate funnel analysis.
 * This is not a Google Ads conversion action and must not be used to build
 * sensitive-health remarketing audiences.
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

  getOrCreateGtag()('event', 'funnel_step', eventParams)
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
