import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { trackBusinessMetric } from "@/lib/posthog-server"
import * as Sentry from "@sentry/nextjs"
import { getFeatureFlags } from "@/lib/feature-flags"
import { sendTelegramAlert, escapeMarkdown } from "@/lib/notifications/telegram"

const logger = createLogger("stale-queue")

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
 * - Sends a Telegram queue summary to the doctor if any requests have been waiting
 *   `doctor_alert_threshold_hours` (default 1h), once per intake
 * - Sends a "still reviewing" email to patients waiting `patient_delay_email_hours`
 *   (default 2h), once per intake
 * Thresholds are read from feature flags so they can be adjusted without a deploy.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("stale-queue")

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()

    const flags = await getFeatureFlags()
    const doctorAlertThresholdHours = flags.doctor_alert_threshold_hours ?? 1
    const patientDelayEmailHours = flags.patient_delay_email_hours ?? 2

    const patientEmailThreshold = new Date(now.getTime() - patientDelayEmailHours * 60 * 60 * 1000)

    // ── Stale queue metrics (PostHog only) ──────────────────────────────────
    const { count: staleCount } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .eq("payment_status", "paid")
      .lt("paid_at", patientEmailThreshold.toISOString())

    const totalStale = staleCount ?? 0

    if (totalStale > 0) {
      trackBusinessMetric({
        metric: "queue_backup",
        severity: totalStale >= 5 ? "critical" : "warning",
        metadata: { stale_count: totalStale },
      })
      logger.warn("Stale intakes detected", { stale_count: totalStale })

      // Sentry alert so ops get a real-time notification, not just PostHog metrics
      Sentry.captureMessage(
        totalStale >= 5
          ? `Critical: ${totalStale} intakes waiting 2h+ without review`
          : `Warning: ${totalStale} intake(s) waiting 2h+ without review`,
        {
          level: totalStale >= 5 ? "error" : "warning",
          tags: { alert_type: "stale_queue", severity: totalStale >= 5 ? "critical" : "warning" },
          extra: { stale_count: totalStale },
        },
      )
    }

    // ── Doctor Telegram Alert (1h+ wait, once per intake) ───────────────────
    if (flags.telegram_notifications_enabled) {
      const doctorAlertThreshold = new Date(now.getTime() - doctorAlertThresholdHours * 60 * 60 * 1000)

      const { data: staleDoctorAlerts } = await supabase
        .from("intakes")
        .select(`id, category, paid_at, patient:profiles!patient_id(full_name)`)
        .eq("status", "paid")
        .lt("paid_at", doctorAlertThreshold.toISOString())
        .is("doctor_telegram_alert_sent_at", null)
        .limit(10)

      if (staleDoctorAlerts?.length) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
        const lines = staleDoctorAlerts.map((intake) => {
          const patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
          const firstName = escapeMarkdown((patient?.full_name as string || "Patient").split(" ")[0])
          const waitMins = Math.round((now.getTime() - new Date(intake.paid_at as string).getTime()) / 60000)
          const refId = intake.id.slice(0, 8).toUpperCase()
          const label = formatServiceType(intake.category as string | null)
          return `• [${refId}](${appUrl}/doctor/intakes/${intake.id}) — ${firstName} — ${escapeMarkdown(label)} — ${waitMins}min`
        }).join("\n")

        const count = staleDoctorAlerts.length
        const msg = `⏰ *${count} request${count > 1 ? "s" : ""} waiting 1h\\+*\n\n${lines}\n\n[Open queue →](${appUrl}/doctor/queue)`
        await sendTelegramAlert(msg)

        // Mark alerted — prevents repeat notifications per intake
        await supabase
          .from("intakes")
          .update({ doctor_telegram_alert_sent_at: now.toISOString() })
          .in("id", staleDoctorAlerts.map((i) => i.id))

        logger.info("Doctor Telegram alert sent", { count })
      }
    }

    // ── Patient delay emails ─────────────────────────────────────────────────
    // Send a "we're running late" email to patients waiting the configured hours (once per intake).
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
