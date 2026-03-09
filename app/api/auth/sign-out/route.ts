import { NextResponse } from "next/server"

/**
 * Clears the `profile_linked` cookie on sign-out.
 *
 * The cookie is httpOnly, so client-side JavaScript can't clear it.
 * Call this endpoint before Clerk's signOut() to ensure the middleware
 * safety net doesn't skip profile linking for the next sign-in.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set("profile_linked", "", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // Immediately expire
  })

  return response
}
