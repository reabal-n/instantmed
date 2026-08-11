/**
 * Exact AI-source classification — the ONE list for AI referral detection.
 *
 * Replaces two divergent substring lists (ai-referral.ts vs
 * source-classification.ts) that false-positived real non-AI traffic:
 * `utm_source=youtube` matched the "you" token, `bing` matched Copilot,
 * `meta` matched Meta AI, `gemini_test` matched Gemini, and any referrer
 * merely containing "chatgpt" (e.g. reddit.com/r/chatgpt) counted as an AI
 * arrival. AI-channel revenue is decision-grade data — matching is exact:
 * URL-parsed host (domain or subdomain suffix) and exact normalized
 * utm_source values only.
 *
 * Add engines here only with observed production or vendor evidence.
 * `bing.com/chat` was deliberately dropped: host+path matching cannot be
 * anchored without classifying all organic Bing, and Copilot arrivals come
 * from copilot.microsoft.com.
 */

export interface AiSourceMatch {
  /** Display label — keep values stable, they are live PostHog series. */
  label: string
  matchedBy: "utm_source" | "referrer"
}

const AI_REFERRER_DOMAINS: ReadonlyArray<{ domain: string; label: string }> = [
  { domain: "chatgpt.com", label: "ChatGPT" },
  { domain: "chat.openai.com", label: "ChatGPT" },
  { domain: "perplexity.ai", label: "Perplexity" },
  { domain: "gemini.google.com", label: "Gemini" },
  { domain: "bard.google.com", label: "Gemini" },
  { domain: "copilot.microsoft.com", label: "Copilot" },
  { domain: "claude.ai", label: "Claude" },
  { domain: "you.com", label: "You.com" },
  { domain: "phind.com", label: "Phind" },
  { domain: "kagi.com", label: "Kagi" },
  { domain: "poe.com", label: "Poe" },
  { domain: "meta.ai", label: "Meta AI" },
]

/**
 * Exact normalized utm_source values LLM apps decorate outbound links with
 * (ChatGPT appends `utm_source=chatgpt.com`). Exact equality only — never
 * substring — so `gemini_test`, `youtube`, `bing`, and `meta` stay non-AI.
 */
const AI_UTM_SOURCES: ReadonlyMap<string, string> = new Map([
  ["chatgpt.com", "ChatGPT"],
  ["chatgpt", "ChatGPT"],
  ["perplexity", "Perplexity"],
  ["perplexity.ai", "Perplexity"],
  ["gemini", "Gemini"],
  ["copilot", "Copilot"],
  ["copilot.microsoft.com", "Copilot"],
  ["claude", "Claude"],
  ["claude.ai", "Claude"],
])

function parseHost(referrer: string): string | null {
  const trimmed = referrer.trim()
  if (!trimmed) return null
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const host = new URL(withScheme).hostname.toLowerCase()
    return host.startsWith("www.") ? host.slice(4) : host
  } catch {
    return null
  }
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

/**
 * Classify an arrival as AI-sourced from utm_source and/or referrer.
 * Returns null for everything that is not exact evidence of an AI engine.
 */
export function classifyAiSource(input: {
  referrer?: string | null
  utmSource?: string | null
}): AiSourceMatch | null {
  const utmSource = input.utmSource?.trim().toLowerCase()
  if (utmSource) {
    const label = AI_UTM_SOURCES.get(utmSource)
    if (label) return { label, matchedBy: "utm_source" }
  }

  const host = input.referrer ? parseHost(input.referrer) : null
  if (host) {
    for (const { domain, label } of AI_REFERRER_DOMAINS) {
      if (hostMatches(host, domain)) return { label, matchedBy: "referrer" }
    }
  }

  return null
}
