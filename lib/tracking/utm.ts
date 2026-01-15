// UTM Parameter Tracking and Attribution

export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  gclid?: string
  fbclid?: string
  ref?: string
}

const UTM_KEYS: (keyof UTMParams)[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'ref',
]

const STORAGE_KEY = 'instantmed_utm_params'
const STORAGE_EXPIRY_KEY = 'instantmed_utm_expiry'
const EXPIRY_DAYS = 30

/**
 * Extract UTM parameters from URL search params
 */
export function extractUTMFromURL(searchParams: URLSearchParams): UTMParams {
  const params: UTMParams = {}
  
  for (const key of UTM_KEYS) {
    const value = searchParams.get(key)
    if (value) {
      params[key] = value
    }
  }
  
  return params
}

/**
 * Store UTM parameters in localStorage with expiry
 */
export function storeUTMParams(params: UTMParams): void {
  if (typeof window === 'undefined') return
  if (Object.keys(params).length === 0) return
  
  try {
    // Get existing params and merge (first touch attribution)
    const existing = getStoredUTMParams()
    const merged = { ...params, ...existing } // Existing takes precedence (first touch)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    
    // Set expiry if not already set
    if (!localStorage.getItem(STORAGE_EXPIRY_KEY)) {
      const expiry = Date.now() + (EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      localStorage.setItem(STORAGE_EXPIRY_KEY, expiry.toString())
    }
  } catch (_e) {
    // Silently fail - localStorage may be unavailable
  }
}

/**
 * Get stored UTM parameters (if not expired)
 */
export function getStoredUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {}
  
  try {
    const expiry = localStorage.getItem(STORAGE_EXPIRY_KEY)
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      // Expired, clear storage
      clearUTMParams()
      return {}
    }
    
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (_e) {
    return {}
  }
}

/**
 * Clear stored UTM parameters
 */
export function clearUTMParams(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_EXPIRY_KEY)
  } catch (_e) {
    // Silently fail
  }
}

/**
 * Get UTM params as query string for appending to URLs
 */
export function getUTMQueryString(): string {
  const params = getStoredUTMParams()
  const entries = Object.entries(params).filter(([, v]) => v)
  
  if (entries.length === 0) return ''
  
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
}

/**
 * Append UTM params to a URL
 */
export function appendUTMToURL(url: string): string {
  const params = getStoredUTMParams()
  if (Object.keys(params).length === 0) return url
  
  const urlObj = new URL(url, window.location.origin)
  
  for (const [key, value] of Object.entries(params)) {
    if (value && !urlObj.searchParams.has(key)) {
      urlObj.searchParams.set(key, value)
    }
  }
  
  return urlObj.pathname + urlObj.search
}

/**
 * Get attribution data for analytics/conversion tracking
 */
export function getAttributionData(): {
  source: string
  medium: string
  campaign: string
  isOrganic: boolean
  isPaid: boolean
  channel: string
} {
  const params = getStoredUTMParams()
  
  const source = params.utm_source || 'direct'
  const medium = params.utm_medium || 'none'
  const campaign = params.utm_campaign || ''
  
  const isPaid = !!(params.gclid || params.fbclid || medium.includes('cpc') || medium.includes('paid'))
  const isOrganic = medium === 'organic' || source === 'google' && !isPaid
  
  let channel = 'direct'
  if (isPaid) channel = 'paid'
  else if (isOrganic) channel = 'organic'
  else if (medium === 'email') channel = 'email'
  else if (medium === 'social' || ['facebook', 'instagram', 'twitter', 'linkedin'].includes(source)) channel = 'social'
  else if (medium === 'referral' || params.ref) channel = 'referral'
  
  return {
    source,
    medium,
    campaign,
    isOrganic,
    isPaid,
    channel,
  }
}
