import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { acquireCronLock, releaseCronLock, verifyCronRequest } from "@/lib/api/cron-auth"
import { toError } from "@/lib/errors"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-expire-certificates")
const JOB_NAME = "expire-certificates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function getSydneyDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Australia/Sydney",
    year: "numeric",
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

/**
 * Cron job to mark expired certificates
 * Runs daily to update certificate status for certificates past their end_date
 */

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat(JOB_NAME)

  // Acquire concurrency lock - prevents overlapping execution in serverless
  const lock = await acquireCronLock(JOB_NAME)
  if (!lock.acquired) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: lock.existingLockAge
        ? `Already running for ${lock.existingLockAge}s`
        : "Already running",
    })
  }

  try {
    const supabase = createServiceRoleClient()
    const today = getSydneyDateString()

    // Find valid certificates that have passed their end_date
    const { data: expiredCerts, error: fetchError } = await supabase
      .from("issued_certificates")
      .select("id, certificate_number, end_date")
      .eq("status", "valid")
      .lt("end_date", today)
      .limit(100)

    if (fetchError) {
      logger.error("Failed to fetch expired certificates", {}, fetchError)
      return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
    }

    if (!expiredCerts || expiredCerts.length === 0) {
      return NextResponse.json({ success: true, expired: 0 })
    }

    // Update status to expired
    const certIds = expiredCerts.map((c) => c.id)
    const { error: updateError } = await supabase
      .from("issued_certificates")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .in("id", certIds)

    if (updateError) {
      logger.error("Failed to update expired certificates", { count: certIds.length }, updateError)
      return NextResponse.json({ error: "Failed to update certificates" }, { status: 500 })
    }

    // Log audit events for each expired certificate
    for (const cert of expiredCerts) {
      try {
        await supabase.from("certificate_audit_log").insert({
          certificate_id: cert.id,
          event_type: "expired",
          actor_id: null,
          actor_role: "system",
          event_data: {
            end_date: cert.end_date,
            expired_by_cron: true,
          },
        })
      } catch (auditError) {
        logger.error("Failed to insert audit log for expired certificate", {
          certificateId: cert.id,
          error: auditError instanceof Error ? auditError.message : String(auditError),
        })
        // Continue processing remaining certificates
      }
    }

    logger.info("Expired certificates processed", {
      count: expiredCerts.length,
      certificateNumbers: expiredCerts.map((c) => c.certificate_number),
      today,
    })

    return NextResponse.json({
      success: true,
      expired: expiredCerts.length,
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Certificate expiry cron failed", { error: err.message })
    captureCronError(err, { jobName: "expire-certificates" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  } finally {
    await releaseCronLock(JOB_NAME)
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
