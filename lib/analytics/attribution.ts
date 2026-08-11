/**
 * Attribution capture and persistence.
 *
 * Captures Google Ads click IDs (gclid, gbraid, wbraid), UTM params,
 * Google Ads ValueTrack params, referrer, and landing page on first page load.
 * Stores in sessionStorage and a first-party cookie so the data survives
 * navigation from landing pages (e.g. /medical-certificate) through to checkout
 * at /request.
 *
 * Usage:
 *   captureAttribution()  - call once on app load (GoogleTags useEffect)
 *   getAttribution()      - call at checkout to retrieve persisted data
 */

import { deriveChannelFromClickIds } from "@/lib/analytics/click-id-channels"
import { sanitizeAttributionReferrer } from "@/lib/analytics/referrer-privacy"
import { isExternalAnalyticsExcludedPathname } from "@/lib/browser/sensitive-capability-path"

const CLICK_IDS = ["gclid", "gbraid", "wbraid"] as const
const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_id",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const
const GOOGLE_ADS_VALUE_TRACK_PARAMS = [
  "campaignid",
  "adgroupid",
  "keyword",
  "creative",
  "matchtype",
  "device",
  "network",
] as const
export const ATTRIBUTION_STORAGE_KEY = "instantmed_attribution"
export const ATTRIBUTION_COOKIE_KEY = "instantmed_attribution"

const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const ATTRIBUTION_MAX_AGE_MS = ATTRIBUTION_COOKIE_MAX_AGE_SECONDS * 1000

/**
 * The 30-day window is a real retention bound, not just a cookie default.
 * Records missing `captured_at` or older than 30 days are expired: dropped
 * from reads, purged from their store, and never re-minted with a fresh
 * clock by a later pageview. Only a genuinely new campaign touch (which
 * stamps a new `captured_at`) restarts the window.
 */
function attributionRemainingSeconds(data: AttributionData, now = Date.now()): number {
  const capturedAt = Date.parse(data.captured_at ?? "")
  if (!Number.isFinite(capturedAt)) return 0
  const remainingMs = ATTRIBUTION_MAX_AGE_MS - (now - capturedAt)
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0
}

function isExpiredAttribution(data: AttributionData): boolean {
  return attributionRemainingSeconds(data) <= 0
}

export interface AttributionData {
  gclid?: string
  gbraid?: string
  wbraid?: string
  utm_source?: string
  utm_medium?: string
  utm_id?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  campaignid?: string
  adgroupid?: string
  keyword?: string
  creative?: string
  matchtype?: string
  device?: string
  network?: string
  referrer?: string
  landing_page?: string
  captured_at?: string
}

const ATTRIBUTION_DATA_KEYS = [
  ...CLICK_IDS,
  ...UTM_PARAMS,
  ...GOOGLE_ADS_VALUE_TRACK_PARAMS,
  "referrer",
  "landing_page",
  "captured_at",
] as const satisfies ReadonlyArray<keyof AttributionData>

function compactAttribution(data?: AttributionData | null): AttributionData {
  const compact: AttributionData = {}
  if (!data) return compact

  for (const key of ATTRIBUTION_DATA_KEYS) {
    const value = data[key]
    if (typeof value !== "string") continue

    const trimmed = value.trim()
    if (trimmed) compact[key] = trimmed
  }

  return compact
}

function hasAttributionValue(data: AttributionData): boolean {
  return ATTRIBUTION_DATA_KEYS.some((key) => Boolean(data[key]))
}

function capturedAtMs(data: AttributionData): number {
  const parsed = Date.parse(data.captured_at ?? "")
  return Number.isFinite(parsed) ? parsed : 0
}

function parseStoredAttribution(raw: string | null): AttributionData | null {
  if (!raw) return null

  try {
    return compactAttribution(JSON.parse(raw) as AttributionData)
  } catch {
    return null
  }
}

export function mergeAttributionByRecency(
  ...sources: Array<AttributionData | null | undefined>
): AttributionData {
  const compactSources = sources
    .map((source) => compactAttribution(source))
    .filter(hasAttributionValue)
    .sort((a, b) => capturedAtMs(a) - capturedAtMs(b))

  return compactSources.reduce<AttributionData>(
    (merged, source) => ({ ...merged, ...source }),
    {},
  )
}

function expireAttributionCookie(): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ATTRIBUTION_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

