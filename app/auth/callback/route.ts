import { type NextRequest,NextResponse } from "next/server"

import { createLogger } from "@/lib/observability/logger"
import { createClient } from "@/lib/supabase/server"

const log = createLogger("auth-callback")

/**
 * AUTH CALLBACK - Supabase PKCE code exchange
 *
 * Flow:
 *   1. User clicks magic link or completes Google OAuth
 *   2. Supabase redirects here with ?code=xxx
 *   3. We exchange the code for a session
 *   4. Redirect to ?next destination or /auth/post-signin for profile linking
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const code = searchParams.get("code")
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

  if (!code) {
    log.warn("Auth callback called without code parameter")
    return NextResponse.redirect(`${origin}/sign-in`)
  }

  log.info("Supabase auth callback - exchanging code for session")
  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    log.error("Supabase code exchange failed", { error: error.message })
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`)
  }

  // Successful auth - redirect through post-signin for profile linking
  const destination = next
    ? `/auth/post-signin?redirect=${encodeURIComponent(next)}`
    : "/auth/post-signin"
  log.info("Supabase auth success, redirecting", { destination })
  return NextResponse.redirect(`${origin}${destination}`)
}
