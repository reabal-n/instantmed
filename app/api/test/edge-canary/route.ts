/**
 * Edge Canary Route - PLAYWRIGHT MODE ONLY
 * 
 * Test route to verify Sentry captures exceptions in Edge runtime.
 * Only accessible when PLAYWRIGHT=1 for E2E testing.
 */

import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export const runtime = "edge"

export async function GET(request: Request) {
  // Only allow in PLAYWRIGHT mode
  if (process.env.NEXT_PUBLIC_PLAYWRIGHT !== "1") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get("action")

  if (action === "throw") {
    // Intentionally throw to test Edge error capture
    const testError = new Error("Edge canary: intentional throw for Sentry verification")
    testError.name = "EdgeCanaryError"
    
    // Explicitly capture before throwing for verification
    const eventId = Sentry.captureException(testError, {
      tags: {
        source: "edge_canary",
        runtime: "edge",
        playwright: "1",
      },
      extra: {
        intentional: true,
        test_type: "edge_error_capture",
      },
    })

    // Log event ID for Playwright to capture
    // eslint-disable-next-line no-console
    console.log(`[SENTRY_EDGE_CANARY] Event ID: ${eventId}`)

    throw testError
  }

  if (action === "capture") {
    // Capture without throwing - test explicit capture in Edge
    const testError = new Error("Edge canary: explicit capture without throw")
    testError.name = "EdgeCanaryCaptureOnly"

    const eventId = Sentry.captureException(testError, {
      tags: {
        source: "edge_canary",
        runtime: "edge",
        playwright: "1",
        capture_type: "explicit",
      },
    })

    // Log event ID for verification
    // eslint-disable-next-line no-console
    console.log(`[SENTRY_EDGE_CANARY] Event ID: ${eventId}`)

    return NextResponse.json({
      success: true,
      eventId,
      runtime: "edge",
      message: "Error captured explicitly without throwing",
    })
  }

  // Default: health check
  return NextResponse.json({
    ok: true,
    runtime: "edge",
    timestamp: new Date().toISOString(),
  })
}
