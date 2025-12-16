import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ensureProfile } from "@/app/actions/ensure-profile"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect")
  const flow = searchParams.get("flow")

  console.log("[Auth Callback] OAuth callback received", { 
    code: !!code, 
    redirectTo, 
    flow,
    origin,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  if (code) {
    try {
      // Use regular client for auth (needs cookies)
      const supabase = await createClient()

      console.log("[Auth Callback] Exchanging code for session")
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error("[Auth Callback] Session exchange failed:", {
          message: exchangeError.message,
          status: exchangeError.status,
          code: exchangeError.code,
        })
        return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
      }

      if (!sessionData.user) {
        console.error("[Auth Callback] No user after session exchange")
        return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
      }

      const user = sessionData.user
      console.log("[Auth Callback] Session created for user:", {
        userId: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at ? true : false,
        metadata: user.user_metadata,
      })

      // Ensure profile exists using the single source of truth (server-side)
      console.log("[Auth Callback] Ensuring profile exists server-side")
      let profileId: string
      try {
        const result = await ensureProfile(
          user.id,
          user.email || "",
          {
            fullName: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
            dateOfBirth: user.user_metadata?.date_of_birth || undefined,
          }
        )
        if (!result.profileId) {
          throw new Error(result.error || "Profile creation returned no profileId")
        }
        profileId = result.profileId
        console.log("[Auth Callback] Profile ensured:", profileId)
      } catch (profileError) {
        console.error("[Auth Callback] Profile creation failed (hard error):", profileError)
        const errorMessage = profileError instanceof Error ? profileError.message : String(profileError)
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
        console.error("[Auth Callback] Failed to fetch profile after creation:", fetchError)
        return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent("Profile created but could not be retrieved")}`)
      }

      console.log("[Auth Callback] Profile ready:", {
        profileId: finalProfile.id,
        role: finalProfile.role,
        onboardingCompleted: finalProfile.onboarding_completed,
      })

      // Always return to questionnaire flow if that's where we came from
      if (flow === "questionnaire" && redirectTo) {
        console.log("[Auth Callback] Returning to questionnaire flow:", redirectTo)
        return NextResponse.redirect(`${origin}${redirectTo}?auth_success=true`)
      }

      // Redirect based on role
      console.log("[Auth Callback] Redirecting user with profile:", {
        profileId: finalProfile.id,
        role: finalProfile.role,
        onboardingCompleted: finalProfile.onboarding_completed,
        redirectTo,
      })

      if (finalProfile.role === "patient") {
        if (!finalProfile.onboarding_completed && !redirectTo) {
          return NextResponse.redirect(`${origin}/patient/onboarding`)
        }
        return NextResponse.redirect(redirectTo ? `${origin}${redirectTo}` : `${origin}/patient`)
      } else if (finalProfile.role === "doctor") {
        return NextResponse.redirect(`${origin}/doctor`)
      }

      // Default fallback
      return NextResponse.redirect(redirectTo ? `${origin}${redirectTo}` : `${origin}/patient`)
    } catch (error) {
      console.error("[Auth Callback] Unexpected error in callback handler:", error)
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
    }
  }

  // No code provided
  console.error("[Auth Callback] No OAuth code in callback")
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
}
