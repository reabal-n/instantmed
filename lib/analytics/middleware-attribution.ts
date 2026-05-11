import type { NextRequest, NextResponse } from "next/server"

/**
 * Server-side attribution capture, called from middleware so the
 * `instantmed_attribution` cookie is set before any client JS runs.
 *
 * The client-side `captureAttribution()` in lib/analytics/attribution.ts is
 * still the source for sessionStorage. Both writers feed the same cookie;
 * `resolveCheckoutAttribution()` in lib/analytics/server-attribution.ts reads
 * it back at checkout time.
 *
 * Kept in its own module (not inlined in middleware.ts) so it can be unit
 * tested. Middleware is an edge-runtime entry point and vitest cannot
 * exercise it directly.
 */

export const ATTRIBUTION_PARAM_KEYS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_id",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "campaignid",
  "adgroupid",
  "keyword",
  "creative",
  "matchtype",
  "device",
  "network",
] as const

export const ATTRIBUTION_COOKIE_KEY = "instantmed_attribution"
export const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Capture Google Ads click IDs + UTMs from the request URL onto a first-party
 * cookie. Closes the React-hydration race where a fast mobile bouncer could
 * lose gclid before `AttributionCapture` ran.
 *
 * Mutates `response` in place by appending a Set-Cookie. Idempotent when no
 * attribution params are present in the URL.
 */
export function captureAttributionToCookie<R extends NextResponse>(
  req: NextRequest,
  response: R,
): R {
  const params = req.nextUrl.searchParams
  const captured: Record<string, string> = {}

  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const value = params.get(key)
    if (value) captured[key] = value
  }

  if (Object.keys(captured).length === 0) return response

  // Merge with existing cookie so back-to-back paid clicks within one session
  // preserve prior context where the new URL did not re-supply it.
  let existing: Record<string, unknown> = {}
  try {
    const raw = req.cookies.get(ATTRIBUTION_COOKIE_KEY)?.value
    if (raw) existing = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
  } catch {
    // Malformed cookie - treat as empty and overwrite.
  }

  const referrer = req.headers.get("referer") ?? (existing as { referrer?: string }).referrer
  const data = {
    ...existing,
    ...captured,
    referrer: referrer || undefined,
    landing_page: req.nextUrl.pathname,
    captured_at: new Date().toISOString(),
  }

  response.cookies.set({
    name: ATTRIBUTION_COOKIE_KEY,
    value: encodeURIComponent(JSON.stringify(data)),
    maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
  })

  return response
}
