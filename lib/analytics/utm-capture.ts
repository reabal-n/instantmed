/**
 * UTM Parameter Capture & Storage
 * 
 * Captures UTM parameters from URL and stores them for attribution tracking.
 * These are attached to intake creation for ad spend ROI analysis.
 */

export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  gclid?: string // Google Ads click ID
  fbclid?: string // Facebook click ID
  referrer?: string
  landing_page?: string
  captured_at?: string
}

const UTM_STORAGE_KEY = "instantmed_utm_params"
const UTM_EXPIRY_HOURS = 24 * 7 // 7 days

/**
 * Capture UTM parameters from current URL
 * Should be called on initial page load
 */
export function captureUTMParams(): UTMParams | null {
  if (typeof window === "undefined") return null

  const params = new URLSearchParams(window.location.search)
  
  const utmParams: UTMParams = {}
  let hasParams = false

  // Standard UTM parameters
  const utmKeys: (keyof UTMParams)[] = [
    "utm_source",
    "utm_medium", 
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
  ]

  for (const key of utmKeys) {
    const value = params.get(key)
    if (value) {
      utmParams[key] = value
      hasParams = true
    }
  }

  if (!hasParams) {
    // No UTM params in URL, return stored params if available
    return getStoredUTMParams()
  }

  // Add metadata
  utmParams.referrer = document.referrer || undefined
  utmParams.landing_page = window.location.pathname
  utmParams.captured_at = new Date().toISOString()

  // Store for later use
  storeUTMParams(utmParams)

  return utmParams
}

/**
 * Store UTM params in localStorage with expiry
 */
function storeUTMParams(params: UTMParams): void {
  if (typeof window === "undefined") return

  try {
    const data = {
      params,
      expiry: Date.now() + UTM_EXPIRY_HOURS * 60 * 60 * 1000,
    }
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage not available
  }
}

/**
 * Get stored UTM params if not expired
 */
export function getStoredUTMParams(): UTMParams | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY)
    if (!stored) return null

    const data = JSON.parse(stored)
    if (Date.now() > data.expiry) {
      localStorage.removeItem(UTM_STORAGE_KEY)
      return null
    }

    return data.params
  } catch {
    return null
  }
}

/**
 * Clear stored UTM params (e.g., after conversion)
 */
export function clearStoredUTMParams(): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.removeItem(UTM_STORAGE_KEY)
  } catch {
    // localStorage not available
  }
}

/**
 * Get UTM params for intake creation
 * Returns params suitable for storing in database
 */
export function getUTMParamsForIntake(): Record<string, string> | null {
  const params = getStoredUTMParams() || captureUTMParams()
  if (!params) return null

  // Filter out empty values and metadata
  const filtered: Record<string, string> = {}
  const attributionKeys: (keyof UTMParams)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "referrer",
    "landing_page",
  ]

  for (const key of attributionKeys) {
    if (params[key]) {
      filtered[key] = params[key] as string
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : null
}

/**
 * Hook to capture UTM params on component mount
 */
export function useUTMCapture(): UTMParams | null {
  if (typeof window === "undefined") return null
  
  // Capture on first call
  return captureUTMParams()
}
