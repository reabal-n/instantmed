import { NextRequest, NextResponse } from "next/server"

import { recordHeardAboutUs } from "@/lib/analytics/record-heard-about-us"
import { getAppUrl } from "@/lib/config/env"
import { verifyHeardAboutUsToken } from "@/lib/crypto/heard-about-us-token"

/**
 * Write path for the self-reported "How did you hear about us?" answer.
 *
 * GET  — one-click answer links in the review-request email. Records, then
 *        redirects to a thank-you page (always redirects, even on a bad token,
 *        so we never leak validity or strand the patient on a JSON blob).
 * POST — the in-app survey card (success page + guest complete-account page).
 *
 * Authorization is the signed HMAC token (the surfaces have no auth cookie).
 * Writes are write-once (first answer wins) and idempotent.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") || ""
  const value = req.nextUrl.searchParams.get("v") || ""

  const verified = verifyHeardAboutUsToken(token)
  if (verified && value) {
    await recordHeardAboutUs(verified.intakeId, value)
  }

  return NextResponse.redirect(`${getAppUrl()}/heard-thanks`, { status: 302 })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: unknown; value?: unknown }
    const token = typeof body.token === "string" ? body.token : ""
    const value = typeof body.value === "string" ? body.value : ""

    const verified = verifyHeardAboutUsToken(token)
    if (!verified || !value) {
      return NextResponse.json({ success: false, error: "invalid" }, { status: 400 })
    }

    const result = await recordHeardAboutUs(verified.intakeId, value)
    if (result === "invalid") {
      return NextResponse.json({ success: false, error: "invalid" }, { status: 400 })
    }
    // "recorded" and "noop" are both success from the client's perspective.
    return NextResponse.json({ success: result !== "error", result })
  } catch {
    return NextResponse.json({ success: false, error: "error" }, { status: 500 })
  }
}
