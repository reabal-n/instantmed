import "server-only"

import { cookies } from "next/headers"

import {
  ATTRIBUTION_COOKIE_KEY,
  type AttributionData,
} from "@/lib/analytics/attribution"

const ATTRIBUTION_TEXT_LIMITS: Record<keyof AttributionData, number> = {
  gclid: 256,
  gbraid: 256,
  wbraid: 256,
  utm_source: 128,
  utm_medium: 128,
  utm_campaign: 256,
  utm_content: 256,
  utm_term: 256,
  referrer: 2048,
  landing_page: 2048,
  captured_at: 64,
}

function cleanValue(key: keyof AttributionData, value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, ATTRIBUTION_TEXT_LIMITS[key])
}

export function normalizeAttribution(input?: AttributionData | null): AttributionData {
  const normalized: AttributionData = {}
  if (!input) return normalized

  for (const key of Object.keys(ATTRIBUTION_TEXT_LIMITS) as Array<keyof AttributionData>) {
    const value = cleanValue(key, input[key])
    if (value) normalized[key] = value
  }

  return normalized
}

async function getAttributionCookie(): Promise<AttributionData> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(ATTRIBUTION_COOKIE_KEY)?.value
    if (!raw) return {}
    return normalizeAttribution(JSON.parse(decodeURIComponent(raw)) as AttributionData)
  } catch {
    return {}
  }
}

export async function resolveCheckoutAttribution(
  clientAttribution?: AttributionData | null,
): Promise<AttributionData> {
  const cookieAttribution = await getAttributionCookie()
  return normalizeAttribution({
    ...cookieAttribution,
    ...normalizeAttribution(clientAttribution),
  })
}
