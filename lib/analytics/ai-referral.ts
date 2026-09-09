/**
 * AI Referral Detection
 *
 * Detects when users arrive via AI assistants (ChatGPT, Perplexity, Gemini,
 * etc.) and fires PostHog events for tracking AI-sourced traffic.
 *
 * Detection is exact (host-anchored referrer + exact utm_source values) via
 * the shared classifier in lib/analytics/ai-source.ts — the same list
 * classification reporting uses, so the event stream and the reporting
 * bucket can never drift apart again.
 */

import { classifyAiSource } from "@/lib/analytics/ai-source"
import { resolvePostHogClient } from "@/lib/analytics/posthog-client-resolver"
import { isExternalAnalyticsExcludedPathname } from "@/lib/browser/sensitive-capability-path"

const AI_REFERRAL_SESSION_STORAGE_KEY = "instantmed_ai_referral_session_v1"
const AI_REFERRAL_FALLBACK_STORAGE_KEY = "instantmed_ai_referral_session_fallback_v1"
const AI_REFERRAL_COOKIE_STORAGE_KEY = "instantmed_ai_referral_session_cookie_v1"
const AI_REFERRAL_STORAGE_PROBE_KEY = "instantmed_ai_referral_storage_probe_v1"
const AI_REFERRAL_FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000
const AI_REFERRAL_FALLBACK_MAX_AGE_SECONDS = AI_REFERRAL_FALLBACK_MAX_AGE_MS / 1000

type AIReferralCaptureResult = {
  properties?: Record<string, unknown>
}

type AIReferralPostHogClient = {
  __loaded?: boolean
  capture: (
    event: string,
    properties?: Record<string, unknown>,
    options?: { send_instantly?: boolean },
  ) => AIReferralCaptureResult | undefined
  has_opted_out_capturing?: () => boolean
  sessionManager?: {
    checkAndGetSessionAndWindowId: (readOnly?: boolean) => { sessionId: string }
  }
}

type FallbackMarker = {
  expiresAt: number
  sessionId: string
}

let trackedSessionIdInMemory: string | null = null

interface AIReferralResult {
  isAIReferral: boolean
  source: string | null
  matchedBy: "utm_source" | "referrer" | null
}

export type AIReferralLandingSnapshot = Readonly<{
  landingPage: string
  matchedBy: "utm_source" | "referrer"
  source: string
}>

/**
 * Detects AI referral from URL params (utm_source) or document referrer.
 */
export function detectAIReferral(): AIReferralResult {
  if (typeof window === "undefined") {
    return { isAIReferral: false, source: null, matchedBy: null }
  }

  const match = classifyAiSource({
    referrer: document.referrer,
    utmSource: new URLSearchParams(window.location.search).get("utm_source"),
  })
  if (!match) return { isAIReferral: false, source: null, matchedBy: null }

  return { isAIReferral: true, source: match.label, matchedBy: match.matchedBy }
}

/**
 * Captures the approved public landing as safe classifier tokens before any
 * asynchronous SDK import. Raw referral and query values are not retained.
 */
export function getEligibleAIReferralLanding(): AIReferralLandingSnapshot | null {
  if (typeof window === "undefined") return null
  const landingPage = window.location.pathname
  if (isExternalAnalyticsExcludedPathname(landingPage)) return null

  const { isAIReferral, source, matchedBy } = detectAIReferral()
  if (!isAIReferral || !source || !matchedBy) return null

  return Object.freeze({ landingPage, matchedBy, source })
}

