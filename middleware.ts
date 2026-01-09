import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/login',
  '/auth/login(.*)',
  '/auth/register(.*)',
  '/auth/forgot-password(.*)',
  '/auth/reset-password(.*)',
  '/auth/callback(.*)',
  '/api/webhooks(.*)',
  '/api/stripe/webhook(.*)',
  '/api/med-cert/preview(.*)',
  '/api/medications(.*)',
  '/api/search(.*)',
  '/api/terminology(.*)',
  '/medical-certificate(.*)',
  '/medical-certificates(.*)',
  '/prescriptions(.*)',
  '/medications(.*)',
  '/about',
  '/contact',
  '/faq',
  '/how-it-works',
  '/pricing',
  '/privacy',
  '/terms',
  '/trust',
  '/reviews',
  '/blog(.*)',
  '/start(.*)',
  '/request(.*)',
  '/consult(.*)',
  '/gp-consult',
  '/repeat-prescription',
  '/locations(.*)',
  '/health(.*)',
  '/for(.*)',
  '/hair-loss',
  '/weight-loss',
  '/weight-management',
  '/mens-health',
  '/womens-health',
  '/performance-anxiety',
  '/track(.*)',
  '/offline',
])

// Define routes that should be ignored by middleware entirely
const isIgnoredRoute = createRouteMatcher([
  '/api/webhooks(.*)',
  '/api/stripe/webhook(.*)',
  '/_next(.*)',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
])

export default clerkMiddleware(async (auth, req) => {
  // Skip middleware for ignored routes
  if (isIgnoredRoute(req)) {
    return
  }

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

