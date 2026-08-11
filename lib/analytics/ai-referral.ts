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
import { isExternalAnalyticsExcludedPathname } from "@/lib/browser/sensitive-capability-path"

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
 * Fires AI referral event to PostHog if the user arrived via an AI assistant.
 * Should be called once per session (on first pageview).
 *
 * Properties are tokens only — the raw referrer URL and raw utm_source were
 * deliberately removed (2026-08-11): the classifier already consumed them,
 * and raw external URLs do not belong in analytics events.
 */
export function trackAIReferral(): void {
  if (typeof window === "undefined") return
  if (isExternalAnalyticsExcludedPathname(window.location.pathname)) return

  const { isAIReferral, source, matchedBy } = detectAIReferral()
  if (!isAIReferral || !source) return

  import("posthog-js").then(({ default: posthog }) => {
    if (!posthog.__loaded) return

    posthog.capture("ai_referral", {
      ai_source: source,
      landing_page: window.location.pathname,
      matched_by: matchedBy,
    })
  }).catch(() => {})
}
