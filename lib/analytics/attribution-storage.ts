export interface AttributionInput {
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

export interface StoredAttribution {
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  referrer: string | null
  landing_page: string | null
  attribution_captured_at: string | null
}

const SHORT_FIELD_LIMIT = 200
const URL_FIELD_LIMIT = 500

function cleanText(value: string | undefined, maxLength: number): string | null {
  const cleaned = value?.trim()
  if (!cleaned) return null
  return cleaned.slice(0, maxLength)
}

function cleanUrlOrPath(value: string | undefined): string | null {
  const cleaned = cleanText(value, URL_FIELD_LIMIT)
  if (!cleaned) return null

  try {
    const parsed = new URL(cleaned, "https://instantmed.com.au")
    const path = parsed.pathname === "/" ? "" : parsed.pathname
    if (parsed.origin === "https://instantmed.com.au") {
      return path || "/"
    }
    return `${parsed.origin}${path}`.slice(0, URL_FIELD_LIMIT)
  } catch {
    return cleaned.split("?")[0].split("#")[0].slice(0, URL_FIELD_LIMIT) || null
  }
}

function cleanIsoDate(value: string | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function normalizeAttributionForStorage(input?: AttributionInput): StoredAttribution {
  return {
    gclid: cleanText(input?.gclid, SHORT_FIELD_LIMIT),
    gbraid: cleanText(input?.gbraid, SHORT_FIELD_LIMIT),
    wbraid: cleanText(input?.wbraid, SHORT_FIELD_LIMIT),
    utm_source: cleanText(input?.utm_source, SHORT_FIELD_LIMIT),
    utm_medium: cleanText(input?.utm_medium, SHORT_FIELD_LIMIT),
    utm_campaign: cleanText(input?.utm_campaign, SHORT_FIELD_LIMIT),
    utm_content: cleanText(input?.utm_content, SHORT_FIELD_LIMIT),
    utm_term: cleanText(input?.utm_term, SHORT_FIELD_LIMIT),
    referrer: cleanUrlOrPath(input?.referrer),
    landing_page: cleanUrlOrPath(input?.landing_page),
    attribution_captured_at: cleanIsoDate(input?.captured_at),
  }
}
