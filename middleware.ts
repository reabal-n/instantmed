import { type NextRequest,NextResponse } from 'next/server'

import { updateSupabaseSession } from '@/lib/supabase/middleware'

// Attribution params we persist on the cookie so the Stripe-checkout server
// action can resolve them via resolveCheckoutAttribution() and write them
// onto the intake row. Mirrors the client-side keys in lib/analytics/attribution.ts;
// both writers feed the same cookie so the latter is a no-op when the user
// arrives JS-disabled or hydrates slowly.
const ATTRIBUTION_PARAM_KEYS = [
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
const ATTRIBUTION_COOKIE_KEY = "instantmed_attribution"
const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Persist Google Ads click IDs + UTMs from the request URL onto a first-party
 * cookie before any client JS runs. This closes a race where the React
 * AttributionCapture useEffect fires after hydration: a user on slow mobile
 * who tapped a "Get certificate" CTA before hydration could lose the gclid
 * entirely. Middleware always runs first, so the cookie is set on the very
 * first response.
 *
 * Mutates `response` in place by appending a Set-Cookie. Idempotent when no
 * attribution params are present (early-returns and leaves the cookie alone).
 */
function captureAttributionToCookie(req: NextRequest, response: NextResponse): NextResponse {
  const params = req.nextUrl.searchParams
  const captured: Record<string, string> = {}

  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const value = params.get(key)
    if (value) captured[key] = value
  }

  if (Object.keys(captured).length === 0) return response

  // Merge with any existing cookie so re-clicks within the same session don't
  // wipe the prior referrer/landing context.
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

// Define protected routes that require authentication.
const PROTECTED_PATTERNS = [
  /^\/patient/,
  /^\/doctor/,
  /^\/admin/,
  /^\/account/,
  /^\/api\/patient\//,   // trailing slash: don't match /api/patient-count
  /^\/api\/patients\//,
  /^\/api\/doctor/,
  /^\/api\/admin/,
]

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATTERNS.some(p => p.test(pathname))
}

/**
 * Check if E2E test mode is enabled and has valid auth cookie.
 * Only bypasses auth when PLAYWRIGHT=1 AND the E2E cookie is present.
 *
 * SECURITY: Explicitly blocked in Vercel production AND preview to match
 * the auth helper in lib/auth.ts - defense-in-depth.
 */
function hasE2EAuthBypass(req: NextRequest): boolean {
  const isE2ETest = process.env.PLAYWRIGHT === "1"
  if (!isE2ETest && (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview")) {
    return false
  }

  if (process.env.PLAYWRIGHT !== "1" && process.env.NODE_ENV !== "test") {
    return false
  }

  return req.cookies.has("__e2e_auth_user_id")
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Redirect www → non-www (consolidate domain authority)
  if (req.nextUrl.hostname === "www.instantmed.com.au") {
    const url = req.nextUrl.clone()
    url.hostname = "instantmed.com.au"
    return NextResponse.redirect(url, 301)
  }

  // Block dev routes in production and preview.
  // Use 410 Gone (not 404) so Google permanently drops these from its crawl queue.
  // A 404 means "might come back" — Google retries. A 410 means "stop wasting crawl budget."
  const isVercelProdOrPreview = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview"
  const isE2ETest = process.env.PLAYWRIGHT === "1"
  if (pathname.startsWith("/api/test") && isVercelProdOrPreview && !isE2ETest) {
    return NextResponse.json({ error: "Gone" }, { status: 410 })
  }
  if (pathname.startsWith("/email-preview") && isVercelProdOrPreview && !isE2ETest) {
    return NextResponse.json({ error: "Gone" }, { status: 410 })
  }
  if (pathname.startsWith("/sentry-test") && isVercelProdOrPreview && !isE2ETest) {
    return NextResponse.json({ error: "Gone" }, { status: 410 })
  }
  if (pathname.startsWith("/cert-preview") && isVercelProdOrPreview && !isE2ETest) {
    return NextResponse.json({ error: "Gone" }, { status: 410 })
  }

  // Skip auth for E2E tests with valid test cookie
  if (hasE2EAuthBypass(req)) {
    return NextResponse.next()
  }

  // Refresh Supabase Auth session (token refresh on every request)
  const { response, user } = await updateSupabaseSession(req)

  // Protect authenticated routes
  if (isProtectedRoute(pathname)) {
    if (!user) {
      // Not authenticated - redirect to sign-in (pages) or 401 (API)
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const signInUrl = new URL("/sign-in", req.url)
      signInUrl.searchParams.set("redirect", `${pathname}${req.nextUrl.search}`)
      // Preserve attribution onto the sign-in redirect so an ad landing on
      // a protected URL does not drop gclid before checkout reads it.
      const signInRedirect = NextResponse.redirect(signInUrl, 302)
      return captureAttributionToCookie(req, signInRedirect)
    }
  }

  return captureAttributionToCookie(req, response)
}

export const config = {
  matcher: [
    // Match all paths except:
    // - Static files and Next.js internals
    // - /ingest/* (PostHog reverse proxy - must bypass middleware for rewrites to work)
    '/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
