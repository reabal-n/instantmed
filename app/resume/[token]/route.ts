import { NextRequest, NextResponse } from "next/server"

import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import { resolveGuestCheckoutResume } from "@/lib/stripe/checkout/guest-resume"

export const dynamic = "force-dynamic"
export const revalidate = 0

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const

function recoveryRedirect(request: NextRequest, destination: string): NextResponse {
  return NextResponse.redirect(new URL(destination, request.url), {
    headers: RESPONSE_HEADERS,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params
  const tokenResult = verifyCheckoutResumeToken(token)

  if (!tokenResult) {
    return recoveryRedirect(request, "/request?error=expired_link")
  }

  const destination = await resolveGuestCheckoutResume(tokenResult.intakeId)
  return recoveryRedirect(request, destination)
}
