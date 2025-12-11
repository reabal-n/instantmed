import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// OAuth callback handler - processes Google sign-in redirect
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect")
  const flow = searchParams.get("flow")

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      // Get the authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, role, onboarding_completed")
          .eq("auth_user_id", user.id)
          .single()

        if (!existingProfile) {
          // Create new profile for Google OAuth user
          // Extract name from Google user metadata
          const fullName =
            user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"

          const { error: profileError } = await supabase.from("profiles").insert({
            auth_user_id: user.id,
            full_name: fullName,
            role: "patient",
            onboarding_completed: false,
          })

          if (profileError) {
            console.error("Failed to create profile:", profileError)
            return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed`)
          }

          if (flow === "questionnaire" && redirectTo) {
            return NextResponse.redirect(`${origin}${redirectTo}`)
          }

          // New user - redirect to onboarding
          const onboardingRedirect = redirectTo || "/patient"
          return NextResponse.redirect(
            `${origin}/patient/onboarding?redirect=${encodeURIComponent(onboardingRedirect)}`,
          )
        }

        // Existing user - redirect based on role and onboarding status
        if (existingProfile.role === "patient") {
          if (flow === "questionnaire" && redirectTo) {
            return NextResponse.redirect(`${origin}${redirectTo}`)
          }

          if (!existingProfile.onboarding_completed) {
            const onboardingRedirect = redirectTo || "/patient"
            return NextResponse.redirect(
              `${origin}/patient/onboarding?redirect=${encodeURIComponent(onboardingRedirect)}`,
            )
          }
          // Onboarding complete - redirect to patient dashboard or custom redirect
          return NextResponse.redirect(redirectTo ? `${origin}${redirectTo}` : `${origin}/patient`)
        } else if (existingProfile.role === "doctor") {
          return NextResponse.redirect(`${origin}/doctor`)
        }
      }
    }
  }

  // OAuth failed or no code - redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
}
