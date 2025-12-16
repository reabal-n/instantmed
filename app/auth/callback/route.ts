import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
      
      // Use service client for profile operations (bypasses RLS)
      let serviceClient
      try {
        serviceClient = createServiceClient()
        console.log("[Auth Callback] Service client created successfully")
      } catch (serviceClientError) {
        console.error("[Auth Callback] Failed to create service client:", serviceClientError)
        return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent("Service client initialization failed")}`)
      }

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

      // Use service client for all profile operations
      console.log("[Auth Callback] Querying for existing profile with auth_user_id:", user.id)
      const { data: existingProfile, error: profileQueryError } = await serviceClient
        .from("profiles")
        .select("id, role, onboarding_completed")
        .eq("auth_user_id", user.id)
        .single()

      if (profileQueryError) {
        if (profileQueryError.code === 'PGRST116') {
          console.log("[Auth Callback] No existing profile found (PGRST116 is expected)")
        } else {
          console.error("[Auth Callback] Error querying profile:", {
            code: profileQueryError.code,
            message: profileQueryError.message,
            details: profileQueryError.details,
            hint: profileQueryError.hint,
          })
        }
      } else {
        console.log("[Auth Callback] Found existing profile:", existingProfile.id)
      }

      let finalProfile = existingProfile

      if (!existingProfile) {
        console.log("[Auth Callback] No existing profile for auth user, checking for guest profile with email:", user.email)

        // Check if there's a guest profile with this email that we should link
        const { data: guestProfile, error: guestQueryError } = await serviceClient
          .from("profiles")
          .select("id, onboarding_completed")
          .eq("email", user.email)
          .is("auth_user_id", null)
          .maybeSingle()

        if (guestQueryError && guestQueryError.code !== 'PGRST116') {
          console.error("[Auth Callback] Error querying guest profile:", {
            code: guestQueryError.code,
            message: guestQueryError.message,
          })
        }

        if (guestProfile) {
          // Link the guest profile to this auth user
          console.log("[Auth Callback] Linking guest profile to auth user:", {
            guestProfileId: guestProfile.id,
            authUserId: user.id,
          })
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"
          const { error: linkError } = await serviceClient
            .from("profiles")
            .update({ 
              auth_user_id: user.id,
              full_name: fullName,
            })
            .eq("id", guestProfile.id)

          if (linkError) {
            console.error("[Auth Callback] Failed to link guest profile:", {
              code: linkError.code,
              message: linkError.message,
              details: linkError.details,
              hint: linkError.hint,
            })
            return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent(`Link failed: ${linkError.code}: ${linkError.message}`)}`)
          } else {
            console.log("[Auth Callback] Guest profile linked successfully")
            finalProfile = { id: guestProfile.id, role: "patient", onboarding_completed: guestProfile.onboarding_completed }
          }
        } else {
          // Create new profile using service client
          // Note: A database trigger may have already created a profile, so we use upsert
          console.log("[Auth Callback] Creating new profile for OAuth user (using upsert to handle trigger race condition)")
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"
          const profileData = {
            auth_user_id: user.id,
            email: user.email,
            full_name: fullName,
            role: "patient",
          }
          console.log("[Auth Callback] Upserting profile with data:", { ...profileData, auth_user_id: "***" })

          // Use upsert to handle case where trigger already created profile
          const { data: newProfile, error: profileError } = await serviceClient
            .from("profiles")
            .upsert(profileData, {
              onConflict: "auth_user_id",
              ignoreDuplicates: false,
            })
            .select("id, role, onboarding_completed")
            .single()

          if (profileError) {
            // If upsert failed, try to fetch existing profile (trigger might have created it)
            console.log("[Auth Callback] Upsert failed, checking if profile exists (trigger may have created it):", {
              code: (profileError as any)?.code,
              message: (profileError as any)?.message,
            })
            
            const { data: existingAfterError, error: fetchError } = await serviceClient
              .from("profiles")
              .select("id, role, onboarding_completed")
              .eq("auth_user_id", user.id)
              .single()

            if (existingAfterError && !fetchError) {
              console.log("[Auth Callback] Found profile after upsert error (created by trigger):", existingAfterError.id)
              finalProfile = existingAfterError
            } else {
              const errCode = (profileError as any)?.code
              const errMsg = (profileError as any)?.message
              const errDetails = (profileError as any)?.details
              const errHint = (profileError as any)?.hint
              console.error("[Auth Callback] Failed to create/fetch profile:", {
                code: errCode,
                message: errMsg,
                details: errDetails,
                hint: errHint,
                fetchError: fetchError,
                fullError: profileError,
              })
              return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent(`${errCode}: ${errMsg}`)}`)
            }
          } else if (newProfile) {
            console.log("[Auth Callback] Profile created/updated successfully:", {
              profileId: newProfile.id,
              role: newProfile.role,
              onboardingCompleted: newProfile.onboarding_completed,
            })
            finalProfile = newProfile
          } else {
            console.error("[Auth Callback] Profile upsert succeeded but no data returned")
            // Try one more time to fetch
            const { data: fetchedProfile } = await serviceClient
              .from("profiles")
              .select("id, role, onboarding_completed")
              .eq("auth_user_id", user.id)
              .single()
            
            if (fetchedProfile) {
              console.log("[Auth Callback] Found profile after upsert (no return):", fetchedProfile.id)
              finalProfile = fetchedProfile
            } else {
              return NextResponse.redirect(`${origin}/auth/login?error=profile_creation_failed&details=${encodeURIComponent("Profile created but not returned")}`)
            }
          }
        }
      }

      // Always return to questionnaire flow if that's where we came from
      if (flow === "questionnaire" && redirectTo) {
        console.log("[Auth Callback] Returning to questionnaire flow:", redirectTo)
        return NextResponse.redirect(`${origin}${redirectTo}?auth_success=true`)
      }

      if (finalProfile) {
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
      }

      // New user with redirect, go there; otherwise patient dashboard
      console.log("[Auth Callback] No final profile, redirecting to default")
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
