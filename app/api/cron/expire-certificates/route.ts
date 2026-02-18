import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-expire-certificates")

/**
 * Cron job to mark expired certificates
 * Runs daily to update certificate status for certificates past their end_date
 */

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().split("T")[0]

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
        updated_at: new Date().toISOString()
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
    })

    return NextResponse.json({
      success: true,
      expired: expiredCerts.length,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("Certificate expiry cron failed", { error: err.message })
    captureCronError(err, { jobName: "expire-certificates" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
