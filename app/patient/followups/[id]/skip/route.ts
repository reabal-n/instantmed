import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { skipFollowup } from "@/app/actions/followups"

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const auth = await getAuthenticatedUserWithProfile()
  if (!auth) {
    const signIn = new URL("/sign-in", BASE_URL)
    signIn.searchParams.set("redirect_url", `/patient/followups/${id}/skip`)
    return NextResponse.redirect(signIn)
  }

  const result = await skipFollowup(id)
  const url = new URL("/patient", BASE_URL)
  url.searchParams.set("followup_skipped", result.success ? "1" : "0")
  return NextResponse.redirect(url)
}
