/**
 * Attribution capture and persistence.
 *
 * Captures Google Ads click IDs (gclid, gbraid, wbraid), UTM params,
 * referrer, and landing page on first page load. Stores in sessionStorage
 * so the data survives navigation from landing pages (e.g. /medical-certificate)
 * through to checkout at /request.
 *
 * Usage:
 *   captureAttribution()  - call once on app load (GoogleTags useEffect)
 *   getAttribution()      - call at checkout to retrieve persisted data
 */

const CLICK_IDS = ["gclid", "gbraid", "wbraid"] as const
const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const
const STORAGE_KEY = "instantmed_attribution"

export interface AttributionData {
  gclid?: string
  gbraid?: string
  wbraid?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  referrer?: string
  landing_page?: string
  captured_at?: string
}

/**
 * Capture attribution params from the current URL and persist to sessionStorage.
 * Safe to call multiple times - only captures once per session (first landing).
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return

  // Don't overwrite existing attribution in the same session
  const existing = sessionStorage.getItem(STORAGE_KEY)
  if (existing) return

  const params = new URLSearchParams(window.location.search)
  const data: AttributionData = {}
  let hasData = false

  for (const key of [...CLICK_IDS, ...UTM_PARAMS]) {
    const val = params.get(key)
    if (val) {
      data[key] = val
      hasData = true
    }
  }

  // Always capture referrer and landing page for organic/direct attribution
  data.referrer = document.referrer || undefined
  data.landing_page = window.location.pathname
  data.captured_at = new Date().toISOString()

  if (hasData || data.referrer) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

/**
 * Retrieve persisted attribution data from sessionStorage.
 * Returns an empty object if nothing was captured or on the server.
 */
export function getAttribution(): AttributionData {
  if (typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AttributionData) : {}
  } catch {
    return {}
  }
}
