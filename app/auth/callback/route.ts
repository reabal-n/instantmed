import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ensureProfile } from "@/app/actions/ensure-profile"
import { createLogger } from "@/lib/observability/logger"
import { logLogin } from "@/lib/security/audit-log"

const log = createLogger("auth-callback")

/**
 * Supabase handles OAuth flow automatically.
 * This callback is for post-authentication setup (e.g., ensuring profile exists)
 * 
 * CRITICAL: We must track cookies set during exchangeCodeForSession and attach
 * them to the redirect response. NextResponse.redirect() creates a new response
 * that doesn't include cookies set via cookieStore.set().
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect")
  const flow = searchParams.get("flow")
  const next = searchParams.get("next") ?? redirectTo

  // CRITICAL: On Vercel/production, request.url may have internal origin
  // We must use x-forwarded-host to get the actual public domain
  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocalEnv = process.env.NODE_ENV === "development"
  const origin = isLocalEnv || !forwardedHost 
    ? requestOrigin 
    : `https://${forwardedHost}`
  
  log.info("Auth callback started", {
    code: code ? "present" : "missing",
    requestOrigin,
    forwardedHost,
    resolvedOrigin: origin,
    isLocalEnv,
  })

  // Track cookies that Supabase sets during the exchange
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  // Create Supabase client that collects cookies to be set
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach((cookie) => {
            cookiesToSet.push(cookie)
          })
        },
      },
    }
  )

  // Helper to create redirect with cookies attached
  const redirectWithCookies = (url: string) => {
    const response = NextResponse.redirect(url)
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    })
    return response
  }

  // Handle missing code parameter
  if (!code) {
    log.warn("No code parameter in callback - redirecting to login")
    return NextResponse.redirect(`${origin}/auth/login?error=authentication_required`)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error) {
    log.error("Failed to exchange code for session", {}, error)
    return redirectWithCookies(`${origin}/auth/login?error=oauth_failed`)
  }

  try {
    // Check if user is authenticated (using same client that exchanged the code)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      log.warn("No authenticated user in callback")
      return redirectWithCookies(`${origin}/auth/login?error=authentication_required`)
    }

    const userEmail = user.email

    if (!userEmail) {
      log.error("User has no email address", { userId: user.id })
      return redirectWithCookies(`${origin}/auth/login?error=email_required`)
    }

    // Log successful login for audit trail (non-blocking)
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || undefined
    const userAgent = request.headers.get("user-agent") || undefined
    logLogin(user.id, ipAddress, userAgent).catch((err) => {
      log.warn("Failed to log login audit event", {}, err)
    })

    // Ensure profile exists using the single source of truth (server-side)
    let newProfileId: string | null = null
    try {
      const result = await ensureProfile(
        user.id, // Supabase user ID
        userEmail,
        {
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
        }
      )

      if (!result.profileId) {
        throw new Error(result.error || "Profile creation returned no profileId")
      }
      newProfileId = result.profileId
    } catch (profileError) {
      const errorMessage = profileError instanceof Error ? profileError.message : String(profileError)
      log.error("Profile creation failed", { userId: user.id }, profileError)
      return redirectWithCookies(
        `${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent(errorMessage)}`
      )
    }

    // Merge guest profile data if exists (guest checkout creates profiles with null auth_user_id)
    try {
      const serviceClient = createServiceRoleClient()
      const { data: guestProfile } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("email", userEmail)
        .is("auth_user_id", null)
        .single()

      if (guestProfile && newProfileId && guestProfile.id !== newProfileId) {
        log.info("Merging guest profile into authenticated profile", { 
          guestProfileId: guestProfile.id, 
          newProfileId 
        })
        
        // Use atomic merge function to prevent race conditions
        const { error: mergeError } = await serviceClient.rpc("merge_guest_profile", {
          p_guest_profile_id: guestProfile.id,
          p_authenticated_profile_id: newProfileId,
        })
        
        if (mergeError) {
          log.error("Failed to merge guest profile - queuing for retry", { 
            error: mergeError,
            guestProfileId: guestProfile.id,
            targetProfileId: newProfileId
          })
          
          // Queue for admin review/retry via failed_profile_merges table
          const { error: queueErr } = await serviceClient.from("failed_profile_merges").insert({
            guest_profile_id: guestProfile.id,
            target_profile_id: newProfileId,
            user_email: userEmail,
            error_message: mergeError.message || "Unknown error",
            created_at: new Date().toISOString(),
          })
          if (queueErr) {
            // Last resort: if we can't even queue, log critically
            log.error("CRITICAL: Failed to queue profile merge for retry", {}, queueErr)
          }
        } else {
          log.info("Guest profile merged successfully", { guestProfileId: guestProfile.id })
        }
      }
    } catch (mergeError) {
      // Non-blocking: log but don't fail the auth flow
      log.error("Guest profile merge check failed", {}, mergeError)
    }

    // Fetch profile to get role and onboarding status
    // Use service role client to bypass RLS (profile was just created)
    const serviceClient = createServiceRoleClient()
    const { data: finalProfile, error: fetchError } = await serviceClient
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("auth_user_id", user.id)
      .single()

    if (fetchError || !finalProfile) {
      // If the query fails, it might be due to missing onboarding_completed column
      // Try a simpler query
      const { data: basicProfile, error: basicError } = await serviceClient
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .single()
      
      if (basicError || !basicProfile) {
        log.error("Profile fetch failed after creation", { userId: user.id }, fetchError || basicError)
        return redirectWithCookies(
          `${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent("Profile created but could not be retrieved")}`
        )
      }
      
      // Use basic profile with default onboarding status
      log.warn("Using basic profile fetch (onboarding_completed column may be missing)", { userId: user.id })
      const profileWithDefaults = { ...basicProfile, onboarding_completed: false }
      
      // Continue with basic profile - default to patient for safety
      if (profileWithDefaults.role === "doctor" || profileWithDefaults.role === "admin") {
        return redirectWithCookies(`${origin}/doctor`)
      }
      // Default to patient flow for any other role (including null/undefined)
      return redirectWithCookies(`${origin}/patient/onboarding`)
    }

    // Always return to questionnaire flow if that's where we came from
    if (flow === "questionnaire" && next) {
      return redirectWithCookies(`${origin}${next}?auth_success=true`)
    }

    // Redirect based on role - prioritize explicit redirect, then role-based dashboard
    if (finalProfile.role === "patient") {
      // If there's an explicit redirect, use it (unless onboarding is needed)
      if (next && finalProfile.onboarding_completed) {
        // Ensure redirect is a relative path
        const redirectPath = next.startsWith('/') ? next : `/${next}`
        return redirectWithCookies(`${origin}${redirectPath}`)
      }
      // Check onboarding status
      if (!finalProfile.onboarding_completed) {
        // If redirecting to onboarding, preserve the original redirect
        const onboardingUrl = next 
          ? `${origin}/patient/onboarding?redirect=${encodeURIComponent(next)}`
          : `${origin}/patient/onboarding`
        return redirectWithCookies(onboardingUrl)
      }
      // Default to patient dashboard
      return redirectWithCookies(`${origin}/patient`)
    } else if (finalProfile.role === "doctor" || finalProfile.role === "admin") {
      // Doctors and admins go to doctor dashboard
      // Only use explicit redirect if it's a doctor-specific route
      // Note: /admin redirects are converted to /doctor
      if (next) {
        const redirectPath = next.startsWith('/') ? next : `/${next}`
        // Convert /admin redirects to /doctor
        const normalizedPath = redirectPath.startsWith('/admin') 
          ? redirectPath.replace('/admin', '/doctor')
          : redirectPath
        if (normalizedPath.startsWith('/doctor')) {
          return redirectWithCookies(`${origin}${normalizedPath}`)
        }
      }
      return redirectWithCookies(`${origin}/doctor`)
    }

    // Default fallback - should rarely happen
    log.warn("Unknown role, defaulting to patient dashboard", { role: finalProfile.role, userId: user.id })
    return redirectWithCookies(next ? `${origin}${next}` : `${origin}/patient`)
  } catch (error) {
    log.error("Auth callback failed", {}, error)
    return redirectWithCookies(`${origin}/auth/login?error=oauth_failed`)
  }
}
