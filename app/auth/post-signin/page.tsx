import { redirect } from "next/navigation"
import { auth, currentUser } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("post-signin")

export const dynamic = "force-dynamic"

/**
 * Post Sign-In Handler
 *
 * This page handles the transition from Clerk authentication to our app.
 * It ensures the user's profile is properly linked before redirecting to
 * protected routes like /patient/intakes/success.
 *
 * This solves the race condition where:
 * 1. User signs in with Google
 * 2. Clerk redirects to /patient/intakes/success (protected)
 * 3. Profile linking (via webhook or callback) hasn't completed yet
 * 4. requireRole can't find profile, redirects back to /sign-in
 * 5. Loop!
 *
 * Solution: This page waits for profile to be linked (with retry) before
 * redirecting to the final destination.
 */
export default async function PostSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; intake_id?: string }>
}) {
  const params = await searchParams
  const { userId } = await auth()

  // Not authenticated - redirect to sign in
  if (!userId) {
    log.info("No user ID, redirecting to sign-in")
    redirect("/sign-in")
  }

  const user = await currentUser()
  if (!user) {
    log.info("No Clerk user, redirecting to sign-in")
    redirect("/sign-in")
  }

  const primaryEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId
  )?.emailAddress

  log.info("Post sign-in check started", { userId, email: primaryEmail })

  const supabase = createServiceRoleClient()

  // Try to find profile with retries (handles race condition with webhook)
  let profile = null
  const maxRetries = 5
  const retryDelayMs = 500

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // First check by clerk_user_id
    const { data: existingProfile, error: lookupError } = await supabase
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("clerk_user_id", userId)
      .maybeSingle()

    if (lookupError) {
      log.warn("Profile lookup error", { error: lookupError.message, attempt })
    }

    if (existingProfile) {
      profile = existingProfile
      log.info("Found profile by clerk_user_id", { profileId: profile.id, attempt })
      break
    }

    // Also check by email with clerk_user_id (case insensitive)
    if (primaryEmail) {
      const { data: emailProfile } = await supabase
        .from("profiles")
        .select("id, role, onboarding_completed, clerk_user_id")
        .ilike("email", primaryEmail)
        .eq("clerk_user_id", userId)
        .maybeSingle()

      if (emailProfile) {
        profile = emailProfile
        log.info("Found profile by email + clerk_user_id", { profileId: profile.id, attempt })
        break
      }
    }

    // If not found by clerk_user_id, try to link a guest profile by email
    // Check for profiles where clerk_user_id is NULL or empty string
    if (primaryEmail) {
      const { data: guestProfile } = await supabase
        .from("profiles")
        .select("id, role, onboarding_completed, clerk_user_id")
        .ilike("email", primaryEmail)
        .or("clerk_user_id.is.null,clerk_user_id.eq.")
        .maybeSingle()

      if (guestProfile && (!guestProfile.clerk_user_id || guestProfile.clerk_user_id === "")) {
        // Link the guest profile to this Clerk user
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]

        const { data: linkedProfile, error: linkError } = await supabase
          .from("profiles")
          .update({
            clerk_user_id: userId,
            email: primaryEmail.toLowerCase(), // Normalize email
            full_name: fullName,
            first_name: user.firstName || null,
            last_name: user.lastName || null,
            avatar_url: user.imageUrl || null,
            email_verified: true, // Clerk has verified the email
            email_verified_at: new Date().toISOString(),
          })
          .eq("id", guestProfile.id)
          .select("id, role, onboarding_completed")
          .maybeSingle()

        if (linkedProfile) {
          profile = linkedProfile
          log.info("Linked guest profile to Clerk user", { profileId: profile.id, attempt })
          break
        } else if (linkError) {
          log.warn("Failed to link guest profile", { error: linkError.message, attempt })

          // Check if another process linked it
          const { data: nowLinkedProfile } = await supabase
            .from("profiles")
            .select("id, role, onboarding_completed")
            .eq("clerk_user_id", userId)
            .maybeSingle()

          if (nowLinkedProfile) {
            profile = nowLinkedProfile
            log.info("Found profile linked by another process", { profileId: profile.id, attempt })
            break
          }
        }
      }
    }

    // Wait before retry (except on last attempt)
    if (attempt < maxRetries) {
      log.info("Profile not found, retrying", { attempt, maxRetries })
      await new Promise(resolve => setTimeout(resolve, retryDelayMs))
    }
  }

  // If still no profile, create one with retries
  if (!profile && primaryEmail) {
    const normalizedEmail = primaryEmail.toLowerCase()
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || normalizedEmail.split('@')[0]

    // Try to create profile with retries
    for (let createAttempt = 1; createAttempt <= 3; createAttempt++) {
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          clerk_user_id: userId,
          email: normalizedEmail,
          full_name: fullName,
          first_name: user.firstName || null,
          last_name: user.lastName || null,
          avatar_url: user.imageUrl || null,
          role: "patient",
          onboarding_completed: false,
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        })
        .select("id, role, onboarding_completed")
        .single()

      if (!createError && newProfile) {
        profile = newProfile
        log.info("Created new profile", { profileId: profile?.id, attempt: createAttempt })
        break
      }

      if (createError) {
        // Handle race condition where profile was created by webhook between our checks
        if (createError.code === '23505') {
          // Unique constraint violation - profile was created by another process
          const { data: raceProfile } = await supabase
            .from("profiles")
            .select("id, role, onboarding_completed")
            .eq("clerk_user_id", userId)
            .maybeSingle()

          if (raceProfile) {
            profile = raceProfile
            log.info("Found profile created by webhook during race", { profileId: profile.id })
            break
          }

          // Also check by email in case it was linked differently
          const { data: emailProfile } = await supabase
            .from("profiles")
            .select("id, role, onboarding_completed, clerk_user_id")
            .ilike("email", primaryEmail)
            .maybeSingle()

          if (emailProfile) {
            if (emailProfile.clerk_user_id === userId) {
              profile = emailProfile
              log.info("Found profile by email with matching clerk_user_id", { profileId: profile.id })
              break
            } else if (!emailProfile.clerk_user_id) {
              // Try to link it
              const { data: linkedProfile } = await supabase
                .from("profiles")
                .update({ clerk_user_id: userId })
                .eq("id", emailProfile.id)
                .is("clerk_user_id", null)
                .select("id, role, onboarding_completed")
                .maybeSingle()

              if (linkedProfile) {
                profile = linkedProfile
                log.info("Linked orphaned email profile", { profileId: profile.id })
                break
              }
            } else {
              // Email exists with a DIFFERENT clerk_user_id - this is a conflict
              // This could happen if the same person signed up with different auth providers
              log.error("Email already linked to different Clerk user", {
                email: primaryEmail,
                existingClerkUserId: emailProfile.clerk_user_id,
                currentClerkUserId: userId,
              })
              // Don't use this profile - it belongs to a different Clerk user
              // Continue to next retry attempt
            }
          }
        } else {
          log.error("Failed to create profile", {
            errorCode: createError.code,
            errorMessage: createError.message,
            attempt: createAttempt
          })
        }

        // Wait before retry
        if (createAttempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
  }

  // Final fallback: if we still don't have a profile, try one more lookup
  if (!profile) {
    const { data: finalProfile } = await supabase
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("clerk_user_id", userId)
      .maybeSingle()

    if (finalProfile) {
      profile = finalProfile
      log.info("Found profile in final fallback lookup", { profileId: profile.id })
    }
  }

  // If we still don't have a profile after all attempts, check for conflicts
  // and show an error page
  let errorReason = "unknown"
  let conflictingProfile = null

  if (!profile && primaryEmail) {
    // Check if there's a profile with this email linked to a different Clerk user
    const { data: existingEmailProfile } = await supabase
      .from("profiles")
      .select("id, clerk_user_id, email")
      .ilike("email", primaryEmail)
      .maybeSingle()

    if (existingEmailProfile) {
      if (existingEmailProfile.clerk_user_id && existingEmailProfile.clerk_user_id !== userId) {
        errorReason = "email_conflict"
        conflictingProfile = existingEmailProfile
        log.error("Email already linked to different Clerk user - cannot create profile", {
          email: primaryEmail,
          currentClerkUserId: userId,
          existingClerkUserId: existingEmailProfile.clerk_user_id,
        })
      } else if (!existingEmailProfile.clerk_user_id) {
        // Guest profile exists but couldn't be linked - this is unusual
        errorReason = "link_failed"
        log.error("Guest profile exists but could not be linked", {
          email: primaryEmail,
          profileId: existingEmailProfile.id,
          currentClerkUserId: userId,
        })
      }
    } else {
      errorReason = "create_failed"
      log.error("Failed to create profile - no existing profile found", {
        email: primaryEmail,
        clerkUserId: userId,
      })
    }
  }

  // DO NOT redirect to /patient as that will cause a redirect loop
  if (!profile) {
    log.error("Failed to create or find profile after all attempts", {
      userId,
      email: primaryEmail,
      errorReason,
    })

    // Return an error page instead of redirecting to avoid the loop
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Account Setup Issue</h1>
          <p className="text-gray-600">
            {errorReason === "email_conflict"
              ? "This email address is already linked to another account. Please sign in with the original account or contact support."
              : errorReason === "link_failed"
              ? "We found your account but couldn't link it. Please try again or contact support."
              : "We encountered an issue setting up your account. This is usually temporary."}
          </p>
          <div className="space-y-3">
            <a
              href="/auth/post-signin"
              className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </a>
            <a
              href="/"
              className="block w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Go to Home
            </a>
          </div>
          <p className="text-sm text-gray-500">
            If this issue persists, please contact support.
            {process.env.NODE_ENV === "development" && (
              <span className="block mt-2 text-xs text-gray-400">
                Debug: {errorReason} | User: {userId?.slice(0, 8)}...
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  // Determine final redirect destination
  let destination: string

  if (params.redirect) {
    // Use the provided redirect URL
    const decodedRedirect = decodeURIComponent(params.redirect)

    // Validate it's a safe relative path
    if (decodedRedirect.startsWith('/') && !decodedRedirect.startsWith('//')) {
      destination = decodedRedirect
    } else {
      destination = profile.onboarding_completed ? "/patient" : "/patient/onboarding"
    }
  } else if (params.intake_id) {
    // Redirect to intake success page
    destination = `/patient/intakes/success?intake_id=${params.intake_id}`
  } else {
    // Default destination based on role and onboarding status
    if (profile.role === "doctor" || profile.role === "admin") {
      destination = "/doctor"
    } else {
      destination = profile.onboarding_completed ? "/patient" : "/patient/onboarding"
    }
  }

  log.info("Post sign-in complete, redirecting", {
    destination,
    profileFound: true,
    role: profile.role
  })

  redirect(destination)
}
