import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { createLogger } from "@/lib/observability/logger"
import { createClient } from "@/lib/supabase/server"

const log = createLogger("auth-callback")

/**
 * AUTH CALLBACK — dual-mode (Supabase + Clerk)
 *
 * Supabase flow (magic link / Google OAuth):
 *   1. User clicks magic link or completes Google OAuth
 *   2. Supabase redirects here with ?code=xxx
 *   3. We exchange the code for a session via PKCE
 *   4. Redirect to ?next destination or /patient
 *
 * Clerk flow (legacy — will be removed in PR 4):
 *   1. User signs in via Clerk Account Portal
 *   2. Clerk redirects here (no ?code param)
 *   3. We delegate to /auth/post-signin for profile linking
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

  // ── Supabase flow: exchange PKCE code for session ───────────────
  if (code) {
    log.info("Supabase auth callback — exchanging code for session")
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      log.error("Supabase code exchange failed", { error: error.message })
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`)
    }

    // Successful auth — redirect to destination
    const destination = next ? decodeURIComponent(next) : "/patient"
    log.info("Supabase auth success, redirecting", { destination })
    return NextResponse.redirect(`${origin}${destination}`)
  }

  // ── Clerk flow (legacy) ─────────────────────────────────────────
  log.info("Clerk auth callback - delegating to post-signin", { origin, next })

  const { userId } = await auth()

  if (!userId) {
    log.info("No Clerk user in callback, delegating to post-signin auth waiter")
    return NextResponse.redirect(`${origin}/auth/post-signin`)
  }

  let postSignInUrl = `${origin}/auth/post-signin`

  if (next) {
    try {
      const nextUrl = new URL(decodeURIComponent(next), origin)
      const intakeId = nextUrl.searchParams.get("intake_id")

      if (intakeId) {
        postSignInUrl += `?intake_id=${intakeId}&redirect=${encodeURIComponent(next)}`
      } else {
        postSignInUrl += `?redirect=${encodeURIComponent(next)}`
      }
    } catch {
      postSignInUrl += `?redirect=${encodeURIComponent(next)}`
    }
  }

  log.info("Redirecting to post-signin", { postSignInUrl })
  return NextResponse.redirect(postSignInUrl)
}
