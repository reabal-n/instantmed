import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that require authentication
const protectedRoutes = ['/patient', '/admin', '/doctor']

// Routes that require specific roles
const roleRoutes = {
  '/admin': 'admin',
  '/doctor': 'doctor',
  '/patient': 'patient',
} as const

export async function proxy(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      return NextResponse.next({ request })
    }
    
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Check if route requires authentication
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    )

    if (isProtectedRoute) {
      if (!user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/auth/login'
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Check role-based access
      const roleEntry = Object.entries(roleRoutes).find(([route]) =>
        pathname.startsWith(route)
      )

      if (roleEntry) {
        const [, requiredRole] = roleEntry
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', user.id)
          .single()

        if (!profile || profile.role !== requiredRole) {
          // Redirect to appropriate dashboard based on role
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = profile?.role === 'admin' ? '/admin' : '/patient'
          return NextResponse.redirect(redirectUrl)
        }
      }
    }

    // Redirect authenticated users away from auth pages
    if (user && (pathname === '/login' || pathname === '/auth/register')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = profile?.role === 'admin' ? '/admin' : '/patient'
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

