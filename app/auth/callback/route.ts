import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("auth-callback")

/**
 * CLERK AUTH CALLBACK
 *
 * This route now delegates to /auth/post-signin for profile linking.
 * This ensures consistent profile linking logic with retries.
 *
 * Flow:
 * 1. User signs in via Clerk Account Portal
 * 2. Clerk redirects here after successful auth
 * 3. We redirect to /auth/post-signin which handles profile linking with retries
 * 4. post-signin redirects to final destination
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

  log.info("Auth callback - delegating to post-signin", { origin, next })

  // Get Clerk auth to verify user is authenticated
  const { userId } = await auth()

  if (!userId) {
    log.info("No Clerk user, redirecting to sign-in")
    return NextResponse.redirect(`${origin}/sign-in`)
  }

  // Delegate to /auth/post-signin which handles profile linking with retries
  // This prevents the redirect loop by ensuring profile is linked before accessing protected routes
  let postSignInUrl = `${origin}/auth/post-signin`

  if (next) {
    // Extract intake_id from redirect URL if present
    try {
      const nextUrl = new URL(decodeURIComponent(next), origin)
      const intakeId = nextUrl.searchParams.get("intake_id")

      if (intakeId) {
        postSignInUrl += `?intake_id=${intakeId}&redirect=${encodeURIComponent(next)}`
      } else {
        postSignInUrl += `?redirect=${encodeURIComponent(next)}`
      }
    } catch {
      // Invalid URL, just pass the redirect as-is
      postSignInUrl += `?redirect=${encodeURIComponent(next)}`
    }
  }

  log.info("Redirecting to post-signin", { postSignInUrl })
  return NextResponse.redirect(postSignInUrl)
}
