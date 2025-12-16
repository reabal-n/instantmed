import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirectTo = searchParams.get("redirect")
  const flow = searchParams.get("flow")

  console.log("[Auth Callback] OAuth callback received", { code: !!code, redirectTo, flow })

  if (code) {
    // Use regular client for auth (needs cookies)
    const supabase = await createClient()
    
    // Use service client for profile operations (bypasses RLS)
    const serviceClient = createServiceClient()

    console.log("[Auth Callback] Exchanging code for session")
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("[Auth Callback] Session exchange failed:", exchangeError)
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
    }

    if (!sessionData.user) {
      console.error("[Auth Callback] No user after session exchange")
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
    }

    const user = sessionData.user
    console.log("[Auth Callback] Session created for user:", user.id, user.email)

    // Use service client for all profile operations
    const { data: existingProfile, error: profileQueryError } = await serviceClient
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("auth_user_id", user.id)
      .single()

    if (profileQueryError && profileQueryError.code !== 'PGRST116') {
      console.error("[Auth Callback] Error querying profile:", profileQueryError)
    }

    let finalProfile = existingProfile

    if (!existingProfile) {
      console.log("[Auth Callback] No existing profile for auth user, checking for guest profile")

      // Check if there's a guest profile with this email that we should link
      const { data: guestProfile } = await serviceClient
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("email", user.email)
        .is("auth_user_id", null)
        .single()

      if (guestProfile) {
        // Link the guest profile to this auth user
        console.log("[Auth Callback] Linking guest profile to auth user:", guestProfile.id)
        const { error: linkError } = await serviceClient
          .from("profiles")
          .update({ 
            auth_user_id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
          })
          .eq("id", guestProfile.id)

        if (linkError) {
          console.error("[Auth Callback] Failed to link guest profile:", linkError)
        } else {
          console.log("[Auth Callback] Guest profile linked successfully")
          finalProfile = { id: guestProfile.id, role: "patient", onboarding_completed: guestProfile.onboarding_completed }
        }
      } else {
        // Create new profile using service client
        console.log("[Auth Callback] Creating new profile for OAuth user")
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"

        const { data: newProfile, error: profileError } = await serviceClient
          .from("profiles")
          .insert({
            auth_user_id: user.id,
            email: user.email,
            full_name: fullName,
            role: "patient",
          })
          .select("id, role, onboarding_completed")
          .single()

        if (profileError) {
          console.error("[Auth Callback] Failed to create profile:", profileError)
          return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed`)
        }

        console.log("[Auth Callback] Profile created successfully:", newProfile?.id)
        finalProfile = newProfile
      }
    }

    // Always return to questionnaire flow if that's where we came from
    if (flow === "questionnaire" && redirectTo) {
      console.log("[Auth Callback] Returning to questionnaire flow:", redirectTo)
      return NextResponse.redirect(`${origin}${redirectTo}?auth_success=true`)
    }

    if (finalProfile) {
      if (finalProfile.role === "patient") {
        if (!finalProfile.onboarding_completed && !redirectTo) {
          return NextResponse.redirect(`${origin}/patient/onboarding`)
        }
        return NextResponse.redirect(redirectTo ? `${origin}${redirectTo}` : `${origin}/patient`)
      } else if (finalProfile.role === "doctor") {
        return NextResponse.redirect(`${origin}/doctor`)
      }
    }

    // New user with redirect, go there; otherwise patient dashboard
    return NextResponse.redirect(redirectTo ? `${origin}${redirectTo}` : `${origin}/patient`)
  }

  // No code provided
  console.error("[Auth Callback] No OAuth code in callback")
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
}
