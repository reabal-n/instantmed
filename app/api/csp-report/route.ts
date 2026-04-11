import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("csp-report")

/**
 * CSP Violation Report Endpoint
 *
 * Receives reports from the Content-Security-Policy-Report-Only header.
 * Logs to Sentry so we can monitor what would break if we tightened the main CSP.
 *
 * This endpoint is intentionally unauthenticated - browsers send reports automatically
 * and cannot attach credentials. Rate limiting is handled by Vercel edge.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract the report - browsers send either { "csp-report": {...} } or the report directly
    const report = body["csp-report"] ?? body

    const violatedDirective = report["violated-directive"] ?? report["effectiveDirective"] ?? "unknown"
    const blockedUri = report["blocked-uri"] ?? report["blockedURL"] ?? "unknown"
    const documentUri = report["document-uri"] ?? report["documentURL"] ?? "unknown"

    log.warn("CSP violation", { violatedDirective, blockedUri, documentUri })

    Sentry.captureMessage(`CSP Violation: ${violatedDirective}`, {
      level: "warning",
      tags: {
        source: "csp-report-only",
        violated_directive: violatedDirective,
      },
      extra: {
        blockedUri,
        documentUri,
        fullReport: report,
      },
    })
  } catch {
    // Malformed report - ignore silently
  }

  return new NextResponse(null, { status: 204 })
}
