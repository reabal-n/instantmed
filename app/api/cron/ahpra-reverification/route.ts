import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { captureCronError } from "@/lib/observability/sentry"
import * as Sentry from "@sentry/nextjs"
import { trackBusinessMetric } from "@/lib/posthog-server"

const logger = createLogger("cron-ahpra-reverification")

/**
 * AHPRA Re-Verification Monitor
 *
 * Runs daily to identify doctors whose AHPRA verification is overdue
 * for annual review. Sends Sentry alerts and disables approval
 * capability for doctors who are 30+ days overdue.
 *
 * Schedule: Daily at 6 AM AEST
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()

    // 1. Find doctors whose yearly review is overdue
    const { data: overdueDoctos, error: overdueError } = await supabase
      .from("profiles")
      .select("id, full_name, email, ahpra_number, ahpra_verified_at, ahpra_next_review_at")
      .eq("role", "doctor")
      .eq("ahpra_verified", true)
      .not("ahpra_next_review_at", "is", null)
      .lt("ahpra_next_review_at", now.toISOString())

    if (overdueError) {
      logger.error("Failed to query overdue doctors", { error: overdueError.message })
      throw new Error(`Query failed: ${overdueError.message}`)
    }

    const overdueDoctors = overdueDoctos || []

    // 2. Find doctors overdue by more than 30 days — auto-suspend approval capability
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const severelyOverdue = overdueDoctors.filter(
      d => d.ahpra_next_review_at && new Date(d.ahpra_next_review_at) < thirtyDaysAgo
    )

    // Auto-revoke verification for 30+ days overdue
    for (const doctor of severelyOverdue) {
      const { error: revokeError } = await supabase
        .from("profiles")
        .update({
          ahpra_verified: false,
          ahpra_verification_notes: `Auto-suspended: Annual re-verification overdue by 30+ days. Last verified: ${doctor.ahpra_verified_at || "unknown"}`,
        })
        .eq("id", doctor.id)

      if (revokeError) {
        logger.error("Failed to auto-suspend doctor", { doctorId: doctor.id, error: revokeError.message })
      } else {
        logger.warn("Doctor auto-suspended for overdue re-verification", {
          doctorId: doctor.id,
          doctorName: doctor.full_name,
          ahpraNumber: doctor.ahpra_number,
          overdueDate: doctor.ahpra_next_review_at,
        })
      }
    }

    // 3. Alert on overdue doctors
    if (overdueDoctors.length > 0) {
      const severity = severelyOverdue.length > 0 ? "error" : "warning"
      Sentry.captureMessage(
        `AHPRA re-verification: ${overdueDoctors.length} doctor(s) overdue, ${severelyOverdue.length} auto-suspended`,
        {
          level: severity,
          tags: {
            source: "ahpra-reverification",
            overdue_count: String(overdueDoctors.length),
            suspended_count: String(severelyOverdue.length),
          },
          extra: {
            overdue_doctors: overdueDoctors.map(d => ({
              name: d.full_name,
              ahpra_number: d.ahpra_number,
              overdue_since: d.ahpra_next_review_at,
            })),
          },
        }
      )

      trackBusinessMetric({
        metric: "ahpra_reverification_overdue",
        severity: severity === "error" ? "critical" : "warning",
        metadata: {
          overdue_count: overdueDoctors.length,
          suspended_count: severelyOverdue.length,
        },
      })
    }

    // 4. Find doctors approaching re-verification (within 14 days)
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const { data: upcomingDoctors } = await supabase
      .from("profiles")
      .select("id, full_name, ahpra_number, ahpra_next_review_at")
      .eq("role", "doctor")
      .eq("ahpra_verified", true)
      .not("ahpra_next_review_at", "is", null)
      .gte("ahpra_next_review_at", now.toISOString())
      .lte("ahpra_next_review_at", fourteenDaysFromNow.toISOString())

    const upcoming = upcomingDoctors || []

    if (upcoming.length > 0) {
      logger.info("Doctors approaching re-verification", {
        count: upcoming.length,
        doctors: upcoming.map(d => ({ name: d.full_name, dueDate: d.ahpra_next_review_at })),
      })
    }

    logger.info("AHPRA re-verification check complete", {
      overdue: overdueDoctors.length,
      suspended: severelyOverdue.length,
      upcoming: upcoming.length,
    })

    return NextResponse.json({
      success: true,
      overdue: overdueDoctors.length,
      suspended: severelyOverdue.length,
      upcoming: upcoming.length,
      checked_at: now.toISOString(),
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error("AHPRA re-verification cron failed", { error: err.message })
    captureCronError(err, { jobName: "ahpra-reverification" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
