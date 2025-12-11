import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect")
  const flow = searchParams.get("flow")

  console.log("[v0] OAuth callback received", { code: !!code, redirectTo, flow })

  if (code) {
    const supabase = await createClient()

    console.log("[v0] Exchanging code for session")
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("[v0] Session exchange failed:", exchangeError)
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
    }

    if (!sessionData.user) {
      console.error("[v0] No user after session exchange")
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
    }

    const user = sessionData.user
    console.log("[v0] Session created for user:", user.id)

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("auth_user_id", user.id)
      .single()

    if (!existingProfile) {
      console.log("[v0] Creating new profile for OAuth user")

      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"

      const { error: profileError } = await supabase.from("profiles").insert({
        auth_user_id: user.id,
        full_name: fullName,
        role: "patient",
        onboarding_completed: false,
      })

      if (profileError) {
        console.error("[v0] Failed to create profile:", profileError)
        return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed`)
      }

      console.log("[v0] Profile created successfully")
    }

    if (flow === "questionnaire" && redirectTo) {
      console.log("[v0] Returning to questionnaire flow:", redirectTo)
      return NextResponse.redirect(`${origin}${redirectTo}?auth_success=true`)
    }

    if (existingProfile) {
      if (existingProfile.role === "patient") {
        if (!existingProfile.onboarding_completed) {
          const onboardingRedirect = redirectTo || "/patient"
          return NextResponse.redirect(
            `${origin}/patient/onboarding?redirect=${encodeURIComponent(onboardingRedirect)}`,
          )
        }
        return NextResponse.redirect(redirectTo ? `${origin}${redirectTo}` : `${origin}/patient`)
      } else if (existingProfile.role === "doctor") {
        return NextResponse.redirect(`${origin}/doctor`)
      }
    }

    // New user, redirect to patient dashboard
    return NextResponse.redirect(redirectTo ? `${origin}${redirectTo}` : `${origin}/patient`)
  }

  // No code provided
  console.error("[v0] No OAuth code in callback")
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
}
