export type AttributionSourceGroup =
  | "google_ads"
  | "organic_nonbrand"
  | "organic_brand"
  | "ai_referral"
  | "recovery_email"
  | "referral"
  | "direct"
  | "unknown"
  | "other_paid"

export type AttributionClassificationInput = {
  adgroupid?: string | null
  campaignid?: string | null
  creative?: string | null
  device?: string | null
  gbraid?: string | null
  gclid?: string | null
  keyword?: string | null
  landing_page?: string | null
  matchtype?: string | null
  network?: string | null
  referrer?: string | null
  utm_campaign?: string | null
  utm_medium?: string | null
  utm_source?: string | null
  utm_term?: string | null
  wbraid?: string | null
}

export type AttributionClassification = {
  action: string
  group: AttributionSourceGroup
  known: boolean
  label: string
  source: string
}

export const ATTRIBUTION_SOURCE_LABELS: Record<AttributionSourceGroup, string> = {
  google_ads: "Google Ads",
  organic_nonbrand: "Organic non-brand",
  organic_brand: "Organic brand",
  ai_referral: "AI referral",
  recovery_email: "Recovery email",
  referral: "Referral",
  direct: "Direct",
  unknown: "Unknown",
  other_paid: "Other paid",
}

export const ATTRIBUTION_SOURCE_ORDER: AttributionSourceGroup[] = [
  "google_ads",
  "organic_nonbrand",
  "organic_brand",
  "ai_referral",
  "recovery_email",
  "referral",
  "direct",
  "unknown",
  "other_paid",
]

const AI_PATTERNS = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "copilot",
  "poe.com",
  "you.com",
]

const SEARCH_HOST_PATTERNS = [
  "google.",
  "bing.",
  "duckduckgo.",
  "yahoo.",
  "ecosia.",
  "search.brave.",
]

const PAID_MEDIUM_PATTERNS = [
  "cpc",
  "ppc",
  "paid",
  "paid_search",
  "sem",
  "search_ads",
]

const NONBRAND_HINTS = [
  "nonbrand",
  "non-brand",
  "generic",
  "medical certificate",
  "medical-cert",
  "prescription",
  "repeat script",
  "repeat-script",
  "doctor online",
  "online doctor",
  "telehealth",
  "hair loss",
  "ed",
  "erectile",
]

function clean(value?: string | null): string {
  return value?.trim() ?? ""
}

function lower(value?: string | null): string {
  return clean(value).toLowerCase()
}

function firstPresent(...values: Array<string | null | undefined>): string {
  return values.map(clean).find(Boolean) ?? ""
}

function hasClickId(row: AttributionClassificationInput): boolean {
  return Boolean(clean(row.gclid) || clean(row.gbraid) || clean(row.wbraid))
}

function hasGoogleValueTrack(row: AttributionClassificationInput): boolean {
  return Boolean(
    clean(row.campaignid) ||
      clean(row.adgroupid) ||
      clean(row.keyword) ||
      clean(row.creative) ||
      clean(row.matchtype) ||
      clean(row.device) ||
      clean(row.network),
  )
}

function referrerHost(referrer?: string | null): string {
  const raw = clean(referrer)
  if (!raw) return ""

  try {
    return new URL(raw).hostname.replace(/^www\./, "")
  } catch {
    return raw
  }
}

function landingPath(landingPage?: string | null): string {
  const raw = clean(landingPage)
  if (!raw) return ""

  try {
    const url = raw.startsWith("http")
      ? new URL(raw)
      : new URL(raw, "https://instantmed.com.au")
    return `${url.pathname}${url.search ? url.search : ""}`
  } catch {
    return raw
  }
}

function containsAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern))
}

function classifyOrganic(row: AttributionClassificationInput): AttributionClassification {
  const tokens = [
    lower(row.utm_source),
    lower(row.utm_medium),
    lower(row.utm_campaign),
    lower(row.utm_term),
    lower(row.landing_page),
  ].join(" ")
  const path = landingPath(row.landing_page)
  const isBrand =
    tokens.includes("instantmed") ||
    /\bbrand(ed)?\b/.test(tokens) ||
    path === "/" ||
    path === ""
  const group: AttributionSourceGroup =
    isBrand && !containsAny(tokens, NONBRAND_HINTS)
      ? "organic_brand"
      : "organic_nonbrand"

  return {
    action:
      group === "organic_brand"
        ? "Track separately from direct so brand demand does not mask generic SEO."
        : "Keep SEO pages and Search Console terms mapped to paid orders.",
    group,
    known: true,
    label: ATTRIBUTION_SOURCE_LABELS[group],
    source: ATTRIBUTION_SOURCE_LABELS[group],
  }
}

