import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ensureProfile } from "@/app/actions/ensure-profile"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("auth-callback")

/**
 * Supabase handles OAuth flow automatically.
 * This callback is for post-authentication setup (e.g., ensuring profile exists)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect")
  const flow = searchParams.get("flow")
  const next = searchParams.get("next") ?? redirectTo

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      log.error("Failed to exchange code for session", {}, error)
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
    }
  }

  try {
    // Check if user is authenticated via Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      log.warn("No authenticated user in callback")
      return NextResponse.redirect(`${origin}/auth/login?error=authentication_required`)
    }

    const userEmail = user.email

    if (!userEmail) {
      log.error("User has no email address", { userId: user.id })
      return NextResponse.redirect(`${origin}/auth/login?error=email_required`)
    }

    // Ensure profile exists using the single source of truth (server-side)
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
    } catch (profileError) {
      const errorMessage = profileError instanceof Error ? profileError.message : String(profileError)
      log.error("Profile creation failed", { userId: user.id }, profileError)
      return NextResponse.redirect(
        `${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent(errorMessage)}`
      )
    }

    // Fetch profile to get role and onboarding status
    const { data: finalProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("auth_user_id", user.id)
      .single()

    if (fetchError || !finalProfile) {
      log.error("Profile fetch failed after creation", { userId: user.id }, fetchError)
      return NextResponse.redirect(
        `${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent("Profile created but could not be retrieved")}`
      )
    }

    // Always return to questionnaire flow if that's where we came from
    if (flow === "questionnaire" && next) {
      return NextResponse.redirect(`${origin}${next}?auth_success=true`)
    }

    // Redirect based on role - prioritize explicit redirect, then role-based dashboard
    if (finalProfile.role === "patient") {
      // If there's an explicit redirect, use it (unless onboarding is needed)
      if (next && finalProfile.onboarding_completed) {
        // Ensure redirect is a relative path
        const redirectPath = next.startsWith('/') ? next : `/${next}`
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
      // Check onboarding status
      if (!finalProfile.onboarding_completed) {
        // If redirecting to onboarding, preserve the original redirect
        const onboardingUrl = next 
          ? `${origin}/patient/onboarding?redirect=${encodeURIComponent(next)}`
          : `${origin}/patient/onboarding`
        return NextResponse.redirect(onboardingUrl)
      }
      // Default to patient dashboard
      return NextResponse.redirect(`${origin}/patient`)
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
          return NextResponse.redirect(`${origin}${normalizedPath}`)
        }
      }
      return NextResponse.redirect(`${origin}/doctor`)
    }

    // Default fallback - should rarely happen
    log.warn("Unknown role, defaulting to patient dashboard", { role: finalProfile.role, userId: user.id })
    return NextResponse.redirect(next ? `${origin}${next}` : `${origin}/patient`)
  } catch (error) {
    log.error("Auth callback failed", {}, error)
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
  }
}
