import { NextRequest, NextResponse } from "next/server"

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("csp-report")

/**
 * CSP Violation Report Endpoint
 *
 * Receives reports from the Content-Security-Policy-Report-Only header and logs
 * them (console/log only) so we can monitor what would break if we tightened
 * the main CSP.
 *
 * IMPORTANT: this endpoint MUST NOT forward each violation to Sentry. The
 * report-only header fires on every page load with a blocked resource — that is
 * thousands of non-breaking events per day, and on 2026-06-06 it exhausted the
 * Sentry project quota and silently killed ALL ingestion (including SLA-breach
 * and fatal alarms) for days. Report-only violations do not block anything, so
 * they belong in logs, not the error budget. See
 * docs/audits/2026-06-10-comprehensive-audit.md.
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

    // Log only — deliberately NOT sent to Sentry (see header note).
    log.warn("CSP violation", { violatedDirective, blockedUri, documentUri })
  } catch {
    // Malformed report - ignore silently
  }

  return new NextResponse(null, { status: 204 })
}