function readStoredAttribution(): AttributionData {
  if (typeof window === "undefined") return {}

  const sources: AttributionData[] = []

  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)
    const parsed = parseStoredAttribution(raw)
    if (parsed && !isExpiredAttribution(parsed)) {
      sources.push(parsed)
    } else if (raw) {
      sessionStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
    }
  } catch {
    // sessionStorage can be unavailable in privacy-restricted contexts.
  }

  try {
    const raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY)
    const parsed = parseStoredAttribution(raw)
    if (parsed && !isExpiredAttribution(parsed)) {
      sources.push(parsed)
    } else if (raw) {
      localStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
    }
  } catch {
    // localStorage can be unavailable in privacy-restricted contexts.
  }

  try {
    const cookiePrefix = `${ATTRIBUTION_COOKIE_KEY}=`
    const rawCookie = document.cookie
      .split("; ")
      .find((part) => part.startsWith(cookiePrefix))
      ?.slice(cookiePrefix.length)
    const parsed = rawCookie
      ? parseStoredAttribution(decodeURIComponent(rawCookie))
      : null
    if (parsed && !isExpiredAttribution(parsed)) {
      sources.push(parsed)
    } else if (rawCookie) {
      expireAttributionCookie()
    }
  } catch {
    // Cookie can be unavailable or malformed; storage sources may still exist.
  }

  return mergeAttributionByRecency(...sources)
}

function writeStoredAttribution(data: AttributionData): void {
  if (typeof window === "undefined") return

  // Cookie lifetime = the record's REMAINING lifetime. Re-minting a full 30
  // days on every pageview turned the 30-day window into indefinite
  // retention (localStorage resupplied the record, the next visit re-set a
  // fresh cookie, forever).
  const remainingSeconds = attributionRemainingSeconds(data)
  if (remainingSeconds <= 0) return

  const encoded = encodeURIComponent(JSON.stringify(data))
  try {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage + cookie fallbacks below still give checkout a durable copy.
  }

  try {
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Cookie fallback below still gives server actions a durable copy.
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ATTRIBUTION_COOKIE_KEY}=${encoded}; Path=/; Max-Age=${remainingSeconds}; SameSite=Lax${secure}`
}

function hasPaidOrCampaignData(data: AttributionData): boolean {
  return Boolean(
    data.gclid ||
      data.gbraid ||
      data.wbraid ||
      data.utm_source ||
      data.utm_medium ||
      data.utm_id ||
      data.utm_campaign ||
      data.utm_content ||
      data.utm_term ||
      data.campaignid ||
      data.adgroupid ||
      data.keyword ||
      data.creative ||
      data.matchtype ||
      data.device ||
      data.network,
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
  if (isExternalAnalyticsExcludedPathname(window.location.pathname)) return

  const params = new URLSearchParams(window.location.search)
  const current: AttributionData = {}

  for (const key of [...CLICK_IDS, ...UTM_PARAMS, ...GOOGLE_ADS_VALUE_TRACK_PARAMS]) {
    const val = params.get(key)
    if (val) {
      current[key] = val
    }
  }

  const existing = readStoredAttribution()

  // A non-Google ad click (Meta fbclid, Microsoft msclkid, TikTok ttclid,
  // LinkedIn li_fat_id) carries no utm_source, so without this the paid order
  // would land as "direct". Derive its channel into utm_source/utm_medium so
  // it attributes as other_paid. Only when no utm_source is already present.
  if (!current.utm_source && !existing.utm_source) {
    const derived = deriveChannelFromClickIds(params)
    if (derived) {
      current.utm_source = derived.utm_source
      current.utm_medium = current.utm_medium || derived.utm_medium
    }
  }

  const currentHasCampaign = hasPaidOrCampaignData(current)

  // Sanitize BEFORE persistence: external referrers keep origin only,
  // internal ones keep path only. Raw URLs (paths, query strings) never
  // enter cookie/localStorage/sessionStorage.
  const sanitizedCurrentReferrer = sanitizeAttributionReferrer(
    document.referrer,
    window.location.origin,
  )
  const sanitizedExistingReferrer = sanitizeAttributionReferrer(
    existing.referrer,
    window.location.origin,
  )

  const data: AttributionData = {
    ...existing,
    ...current,
    referrer: currentHasCampaign
      ? sanitizedCurrentReferrer || sanitizedExistingReferrer
      : sanitizedExistingReferrer || sanitizedCurrentReferrer,
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
