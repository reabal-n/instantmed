import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logLogin } from "@/lib/security/audit-log"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("auth-callback")

/**
 * Validate redirect URL to prevent open redirect attacks
 * Only allows relative paths or URLs matching our allowed hosts
 */
function isValidRedirectUrl(url: string, allowedOrigin: string): boolean {
  // Allow relative paths
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true
  }

  // For absolute URLs, validate the host matches our allowed origin
  try {
    const parsedUrl = new URL(url)
    const parsedOrigin = new URL(allowedOrigin)

    // Only allow same host or explicitly allowed subdomains
    const allowedHosts = [
      parsedOrigin.host,
      `www.${parsedOrigin.host}`,
      // Add any other allowed hosts here
    ]

    return allowedHosts.includes(parsedUrl.host)
  } catch {
    // Invalid URL format
    return false
  }
}

/**
 * Safely construct redirect destination
 */
function getSafeRedirectUrl(next: string | null, origin: string, defaultPath: string): string {
  if (!next) {
    return `${origin}${defaultPath}`
  }

  const decodedNext = decodeURIComponent(next)

  if (!isValidRedirectUrl(decodedNext, origin)) {
    log.warn("Blocked potentially malicious redirect", { attemptedUrl: decodedNext })
    return `${origin}${defaultPath}`
  }

  // For relative paths, prepend origin
  if (decodedNext.startsWith('/')) {
    return `${origin}${decodedNext}`
  }

  // For validated absolute URLs, use as-is
  return decodedNext
}

