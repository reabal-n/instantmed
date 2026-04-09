import { NextResponse, type NextRequest } from 'next/server'
import { updateSupabaseSession } from '@/lib/supabase/middleware'

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
 * the auth helper in lib/auth.ts — defense-in-depth.
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

  // Block dev routes in production and preview
  const isVercelProdOrPreview = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview"
  const isE2ETest = process.env.PLAYWRIGHT === "1"
  if (pathname.startsWith("/api/test") && isVercelProdOrPreview && !isE2ETest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (pathname.startsWith("/email-preview") && isVercelProdOrPreview && !isE2ETest) {
    return NextResponse.redirect(new URL("/", req.url), 302)
  }
  if (pathname.startsWith("/sentry-test") && isVercelProdOrPreview && !isE2ETest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (pathname.startsWith("/cert-preview") && isVercelProdOrPreview && !isE2ETest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
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
      // Not authenticated — redirect to sign-in (pages) or 401 (API)
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const signInUrl = new URL("/sign-in", req.url)
      signInUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(signInUrl, 302)
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except:
    // - Static files and Next.js internals
    // - /ingest/* (PostHog reverse proxy - must bypass middleware for rewrites to work)
    '/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
