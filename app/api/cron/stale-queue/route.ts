import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { trackBusinessMetric } from "@/lib/posthog-server"
import { sendQueueReminderViaTelegram } from "@/lib/notifications/telegram"

const logger = createLogger("cron-stale-queue")

// Doctor gets a Telegram reminder when requests have been waiting this long
const DOCTOR_ALERT_THRESHOLD_HOURS = 1
// Patients get a "still reviewing" email after this long
const PATIENT_EMAIL_THRESHOLD_HOURS = 2

function formatServiceType(category: string | null): string {
  if (category === "medical_certificate") return "medical certificate"
  if (category === "prescription") return "prescription"
  if (category === "consultation") return "consultation"
  return "request"
}

/**
 * Stale Queue Monitor
 *
 * Runs every hour via Vercel Cron (configured in vercel.json).
 * - Sends a Telegram queue summary to the doctor if any requests have been waiting 1h+
 * - Sends a "still reviewing" email to patients waiting 2h+ (once per intake)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("stale-queue")

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()

    const doctorAlertThreshold = new Date(now.getTime() - DOCTOR_ALERT_THRESHOLD_HOURS * 60 * 60 * 1000)
    const patientEmailThreshold = new Date(now.getTime() - PATIENT_EMAIL_THRESHOLD_HOURS * 60 * 60 * 1000)

    // ── Doctor Telegram reminder ─────────────────────────────────────────────
    // If any paid intakes have been waiting 1h+, send the doctor a queue summary.
    const { data: staleIntakes, count: staleCount } = await supabase
      .from("intakes")
      .select("id, paid_at, status, category", { count: "exact" })
      .eq("status", "paid")
      .eq("payment_status", "paid")
      .lt("paid_at", doctorAlertThreshold.toISOString())
      .order("paid_at", { ascending: true })
      .limit(20)

    const totalStale = staleCount ?? 0

    if (totalStale > 0) {
      const waitItems = (staleIntakes ?? []).map(i => {
        const paidAt = new Date(i.paid_at)
        const hoursWaiting = Math.round(((now.getTime() - paidAt.getTime()) / (1000 * 60 * 60)) * 10) / 10
        return {
          id: i.id,
          serviceType: formatServiceType(i.category as string | null),
          hoursWaiting,
        }
      })

      await sendQueueReminderViaTelegram({
        totalCount: totalStale,
        items: waitItems.slice(0, 5),
      }).catch(err => logger.error("Failed to send Telegram queue reminder", {}, err as Error))

      trackBusinessMetric({
        metric: "queue_backup",
        severity: totalStale >= 5 ? "critical" : "warning",
        metadata: { stale_count: totalStale, oldest_wait_hours: waitItems[0]?.hoursWaiting },
      })

      logger.warn("Queue reminder sent to doctor", {
        stale_count: totalStale,
        oldest_wait_hours: waitItems[0]?.hoursWaiting,
      })
    } else {
      logger.info("Queue health check passed — no stale intakes", {})
    }

    // ── Patient delay emails ─────────────────────────────────────────────────
    // Send a "we're running late" email to patients waiting 2h+ (once per intake).
    let delayEmailsSent = 0
    try {
      const { data: delayEmailCandidates } = await supabase
        .from("intakes")
        .select(`
          id, category,
          patient:profiles!patient_id(full_name, email)
        `)
        .eq("status", "paid")
        .lt("paid_at", patientEmailThreshold.toISOString())
        .is("delay_notification_sent_at", null)
        .not("patient_id", "is", null)
        .limit(20)

      if (delayEmailCandidates && delayEmailCandidates.length > 0) {
        const [{ sendEmail }, { StillReviewingEmail, stillReviewingSubject }, React] =
          await Promise.all([
            import("@/lib/email/send-email"),
            import("@/components/email/templates/still-reviewing"),
            import("react"),
          ])

        await Promise.allSettled(
          delayEmailCandidates.map(async (intake) => {
            const patientRaw = intake.patient as
              | { full_name: string; email: string }[]
              | { full_name: string; email: string }
              | null
            const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
            if (!patient?.email) return

            const requestType = formatServiceType(intake.category as string | null)

            try {
              await sendEmail({
                to: patient.email,
                toName: patient.full_name || undefined,
                subject: stillReviewingSubject(requestType),
                template: React.createElement(StillReviewingEmail, {
                  patientName: patient.full_name || "there",
                  requestType,
                  requestId: intake.id,
                }),
                emailType: "still_reviewing",
                intakeId: intake.id,
              })
              await supabase
                .from("intakes")
                .update({ delay_notification_sent_at: new Date().toISOString() })
                .eq("id", intake.id)
              delayEmailsSent++
            } catch (err) {
              logger.error("Failed to send patient delay notification", { intakeId: intake.id }, err as Error)
            }
          }),
        )
      }
    } catch (delayEmailError) {
      logger.error("Error in patient delay email block", {}, delayEmailError as Error)
    }

    // ── Stuck awaiting_script intakes (48h) ─────────────────────────────────
    const AWAITING_SCRIPT_THRESHOLD_HOURS = 48
    const awaitingScriptThreshold = new Date(now.getTime() - AWAITING_SCRIPT_THRESHOLD_HOURS * 60 * 60 * 1000)

    const { count: stuckScriptCount } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_script")
      .lt("updated_at", awaitingScriptThreshold.toISOString())

    if ((stuckScriptCount ?? 0) > 0) {
      logger.warn("Intakes stuck in awaiting_script for 48+ hours", { stuck_count: stuckScriptCount })
      trackBusinessMetric({
        metric: "stuck_awaiting_script",
        severity: "warning",
        metadata: { stuck_count: stuckScriptCount },
      })
    }

    return NextResponse.json({
      success: true,
      stale_count: totalStale,
      delay_emails_sent: delayEmailsSent,
      stuck_awaiting_script: stuckScriptCount ?? 0,
      checked_at: now.toISOString(),
    })
  } catch (error) {
    logger.error("Stale queue monitor failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Stale queue monitor failed" }, { status: 500 })
  }
}
