import { NextRequest, NextResponse } from "next/server"

import { normalizePostAuthRedirect } from "@/lib/auth/redirects"

/**
 * Trampoline route: sets the `profile_linked` cookie and redirects to the
 * final destination. Kept as a compatibility route for older auth handoffs.
 */
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const destination = normalizePostAuthRedirect(
    requestUrl.searchParams.get("destination"),
    "/patient",
    requestUrl.origin,
  )

  const response = NextResponse.redirect(new URL(destination, requestUrl))

  response.cookies.set("profile_linked", "1", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return response
}
