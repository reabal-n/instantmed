"use server"

import { createClient } from "@/lib/supabase/server"
import { ensureProfile } from "@/app/actions/ensure-profile"

/**
 * Server-side signup that creates auth user AND profile in one operation.
 * This ensures profile is always created server-side, never client-side.
 */
export async function signupAction(
  email: string,
  password: string,
  options?: {
    fullName?: string
    dateOfBirth?: string
  }
): Promise<{ userId: string | null; profileId: string | null; error: string | null }> {
  console.log("[Signup Action] Starting server-side signup", { email })

  try {
    const supabase = await createClient()

    // Sign up user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
        data: {
          full_name: options?.fullName,
          date_of_birth: options?.dateOfBirth,
          role: "patient",
        },
      },
    })

    if (signUpError) {
      console.error("[Signup Action] Signup error:", signUpError)
      return { userId: null, profileId: null, error: signUpError.message }
    }

    if (!authData.user) {
      console.error("[Signup Action] No user returned")
      return { userId: null, profileId: null, error: "Failed to create account" }
    }

    console.log("[Signup Action] User created", {
      userId: authData.user.id,
      hasSession: !!authData.session,
    })

    // If no session, user needs email confirmation
    if (!authData.session) {
      console.log("[Signup Action] Email confirmation required")
      return { userId: authData.user.id, profileId: null, error: "EMAIL_CONFIRMATION_REQUIRED" }
    }

    // User is auto-confirmed - create profile server-side immediately
    console.log("[Signup Action] User auto-confirmed, creating profile server-side")
    const { profileId, error: profileError } = await ensureProfile(
      authData.user.id,
      authData.user.email || "",
      {
        fullName: options?.fullName,
        dateOfBirth: options?.dateOfBirth,
      }
    )

    if (profileError || !profileId) {
      console.error("[Signup Action] Profile creation failed:", profileError)
      // This is a hard error - profile must exist
      throw new Error(`Profile creation failed: ${profileError || "Unknown error"}`)
    }

    console.log("[Signup Action] Signup complete", { userId: authData.user.id, profileId })
    return { userId: authData.user.id, profileId, error: null }
  } catch (err) {
    console.error("[Signup Action] Unexpected error:", err)
    return {
      userId: null,
      profileId: null,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    }
  }
}
