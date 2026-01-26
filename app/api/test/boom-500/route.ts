/**
 * Test Route: Returns 500 JSON Without Throwing
 * 
 * PLAYWRIGHT MODE ONLY
 * Tests that Sentry captures handled 500 responses (not just thrown exceptions).
 */

import { NextResponse } from "next/server"
import { withSentryApiCapture } from "@/lib/observability/sentry"

export const runtime = "nodejs"

async function handler(request: Request): Promise<Response> {
  // Only allow in PLAYWRIGHT mode
  if (process.env.PLAYWRIGHT !== "1") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get("action")

  if (action === "500") {
    // Return a 500 response WITHOUT throwing
    // This tests the "handled failure" capture path
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Intentional 500 for Sentry verification",
        test_type: "handled_500_response",
      },
      { status: 500 }
    )
  }

  if (action === "503") {
    // Return a 503 Service Unavailable
    return NextResponse.json(
      {
        error: "Service unavailable",
        message: "Intentional 503 for Sentry verification",
      },
      { status: 503 }
    )
  }

  // Default: health check
  return NextResponse.json({
    ok: true,
    runtime: "nodejs",
    timestamp: new Date().toISOString(),
    usage: "Add ?action=500 or ?action=503 to trigger handled failures",
  })
}

// Wrap with Sentry capture to test the 5xx handling
export const GET = withSentryApiCapture("/api/test/boom-500", handler)
