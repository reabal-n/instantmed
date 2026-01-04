import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { ensureProfile } from "@/app/actions/ensure-profile"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("auth-callback")

/**
 * Clerk handles OAuth flow automatically.
 * This callback is for post-authentication setup (e.g., ensuring profile exists)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const redirectTo = searchParams.get("redirect")
  const flow = searchParams.get("flow")

  try {
    // Check if user is authenticated via Clerk
    const user = await currentUser()

    if (!user) {
      log.warn("No authenticated user in callback")
      return NextResponse.redirect(`${origin}/sign-in?error=authentication_required`)
    }

    const userEmail = user.emailAddresses[0]?.emailAddress

    if (!userEmail) {
      log.error("User has no email address", { userId: user.id })
      return NextResponse.redirect(`${origin}/sign-in?error=email_required`)
    }

    // Ensure profile exists using the single source of truth (server-side)
    try {
      const result = await ensureProfile(
        user.id, // Clerk user ID
        userEmail,
        {
          fullName: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.username || undefined,
        }
      )

      if (!result.profileId) {
        throw new Error(result.error || "Profile creation returned no profileId")
      }
    } catch (profileError) {
      const errorMessage = profileError instanceof Error ? profileError.message : String(profileError)
      log.error("Profile creation failed", { userId: user.id }, profileError)
      return NextResponse.redirect(
        `${origin}/sign-in?error=profile_creation_failed&details=${encodeURIComponent(errorMessage)}`
      )
    }

    // Fetch profile to get role and onboarding status
    const supabase = await createClient()
    const { data: finalProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("clerk_user_id", user.id)
      .single()

    if (fetchError || !finalProfile) {
      log.error("Profile fetch failed after creation", { userId: user.id }, fetchError)
      return NextResponse.redirect(
        `${origin}/sign-in?error=profile_creation_failed&details=${encodeURIComponent("Profile created but could not be retrieved")}`
      )
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
  } catch (error) {
    log.error("Auth callback failed", {}, error)
    return NextResponse.redirect(`${origin}/sign-in?error=oauth_failed`)
  }
}
