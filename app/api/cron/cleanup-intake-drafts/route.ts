import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-cleanup-intake-drafts")

export const maxDuration = 60

/**
 * Daily cleanup of expired intake_drafts rows. Calls the
 * cleanup_expired_intake_drafts() Postgres function created by the
 * 20260427000001_intake_drafts.sql migration.
 *
 * Without this cron the table grows unbounded. The function deletes any
 * row past its expires_at (default: created_at + 7 days).
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.rpc("cleanup_expired_intake_drafts")

    if (error) {
      throw new Error(`Postgres rpc failed: ${error.message}`)
    }

    const deleted = typeof data === "number" ? data : 0
    logger.info("Cron: intake drafts cleanup", { deleted })

    return NextResponse.json({
      success: true,
      deleted,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: intake drafts cleanup failed", { error: err.message })
    captureCronError(err, { jobName: "cleanup-intake-drafts" })

    return NextResponse.json(
      { error: "Failed to cleanup intake drafts" },
      { status: 500 },
    )
  }
}
