/**
 * AI Referral Detection
 *
 * Detects when users arrive via AI assistants (ChatGPT, Perplexity, Gemini, etc.)
 * and fires PostHog events for tracking AI-sourced traffic.
 */

const AI_REFERRER_PATTERNS: Record<string, string> = {
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "perplexity.ai": "Perplexity",
  "gemini.google.com": "Gemini",
  "bard.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot",
  "bing.com/chat": "Copilot",
  "claude.ai": "Claude",
  "you.com": "You.com",
  "phind.com": "Phind",
  "kagi.com": "Kagi",
  "poe.com": "Poe",
  "meta.ai": "Meta AI",
}

interface AIReferralResult {
  isAIReferral: boolean
  source: string | null
}

/**
 * Detects AI referral from URL params (utm_source) or document referrer.
 */
export function detectAIReferral(): AIReferralResult {
  if (typeof window === "undefined") {
    return { isAIReferral: false, source: null }
  }

  // Check utm_source first (most reliable — ChatGPT sets this)
  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get("utm_source")?.toLowerCase() ?? ""

  for (const [pattern, name] of Object.entries(AI_REFERRER_PATTERNS)) {
    if (utmSource.includes(pattern.split(".")[0])) {
      return { isAIReferral: true, source: name }
    }
  }

  // Check document referrer
  const referrer = document.referrer.toLowerCase()
  if (!referrer) return { isAIReferral: false, source: null }

  for (const [pattern, name] of Object.entries(AI_REFERRER_PATTERNS)) {
    if (referrer.includes(pattern)) {
      return { isAIReferral: true, source: name }
    }
  }

  return { isAIReferral: false, source: null }
}

/**
 * Fires AI referral event to PostHog if the user arrived via an AI assistant.
 * Should be called once per session (on first pageview).
 */
export function trackAIReferral(): void {
  const { isAIReferral, source } = detectAIReferral()
  if (!isAIReferral || !source) return

  import("posthog-js").then(({ default: posthog }) => {
    if (!posthog.__loaded) return

    posthog.capture("ai_referral", {
      ai_source: source,
      landing_page: window.location.pathname,
      referrer: document.referrer,
      utm_source: new URLSearchParams(window.location.search).get("utm_source"),
    })

    // Set person property so we can segment AI-referred users
    posthog.setPersonPropertiesForFlags({ ai_referred: true, ai_source: source })
  }).catch(() => {})
}
