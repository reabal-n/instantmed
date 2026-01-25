/**
 * E2E Test Error Endpoint
 * 
 * This endpoint intentionally throws an error for testing Sentry integration.
 * ONLY available when PLAYWRIGHT=1 or NODE_ENV=test.
 * 
 * Usage:
 * - GET /api/test/boom - Throws a server-side error
 * - GET /api/test/boom?type=client - Returns HTML that throws client-side error
 */

import { NextRequest, NextResponse } from "next/server"
import { captureApiError } from "@/lib/observability/sentry"

/**
 * Check if E2E test mode is enabled.
 */
function isE2ETestModeEnabled(): boolean {
  return process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT === "1"
}

export async function GET(request: NextRequest) {
  // CRITICAL: Only allow in E2E test mode
  if (!isE2ETestModeEnabled()) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const errorType = searchParams.get("type") || "server"

  // Client-side error: return HTML that throws
  if (errorType === "client") {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>E2E Test - Client Error</title>
      </head>
      <body>
        <h1>E2E Test Page</h1>
        <p>This page will throw a client-side error.</p>
        <div id="error-trigger"></div>
        <script>
          // Throw after a short delay to ensure Sentry is initialized
          setTimeout(() => {
            throw new Error("E2E_TEST_CLIENT_ERROR: Intentional client-side error for Sentry testing");
          }, 100);
        </script>
      </body>
      </html>
    `
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    })
  }

  // Server-side error: throw and capture
  const testError = new Error("E2E_TEST_SERVER_ERROR: Intentional server-side error for Sentry testing")
  
  // Capture to Sentry with structured context
  const eventId = await captureApiError(testError, {
    route: "/api/test/boom",
    method: "GET",
    statusCode: 500,
  })

  // Log event ID for E2E capture
  // eslint-disable-next-line no-console
  console.error(`[SENTRY] Test error captured - Event ID: ${eventId}`)

  // Return error response with event ID for verification
  return NextResponse.json(
    {
      error: "E2E_TEST_SERVER_ERROR",
      message: "Intentional server-side error for Sentry testing",
      sentryEventId: eventId,
    },
    { status: 500 }
  )
}
