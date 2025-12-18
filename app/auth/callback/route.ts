import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ensureProfile } from "@/app/actions/ensure-profile"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect")
  const flow = searchParams.get("flow")

  if (code) {
    try {
      // Use regular client for auth (needs cookies)
      const supabase = await createClient()
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError || !sessionData.user) {
        return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
      }

      const user = sessionData.user

      // Ensure profile exists using the single source of truth (server-side)
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
      } catch (profileError) {
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
        return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent("Profile created but could not be retrieved")}`)
      }

      // Always return to questionnaire flow if that's where we came from
      if (flow === "questionnaire" && redirectTo) {
        return NextResponse.redirect(`${origin}${redirectTo}?auth_success=true`)
      }

      // Redirect based on role
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
    } catch {
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
}