/**
 * CLERK AUTH CALLBACK
 * 
 * Flow:
 * 1. User signs in via Clerk Account Portal
 * 2. Clerk redirects here after successful auth
 * 3. We ensure profile exists in Supabase
 * 4. Redirect based on user role
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const next = searchParams.get("next") || searchParams.get("redirect")

  // Get the correct origin for redirects
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
  const isLocalEnv = process.env.NODE_ENV === "development"
  
  const origin = isLocalEnv 
    ? requestOrigin 
    : forwardedHost 
      ? `${forwardedProto}://${forwardedHost}`
      : requestOrigin

  log.info("Starting Clerk callback", { origin })

  // Get Clerk auth
  const { userId } = await auth()
  
  if (!userId) {
    log.info("No Clerk user, redirecting to sign-in")
    return NextResponse.redirect(`${origin}/sign-in`)
  }

  // Get full user data
  const user = await currentUser()
  
  if (!user) {
    log.error("Could not get Clerk user data", {})
    return NextResponse.redirect(`${origin}/sign-in?error=no_user`)
  }

  const primaryEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId
  )?.emailAddress

  // Validate email exists before proceeding
  if (!primaryEmail) {
    log.error("User has no primary email address", { userId })
    return NextResponse.redirect(`${origin}/sign-in?error=no_email`)
  }

  log.info("Clerk user found", { userId })

  try {
    const serviceClient = createServiceRoleClient()
    
    // Check if profile exists by clerk_user_id
    const { data: existingProfile, error: profileError } = await serviceClient
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("clerk_user_id", userId)
      .maybeSingle()

    let profile = existingProfile

    log.info("Profile lookup result", { 
      userId, 
      email: primaryEmail,
      foundByClerkId: !!profile,
      profileError: profileError?.message,
    })

    // If no profile by clerk_user_id, check for existing guest profile by email
    if (!profile && primaryEmail) {
      const { data: guestProfile, error: guestError } = await serviceClient
        .from("profiles")
        .select("id, role, onboarding_completed, clerk_user_id")
        .eq("email", primaryEmail.toLowerCase())
        .is("clerk_user_id", null)
        .maybeSingle()

      log.info("Guest profile lookup", { 
        userId, 
        email: primaryEmail,
        foundGuestProfile: !!guestProfile,
        guestError: guestError?.message,
      })

      // If no guest profile found, check if there's a profile with this email that has a DIFFERENT clerk_user_id
      if (!guestProfile) {
        const { data: existingEmailProfile } = await serviceClient
          .from("profiles")
          .select("id, clerk_user_id, email")
          .eq("email", primaryEmail.toLowerCase())
          .maybeSingle()

        if (existingEmailProfile && existingEmailProfile.clerk_user_id && existingEmailProfile.clerk_user_id !== userId) {
          log.error("Email already linked to different Clerk user", {
            userId,
            email: primaryEmail,
            existingProfileId: existingEmailProfile.id,
            existingClerkUserId: existingEmailProfile.clerk_user_id,
          })
          return NextResponse.redirect(`${origin}/sign-in?error=email_already_linked`)
        }

        // If profile exists with same clerk_user_id, use it (race condition recovery)
        if (existingEmailProfile && existingEmailProfile.clerk_user_id === userId) {
          log.info("Found profile by email with matching clerk_user_id (race condition recovery)", {
            profileId: existingEmailProfile.id,
          })
          const { data: recoveredProfile } = await serviceClient
            .from("profiles")
            .select("id, role, onboarding_completed")
            .eq("id", existingEmailProfile.id)
            .single()
          
          if (recoveredProfile) {
            profile = recoveredProfile
          }
        }
      }

      if (profile) {
        // Profile was recovered from race condition check - skip to redirect
        log.info("Using recovered profile", { profileId: profile.id })
      } else if (guestProfile) {
        // Link existing guest profile to this Clerk user
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]
        
        const { data: updatedProfile, error: updateError } = await serviceClient
          .from("profiles")
          .update({
            clerk_user_id: userId,
            full_name: fullName,
            first_name: user.firstName || null,
            last_name: user.lastName || null,
            avatar_url: user.imageUrl || null,
          })
          .eq("id", guestProfile.id)
          .select("id, role, onboarding_completed")
          .single()

        if (updateError) {
          // Check if this is a unique constraint violation (webhook might have won the race)
          if (updateError.code === '23505') {
            log.info("Profile link failed due to unique constraint - checking if webhook linked it", { userId })
            
            // Try to fetch the profile that was linked by the webhook
            const { data: webhookLinkedProfile } = await serviceClient
              .from("profiles")
              .select("id, role, onboarding_completed")
              .eq("clerk_user_id", userId)
              .maybeSingle()
            
            if (webhookLinkedProfile) {
              profile = webhookLinkedProfile
              log.info("Using webhook-linked profile", { profileId: profile.id })
            } else {
              log.error("Unique constraint violation but no profile found", { userId })
              return NextResponse.redirect(`${origin}/sign-in?error=profile_link_failed`)
            }
          } else {
            log.error("Failed to link guest profile to Clerk user", { 
              userId, 
              guestProfileId: guestProfile.id,
              errorCode: updateError.code,
              errorMessage: updateError.message,
              errorDetails: updateError.details,
              errorHint: updateError.hint,
            }, updateError)
            return NextResponse.redirect(`${origin}/sign-in?error=profile_link_failed`)
          }
        } else {
          profile = updatedProfile
          log.info("Linked guest profile to Clerk user", { userId, profileId: profile?.id })
        }
      } else {
        // No existing profile at all - create new one
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]
        
        const { data: newProfile, error: insertError } = await serviceClient
          .from("profiles")
          .insert({
            clerk_user_id: userId,
            email: primaryEmail,
            full_name: fullName,
            first_name: user.firstName || null,
            last_name: user.lastName || null,
            avatar_url: user.imageUrl || null,
            role: 'patient',
          })
          .select("id, role, onboarding_completed")
          .single()

        if (insertError) {
          log.error("Profile creation failed", { 
            userId,
            email: primaryEmail,
            errorCode: insertError.code,
            errorMessage: insertError.message,
            errorDetails: insertError.details,
            errorHint: insertError.hint,
          }, insertError)
          return NextResponse.redirect(`${origin}/sign-in?error=profile_create_failed`)
        }
        
        profile = newProfile
        log.info("Created profile for user", { userId, profileId: profile?.id })
      }
    }

    // Log login (non-blocking)
    if (profile?.id) {
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || undefined
      const userAgent = request.headers.get("user-agent") || undefined
      logLogin(profile.id, ipAddress, userAgent).catch(() => {})
    }

    // Determine redirect destination with open redirect protection for ALL roles
    let destination: string

    if (profile) {
      if (profile.role === "doctor" || profile.role === "admin") {
        // Apply safe redirect validation to doctor/admin too
        destination = getSafeRedirectUrl(next, origin, "/doctor")
      } else {
        // Patient role
        const defaultPatientPath = profile.onboarding_completed ? "/patient" : "/patient/onboarding"
        destination = getSafeRedirectUrl(next, origin, defaultPatientPath)
      }
    } else {
      destination = getSafeRedirectUrl(next, origin, "/patient")
    }

    log.info("Redirecting user", { destination, role: profile?.role })
    
    return NextResponse.redirect(destination)
    
  } catch (err) {
    log.error("Auth callback error", {}, err)
    return NextResponse.redirect(`${origin}/sign-in?error=callback_error`)
  }
}
