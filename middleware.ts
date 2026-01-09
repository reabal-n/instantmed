import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/login',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
  '/api/webhooks',
  '/api/stripe/webhook',
  '/api/med-cert/preview',
  '/api/medications',
  '/api/search',
  '/api/terminology',
  '/medical-certificate',
  '/medical-certificates',
  '/prescriptions',
  '/medications',
  '/about',
  '/contact',
  '/faq',
  '/how-it-works',
  '/pricing',
  '/privacy',
  '/terms',
  '/trust',
  '/reviews',
  '/blog',
  '/start',
  '/request',
  '/consult',
  '/gp-consult',
  '/repeat-prescription',
  '/locations',
  '/health',
  '/for',
  '/hair-loss',
  '/weight-loss',
  '/weight-management',
  '/mens-health',
  '/womens-health',
  '/performance-anxiety',
  '/track',
  '/offline',
]

// Define routes that should be ignored by middleware entirely
const ignoredRoutes = [
  '/api/webhooks',
  '/api/stripe/webhook',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => {
    if (route.endsWith('/')) {
      return pathname === route || pathname.startsWith(route)
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

function isIgnoredRoute(pathname: string): boolean {
  return ignoredRoutes.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for ignored routes
  if (isIgnoredRoute(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session if it exists
  const { data: { user } } = await supabase.auth.getUser()

  // Protect non-public routes
  if (!isPublicRoute(pathname) && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
