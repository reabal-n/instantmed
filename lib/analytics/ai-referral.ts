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
const AI_REFERRAL_FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000

type AIReferralPostHogClient = {
  __loaded?: boolean
  capture: (
    event: string,
    properties?: Record<string, unknown>,
    options?: { send_instantly?: boolean },
  ) => unknown
  get_session_id: () => string
  has_opted_out_capturing?: () => boolean
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
 * Returns true only when the current public landing has exact AI-source
 * evidence. Instrumentation uses this to bypass interaction deferral for
 * PostHog alone; sensitive/private paths still fail closed.
 */
export function isEligibleAIReferralLanding(): boolean {
  if (typeof window === "undefined") return false
  if (isExternalAnalyticsExcludedPathname(window.location.pathname)) return false
  return detectAIReferral().isAIReferral
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

  return false
}

function rememberTrackedSession(sessionId: string): void {
  trackedSessionIdInMemory = sessionId

  try {
    window.sessionStorage.setItem(AI_REFERRAL_SESSION_STORAGE_KEY, sessionId)
  } catch {
    // Continue to the bounded cross-tab marker when sessionStorage is denied.
  }

  try {
    const marker: FallbackMarker = {
      expiresAt: Date.now() + AI_REFERRAL_FALLBACK_MAX_AGE_MS,
      sessionId,
    }
    window.localStorage.setItem(AI_REFERRAL_FALLBACK_STORAGE_KEY, JSON.stringify(marker))
  } catch {
    // With all browser storage denied, only the current module lifecycle can
    // be deduplicated. PostHog cannot provide a reload-stable session in that
    // storage state either.
  }
}

function captureAIReferral(posthog: AIReferralPostHogClient): void {
  if (!posthog.__loaded) return
  if (posthog.has_opted_out_capturing?.()) return

  const sessionId = posthog.get_session_id()
  if (!sessionId || hasTrackedSession(sessionId)) return

  const { isAIReferral, source, matchedBy } = detectAIReferral()
  if (!isAIReferral || !source) return

  posthog.capture("ai_referral", {
    ai_source: source,
    landing_page: window.location.pathname,
    matched_by: matchedBy,
  }, { send_instantly: true })
  rememberTrackedSession(sessionId)
}

/**
 * Fires AI referral event to PostHog if the user arrived via an AI assistant.
 * Should be called once per session (on first pageview).
 *
 * Properties are tokens only — the raw referrer URL and raw utm_source were
 * deliberately removed (2026-08-11): the classifier already consumed them,
 * and raw external URLs do not belong in analytics events.
 */
export function trackAIReferral(client?: AIReferralPostHogClient): void {
  if (typeof window === "undefined") return
  if (isExternalAnalyticsExcludedPathname(window.location.pathname)) return
  if (!detectAIReferral().isAIReferral) return

  if (client) {
    captureAIReferral(client)
    return
  }

  import("posthog-js").then((module) => {
    const posthog = resolvePostHogClient(module)
    if (!posthog) return
    captureAIReferral(posthog)
  }).catch(() => {})
}
