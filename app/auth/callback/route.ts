import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logLogin } from "@/lib/security/audit-log"

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

  // eslint-disable-next-line no-console
  console.log("[auth-callback] Starting Clerk callback", { origin })

  // Get Clerk auth
  const { userId } = await auth()
  
  if (!userId) {
    // eslint-disable-next-line no-console
    console.log("[auth-callback] No Clerk user, redirecting to sign-in")
    return NextResponse.redirect(`${origin}/sign-in`)
  }

  // Get full user data
  const user = await currentUser()
  
  if (!user) {
    // eslint-disable-next-line no-console
    console.error("[auth-callback] Could not get Clerk user data")
    return NextResponse.redirect(`${origin}/sign-in?error=no_user`)
  }

  const primaryEmail = user.emailAddresses.find(
    e => e.id === user.primaryEmailAddressId
  )?.emailAddress

  // eslint-disable-next-line no-console
  console.log("[auth-callback] Clerk user found")

  try {
    const serviceClient = createServiceRoleClient()
    
    // Check if profile exists
    let { data: profile } = await serviceClient
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("clerk_user_id", userId)
      .single()

    // If no profile, create one (fallback if webhook didn't fire)
    if (!profile && primaryEmail) {
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
        // eslint-disable-next-line no-console
        console.error("[auth-callback] Profile creation failed:", insertError.message)
        return NextResponse.redirect(`${origin}/sign-in?error=profile_failed`)
      }
      
      profile = newProfile
      // eslint-disable-next-line no-console
      console.log("[auth-callback] Created profile for user:", userId)
    }

    // Log login (non-blocking)
    if (profile?.id) {
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || undefined
      const userAgent = request.headers.get("user-agent") || undefined
      logLogin(profile.id, ipAddress, userAgent).catch(() => {})
    }

    // Determine redirect destination
    let destination = `${origin}/patient`
    
    if (profile) {
      if (profile.role === "doctor" || profile.role === "admin") {
        destination = `${origin}/doctor`
      } else if (profile.role === "patient") {
        if (next) {
          // Decode the redirect URL if it was encoded
          const decodedNext = decodeURIComponent(next)
          destination = decodedNext.startsWith('http') 
            ? decodedNext 
            : `${origin}${decodedNext.startsWith('/') ? decodedNext : '/' + decodedNext}`
        } else {
          destination = profile.onboarding_completed 
            ? `${origin}/patient`
            : `${origin}/patient/onboarding`
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log("[auth-callback] Redirecting to:", destination)
    
    return NextResponse.redirect(destination)
    
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth-callback] Error:", err)
    return NextResponse.redirect(`${origin}/sign-in?error=callback_error`)
  }
}
