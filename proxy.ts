import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/patient(.*)',
  '/doctor(.*)',
  '/admin(.*)',
  '/account(.*)',
])

// Routes that should bypass Clerk middleware entirely
const isPublicRoute = createRouteMatcher([
  '/api(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Bypass Clerk for public routes
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  const { userId, redirectToSignIn } = await auth()

  // If user is not authenticated and trying to access protected route
  if (!userId && isProtectedRoute(request)) {
    return redirectToSignIn({ returnBackUrl: request.url })
  }

  // For authenticated users, we could add role-based routing here
  // This would require fetching user metadata from Clerk
  // For now, we'll handle role-based access in the page components

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
