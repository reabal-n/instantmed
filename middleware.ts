import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Admin route redirects: consolidate /doctor/admin/* into /admin/*
// Note: /doctor/admin itself is NOT redirected - it's the "All Requests" page for doctors
// Redirect /doctor/admin/* ops routes to their canonical /admin/* paths.
// Note: /doctor/admin/email-outbox is NOT redirected -- it IS the canonical outbox page.
// Note: /doctor/admin itself is NOT redirected -- it's the "All Requests" page for doctors.
const adminRedirects: Record<string, string> = {
  '/doctor/admin/ops': '/admin/ops',
  '/doctor/admin/ops/intakes-stuck': '/admin/ops/intakes-stuck',
  '/doctor/admin/ops/reconciliation': '/admin/ops/reconciliation',
  '/doctor/admin/ops/doctors': '/admin/ops/doctors',
  '/doctor/admin/emails': '/admin/emails',
}

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/patient(.*)',
  '/doctor(.*)',
  '/admin(.*)',
  '/account(.*)',
  '/api/patient(.*)',
  '/api/doctor(.*)',
  '/api/admin(.*)',
])

// Define public routes (no auth required)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/about',
  '/contact',
  '/services(.*)',
  '/blog(.*)',
  '/reviews',
  '/health-guides(.*)',
  '/api/health',
  '/api/webhooks(.*)',
  '/api/cron(.*)',
  '/api/test(.*)', // E2E test endpoints
])

/**
 * Check if E2E test mode is enabled and has valid auth cookie.
 * Only bypasses Clerk when PLAYWRIGHT=1 AND the E2E cookie is present.
 *
 * SECURITY: Explicitly blocked in Vercel production AND preview to match
 * the auth helper in lib/auth.ts — defense-in-depth.
 */
function hasE2EAuthBypass(req: Request): boolean {
  // P0 SECURITY: Block E2E bypass in Vercel production and preview
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    return false
  }

  if (process.env.PLAYWRIGHT !== "1" && process.env.NODE_ENV !== "test") {
    return false
  }

  const cookies = req.headers.get("cookie") || ""
  return cookies.includes("__e2e_auth_user_id=")
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = new URL(req.url)
  
  // Block /api/test/* and /(dev)/* routes in production and preview
  if (pathname.startsWith("/api/test") && (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (pathname.startsWith("/email-preview") && (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview")) {
    return NextResponse.redirect(new URL("/", req.url), 302)
  }

  // Handle admin consolidation redirects
  const redirectTo = adminRedirects[pathname]
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, req.url), 308)
  }
  
  // Skip Clerk auth for E2E tests with valid test cookie
  if (hasE2EAuthBypass(req)) {
    return // Allow through without Clerk auth
  }
  
  // Protect authenticated routes
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Match all paths except:
    // - Static files and Next.js internals
    // - /ingest/* (PostHog reverse proxy - must bypass middleware for rewrites to work)
    '/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
