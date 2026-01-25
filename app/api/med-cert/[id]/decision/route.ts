/**
 * @deprecated DISABLED - This route is permanently deprecated.
 *
 * The ONLY canonical approval flow is:
 *   app/actions/approve-cert.ts -> approveAndSendCert()
 *
 * This route returns 410 Gone as of 2026-01-25.
 * Do NOT re-enable. Do NOT add new functionality here.
 */

import { NextResponse } from "next/server"

/**
 * All methods return 410 Gone.
 * Canonical path: app/actions/approve-cert.ts -> approveAndSendCert()
 */
export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: "This endpoint is permanently disabled. Use the server action approveAndSendCert() instead.",
    },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "This endpoint is permanently disabled." },
    { status: 410 }
  )
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: "This endpoint is permanently disabled." },
    { status: 410 }
  )
}
