import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Refresh the Supabase Auth session on every request.
 *
 * Call this from the main middleware.ts. It reads the auth cookies,
 * refreshes the token if expired, and writes updated cookies back
 * to the response. Without this, users would be logged out whenever
 * their JWT expires (~1 hour by default).
 *
 * Returns { response, user } so the caller can use the user for
 * route protection decisions.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update the request cookies (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Create a fresh response with updated request
          supabaseResponse = NextResponse.next({ request })
          // Set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not use getSession() here — it reads from cookies
  // without verifying the JWT. getUser() hits the Supabase Auth server
  // and guarantees the session is valid.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response: supabaseResponse, user }
}
