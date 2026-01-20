import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ensureProfile } from "@/app/actions/ensure-profile"
import { createLogger } from "@/lib/observability/logger"
import { logLogin } from "@/lib/security/audit-log"

const log = createLogger("auth-callback")

/**
 * MINIMAL AUTH CALLBACK - Stripped down to isolate cookie issues
 * 
 * Flow:
 * 1. Exchange code for session
 * 2. Get user to determine redirect destination
 * 3. Redirect with cookies attached
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || searchParams.get("redirect")

  // Get the correct origin for redirects
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
  const isLocalEnv = process.env.NODE_ENV === "development"
  
  // In production on Vercel, always use the forwarded host
  const origin = isLocalEnv 
    ? requestOrigin 
    : forwardedHost 
      ? `${forwardedProto}://${forwardedHost}`
      : requestOrigin

  // eslint-disable-next-line no-console
  console.log("[auth-callback] Starting", { 
    hasCode: !!code, 
    origin, 
    forwardedHost,
    requestOrigin,
  })

  // No code = error
  if (!code) {
    // eslint-disable-next-line no-console
    console.log("[auth-callback] No code, redirecting to login")
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  // Create response object FIRST - we'll attach cookies to this
  const response = NextResponse.redirect(`${origin}/account`)
  
  // Create Supabase client that writes cookies directly to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // eslint-disable-next-line no-console
            console.log("[auth-callback] Setting cookie:", name)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Exchange code for session - this triggers setAll with auth cookies
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (exchangeError) {
    // eslint-disable-next-line no-console
    console.error("[auth-callback] Exchange failed:", exchangeError.message)
    return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`)
  }

  // eslint-disable-next-line no-console
  console.log("[auth-callback] Exchange successful, getting user...")

  // Get the user to determine where to redirect
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    // eslint-disable-next-line no-console
    console.error("[auth-callback] getUser failed:", userError?.message)
    return NextResponse.redirect(`${origin}/auth/login?error=no_user`)
  }

  // eslint-disable-next-line no-console
  console.log("[auth-callback] User found:", user.email)

  // Now do the profile/routing logic, but use a NEW response with cookies
  // to ensure all cookies from both exchange AND getUser are included
  
  try {
    // Ensure profile exists
    const email = user.email
    if (!email) {
      return createRedirectWithCurrentCookies(response, `${origin}/auth/login?error=no_email`)
    }

    // Log login (non-blocking)
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || undefined
    const userAgent = request.headers.get("user-agent") || undefined
    logLogin(user.id, ipAddress, userAgent).catch(() => {})

    // Ensure profile
    const profileResult = await ensureProfile(user.id, email, {
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
    })

    if (!profileResult.profileId) {
      // eslint-disable-next-line no-console
      console.error("[auth-callback] Profile creation failed:", profileResult.error)
      return createRedirectWithCurrentCookies(response, `${origin}/auth/login?error=profile_failed`)
    }

    // Get profile for routing
    const serviceClient = createServiceRoleClient()
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("auth_user_id", user.id)
      .single()

    // Determine redirect destination
    let destination = `${origin}/account`
    
    if (profile) {
      if (profile.role === "doctor" || profile.role === "admin") {
        destination = `${origin}/doctor`
      } else if (profile.role === "patient") {
        destination = profile.onboarding_completed 
          ? (next ? `${origin}${next.startsWith('/') ? next : '/' + next}` : `${origin}/patient`)
          : `${origin}/patient/onboarding`
      }
    }

    // eslint-disable-next-line no-console
    console.log("[auth-callback] Redirecting to:", destination)
    
    // Update the response URL and return it (cookies already attached)
    return createRedirectWithCurrentCookies(response, destination)
    
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth-callback] Error:", err)
    return createRedirectWithCurrentCookies(response, `${origin}/auth/login?error=callback_error`)
  }
}

// Helper to create a new redirect but preserve cookies from an existing response
function createRedirectWithCurrentCookies(sourceResponse: NextResponse, url: string): NextResponse {
  const newResponse = NextResponse.redirect(url)
  
  // Copy all cookies from the source response
  sourceResponse.cookies.getAll().forEach(cookie => {
    newResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite as 'lax' | 'strict' | 'none' | undefined,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
    })
  })
  
  return newResponse
}
