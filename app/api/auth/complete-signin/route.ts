import { NextRequest, NextResponse } from "next/server"

/**
 * Trampoline route: sets the `profile_linked` cookie and redirects to the
 * final destination. Used by /auth/post-signin because Server Components
 * cannot set cookies directly in Next.js 15.
 *
 * The middleware safety net checks for this cookie on protected routes - if
 * it's missing, the user is bounced back through /auth/post-signin.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const destination = searchParams.get("destination") || "/patient"

  // Validate: must be a safe relative path (no open redirect)
  const safeDest =
    destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/patient"

  const response = NextResponse.redirect(new URL(safeDest, req.url))

  response.cookies.set("profile_linked", "1", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return response
}
