import { clerkMiddleware } from '@clerk/nextjs/server'

// Minimal Clerk middleware - all routes are public by default
// Protection is handled at the page/component level using auth()
export default clerkMiddleware()

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