function readFallbackMarker(): FallbackMarker | null {
  try {
    const raw = window.localStorage.getItem(AI_REFERRAL_FALLBACK_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<FallbackMarker>
    if (
      typeof parsed.sessionId === "string" &&
      parsed.sessionId.length > 0 &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt > Date.now()
    ) {
      return parsed as FallbackMarker
    }

    window.localStorage.removeItem(AI_REFERRAL_FALLBACK_STORAGE_KEY)
  } catch {
    // Local storage may also be denied; the in-memory marker still prevents
    // duplicate captures inside the current page lifecycle.
  }

  return null
}

function getCookieValue(name: string): string | null {
  try {
    const prefix = `${name}=`
    const cookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
  } catch {
    return null
  }
}

function cookieAttributes(maxAgeSeconds: number): string {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  return `; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`
}

function removeCookie(name: string): void {
  try {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
  } catch {
    // Cookie access can be denied independently of Web Storage.
  }
}

function readCookieMarker(): FallbackMarker | null {
  try {
    const raw = getCookieValue(AI_REFERRAL_COOKIE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<FallbackMarker>
    if (
      typeof parsed.sessionId === "string" &&
      parsed.sessionId.length > 0 &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt > Date.now()
    ) {
      return parsed as FallbackMarker
    }

    removeCookie(AI_REFERRAL_COOKIE_STORAGE_KEY)
  } catch {
    removeCookie(AI_REFERRAL_COOKIE_STORAGE_KEY)
  }

  return null
}

function canUseLocalStorageMarker(): boolean {
  try {
    window.localStorage.setItem(AI_REFERRAL_STORAGE_PROBE_KEY, "1")
    const available = window.localStorage.getItem(AI_REFERRAL_STORAGE_PROBE_KEY) === "1"
    window.localStorage.removeItem(AI_REFERRAL_STORAGE_PROBE_KEY)
    return available
  } catch {
    return false
  }
}

function canUseCookieMarker(): boolean {
  try {
    document.cookie = `${AI_REFERRAL_STORAGE_PROBE_KEY}=1${cookieAttributes(60)}`
    const available = getCookieValue(AI_REFERRAL_STORAGE_PROBE_KEY) === "1"
    removeCookie(AI_REFERRAL_STORAGE_PROBE_KEY)
    return available
  } catch {
    return false
  }
}

type CrossTabMarkerStore = "cookie" | "localStorage"

function getCrossTabMarkerStore(): CrossTabMarkerStore | null {
  if (canUseLocalStorageMarker()) return "localStorage"
  if (canUseCookieMarker()) return "cookie"
  return null
}

function hasTrackedSession(sessionId: string): boolean {
  if (trackedSessionIdInMemory === sessionId) return true

  try {
    if (window.sessionStorage.getItem(AI_REFERRAL_SESSION_STORAGE_KEY) === sessionId) {
      trackedSessionIdInMemory = sessionId
      return true
    }
  } catch {
    // Fall through to the bounded local-storage marker.
  }

  if (readFallbackMarker()?.sessionId === sessionId) {
    trackedSessionIdInMemory = sessionId
    return true
  }

  if (readCookieMarker()?.sessionId === sessionId) {
    trackedSessionIdInMemory = sessionId
    return true
  }

  return false
}

function rememberTrackedSession(
  sessionId: string,
  crossTabMarkerStore: CrossTabMarkerStore,
): void {
  trackedSessionIdInMemory = sessionId

  try {
    window.sessionStorage.setItem(AI_REFERRAL_SESSION_STORAGE_KEY, sessionId)
  } catch {
    // Continue to the bounded cross-tab marker when sessionStorage is denied.
  }

  const marker: FallbackMarker = {
    expiresAt: Date.now() + AI_REFERRAL_FALLBACK_MAX_AGE_MS,
    sessionId,
  }

  if (crossTabMarkerStore === "localStorage") {
    try {
      window.localStorage.setItem(AI_REFERRAL_FALLBACK_STORAGE_KEY, JSON.stringify(marker))
    } catch {
      // The verified store became unavailable after capture. The accepted
      // event remains marked for this module lifecycle and sessionStorage.
    }
    return
  }

  try {
    document.cookie = `${AI_REFERRAL_COOKIE_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(marker))}${cookieAttributes(AI_REFERRAL_FALLBACK_MAX_AGE_SECONDS)}`
  } catch {
    // The verified cookie store became unavailable after capture.
  }
}

function captureAIReferral(
  posthog: AIReferralPostHogClient,
  landing: AIReferralLandingSnapshot,
): void {
  if (isExternalAnalyticsExcludedPathname(window.location.pathname)) return
  if (!posthog.__loaded) return
  if (posthog.has_opted_out_capturing?.()) return

  const crossTabMarkerStore = getCrossTabMarkerStore()
  if (!crossTabMarkerStore) return

  const sessionId = posthog.sessionManager
    ?.checkAndGetSessionAndWindowId()
    .sessionId
  if (!sessionId || hasTrackedSession(sessionId)) return

  const captureResult = posthog.capture("ai_referral", {
    ai_source: landing.source,
    landing_page: landing.landingPage,
    matched_by: landing.matchedBy,
  }, { send_instantly: true })
  const acceptedSessionId = captureResult?.properties?.$session_id
  if (typeof acceptedSessionId !== "string" || !acceptedSessionId) return

  rememberTrackedSession(acceptedSessionId, crossTabMarkerStore)
}

/**
 * Fires AI referral event to PostHog if the user arrived via an AI assistant.
 * Should be called once per session (on first pageview).
 *
 * Properties are tokens only — the raw referrer URL and raw utm_source were
 * deliberately removed (2026-08-11): the classifier already consumed them,
 * and raw external URLs do not belong in analytics events.
 */
export function trackAIReferral(
  client?: AIReferralPostHogClient,
  approvedLanding?: AIReferralLandingSnapshot,
): void {
  if (typeof window === "undefined") return
  if (isExternalAnalyticsExcludedPathname(window.location.pathname)) return

  const landing = approvedLanding ?? getEligibleAIReferralLanding()
  if (!landing) return

  if (client) {
    captureAIReferral(client, landing)
    return
  }

  import("posthog-js").then((module) => {
    const posthog = resolvePostHogClient(module)
    if (!posthog) return
    captureAIReferral(posthog, landing)
  }).catch(() => {})
}
