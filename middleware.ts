import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/about(.*)',
  '/how-it-works(.*)',
  '/pricing(.*)',
  '/faq(.*)',
  '/contact(.*)',
  '/terms(.*)',
  '/privacy(.*)',
  '/conditions(.*)',
  '/medications(.*)',
  '/start(.*)',
  '/request(.*)',
  '/medical-certificate(.*)',
  '/prescriptions(.*)',
  '/repeat-prescription(.*)',
  '/consult(.*)',
  '/gp-consult(.*)',
  '/api/webhooks(.*)',
  '/health(.*)', // SEO pages
  '/for(.*)',
  '/blog(.*)',
  '/reviews(.*)',
  '/trust(.*)',
  '/compare(.*)',
  '/locations(.*)',
  '/track(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const isPublic = isPublicRoute(req)

  // Allow public routes
  if (isPublic) {
    return NextResponse.next()
  }

  // Redirect to sign-in if not authenticated
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
