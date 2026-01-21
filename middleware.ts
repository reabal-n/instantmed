import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

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
])

export default clerkMiddleware(async (auth, req) => {
  // Protect authenticated routes
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
