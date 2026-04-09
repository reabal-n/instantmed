import { NextRequest, NextResponse } from "next/server"
import { skipFollowup } from "@/app/actions/followups"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await skipFollowup(id)
  const url = new URL(
    "/patient",
    process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au",
  )
  url.searchParams.set("followup_skipped", result.success ? "1" : "0")
  return NextResponse.redirect(url)
}
