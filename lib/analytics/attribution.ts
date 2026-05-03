/**
 * Attribution capture and persistence.
 *
 * Captures Google Ads click IDs (gclid, gbraid, wbraid), UTM params,
 * referrer, and landing page on first page load. Stores in sessionStorage and
 * a first-party cookie so the data survives navigation from landing pages
 * (e.g. /medical-certificate) through to checkout at /request.
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
export const ATTRIBUTION_STORAGE_KEY = "instantmed_attribution"
export const ATTRIBUTION_COOKIE_KEY = "instantmed_attribution"

const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

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

function readStoredAttribution(): AttributionData {
  if (typeof window === "undefined") return {}

  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AttributionData
  } catch {
    // sessionStorage can be unavailable in privacy-restricted contexts.
  }

  try {
    const cookiePrefix = `${ATTRIBUTION_COOKIE_KEY}=`
    const rawCookie = document.cookie
      .split("; ")
      .find((part) => part.startsWith(cookiePrefix))
      ?.slice(cookiePrefix.length)
    return rawCookie ? (JSON.parse(decodeURIComponent(rawCookie)) as AttributionData) : {}
  } catch {
    return {}
  }
}

function writeStoredAttribution(data: AttributionData): void {
  if (typeof window === "undefined") return

  const encoded = encodeURIComponent(JSON.stringify(data))
  try {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Cookie fallback below still gives server actions a durable copy.
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ATTRIBUTION_COOKIE_KEY}=${encoded}; Path=/; Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

function hasPaidOrCampaignData(data: AttributionData): boolean {
  return Boolean(
    data.gclid ||
      data.gbraid ||
      data.wbraid ||
      data.utm_source ||
      data.utm_medium ||
      data.utm_campaign ||
      data.utm_content ||
      data.utm_term,
  )
}

/**
 * Capture attribution params from the current URL and persist to sessionStorage.
 * Safe to call multiple times. First-touch context is preserved, but a later
 * paid/UTM click in the same browser session is allowed to replace campaign
 * identifiers. That prevents an earlier direct visit from masking an ad click.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return

  const params = new URLSearchParams(window.location.search)
  const current: AttributionData = {}

  for (const key of [...CLICK_IDS, ...UTM_PARAMS]) {
    const val = params.get(key)
    if (val) {
      current[key] = val
    }
  }

  const existing = readStoredAttribution()
  const currentHasCampaign = hasPaidOrCampaignData(current)

  const data: AttributionData = {
    ...existing,
    ...current,
    referrer: currentHasCampaign
      ? document.referrer || existing.referrer
      : existing.referrer || document.referrer || undefined,
    landing_page: currentHasCampaign
      ? window.location.pathname
      : existing.landing_page || window.location.pathname,
    captured_at: currentHasCampaign || !existing.captured_at
      ? new Date().toISOString()
      : existing.captured_at,
  }

  writeStoredAttribution(data)
}

/**
 * Retrieve persisted attribution data from sessionStorage.
 * Returns an empty object if nothing was captured or on the server.
 */
export function getAttribution(): AttributionData {
  return readStoredAttribution()
}
