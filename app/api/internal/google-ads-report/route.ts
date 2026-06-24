import { NextRequest, NextResponse } from "next/server"

import { getGoogleAdsSpendAuditReport } from "@/lib/analytics/google-ads-report"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

function parseDays(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 30
  return Math.min(Math.max(Math.floor(parsed), 1), 90)
}

function parseProcessingWindowHours(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 24
  return Math.min(Math.max(Math.floor(parsed), 1), 168)
}

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const days = parseDays(request.nextUrl.searchParams.get("days"))
    const watchJobId = request.nextUrl.searchParams.get("watchJobId")
    const watchUploadedAt = request.nextUrl.searchParams.get("watchUploadedAt")
    const diagnosticsProcessingWindowHours = parseProcessingWindowHours(
      request.nextUrl.searchParams.get("processingWindowHours"),
    )
    const report = await getGoogleAdsSpendAuditReport({
      auditSince: watchUploadedAt || undefined,
      days,
      diagnosticsProcessingWindowHours,
      supabase: createServiceRoleClient(),
      watchJobId,
      watchUploadedAt,
    })

    return NextResponse.json({
      success: report.queryErrors.length === 0,
      report,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    const eventId = captureCronError(err, { jobName: "google-ads-report" })
    return NextResponse.json(
      {
        error: err.message,
        sentry_event_id: eventId,
        success: false,
      },
      { status: 500 },
    )
  }
}