export function classifyAttributionSource(
  row: AttributionClassificationInput,
): AttributionClassification {
  const utmSource = lower(row.utm_source)
  const utmMedium = lower(row.utm_medium)
  const utmCampaign = lower(row.utm_campaign)
  const utmTerm = lower(row.utm_term)
  const referrer = lower(row.referrer)
  const host = referrerHost(row.referrer)
  const hostLower = host.toLowerCase()
  const sourceLabel = firstPresent(row.utm_source, host, row.landing_page)

  if (hasClickId(row) || hasGoogleValueTrack(row)) {
    return {
      action: "Verify click IDs, ValueTrack IDs, and server-side conversion uploads daily.",
      group: "google_ads",
      known: true,
      label: ATTRIBUTION_SOURCE_LABELS.google_ads,
      source: sourceLabel || "google_ads",
    }
  }

  if (
    utmSource.includes("recovery_email") ||
    utmCampaign.includes("recovery") ||
    utmCampaign.includes("abandoned") ||
    (utmMedium === "email" && utmSource.includes("recovery"))
  ) {
    return {
      action: "Keep recovery revenue separate from new acquisition demand.",
      group: "recovery_email",
      known: true,
      label: ATTRIBUTION_SOURCE_LABELS.recovery_email,
      source: sourceLabel || "recovery_email",
    }
  }

  const aiToken = [utmSource, utmCampaign, referrer, hostLower].join(" ")
  if (containsAny(aiToken, AI_PATTERNS)) {
    return {
      action: "Track AI referrals as their own channel, not generic referral traffic.",
      group: "ai_referral",
      known: true,
      label: ATTRIBUTION_SOURCE_LABELS.ai_referral,
      source: sourceLabel || "ai_referral",
    }
  }

  const paidToken = [utmSource, utmMedium, utmCampaign].join(" ")
  if (
    containsAny(paidToken, PAID_MEDIUM_PATTERNS) ||
    (utmSource.includes("google") && utmMedium.includes("cpc")) ||
    hostLower.includes("googleadservices.com") ||
    hostLower.includes("doubleclick.net")
  ) {
    const isGooglePaid =
      utmSource.includes("google") ||
      hostLower.includes("googleadservices.com") ||
      hostLower.includes("doubleclick.net")
    return {
      action: "Add missing click IDs or ValueTrack parameters before increasing spend.",
      group: isGooglePaid ? "google_ads" : "other_paid",
      known: true,
      label: isGooglePaid
        ? ATTRIBUTION_SOURCE_LABELS.google_ads
        : ATTRIBUTION_SOURCE_LABELS.other_paid,
      source: sourceLabel || utmSource || "paid",
    }
  }

  const organicToken = [utmSource, utmMedium, utmCampaign, utmTerm, hostLower].join(" ")
  if (
    utmMedium === "organic" ||
    utmMedium === "seo" ||
    ["google", "bing", "duckduckgo", "yahoo", "ecosia"].includes(utmSource) ||
    containsAny(hostLower, SEARCH_HOST_PATTERNS) ||
    (containsAny(organicToken, SEARCH_HOST_PATTERNS) && !containsAny(organicToken, PAID_MEDIUM_PATTERNS))
  ) {
    return classifyOrganic(row)
  }

  if (
    utmSource.includes("referral") ||
    utmMedium === "referral" ||
    (hostLower && !hostLower.includes("instantmed.com.au"))
  ) {
    return {
      action: "Confirm partner/referral links are tagged so this bucket stays explainable.",
      group: "referral",
      known: true,
      label: ATTRIBUTION_SOURCE_LABELS.referral,
      source: sourceLabel || "referral",
    }
  }

  if (clean(row.landing_page)) {
    return {
      action: "Direct is useful, but do not treat it as a scalable acquisition channel.",
      group: "direct",
      known: false,
      label: ATTRIBUTION_SOURCE_LABELS.direct,
      source: "direct",
    }
  }

  return {
    action: "Fix checkout attribution capture before scaling spend.",
    group: "unknown",
    known: false,
    label: ATTRIBUTION_SOURCE_LABELS.unknown,
    source: "unknown",
  }
}
