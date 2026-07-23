import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { trackBusinessMetric } from "@/lib/analytics/posthog-server"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { env } from "@/lib/config/env"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { buildPatientRequestAccessUrl } from "@/lib/email/request-access-url"
import { emailRequestTypeLabel } from "@/lib/email/request-type-label"
import { getFeatureFlags } from "@/lib/feature-flags"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { sendQueueWaitingReminderViaTelegram } from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("stale-queue")

export const maxDuration = 60

/**
 * Telegram waiting-line reminder floor (operator decision 2026-07-17:
 * "hourly reminders if a request is waiting in line"). Cadence is this
 * cron's hourly schedule; the 30-minute floor keeps a just-arrived request
 * (or a med cert still inside the ~10-min auto-approval window) from paging
 * before anyone could plausibly need to act. Count-only and PHI-free.
 */
const QUEUE_WAITING_TELEGRAM_REMINDER_MIN_MINUTES = 30

/**
 * Sentry paging threshold, decoupled from `patient_delay_email_hours` (2h).
 * The 2h mark is a PRODUCT behavior (the "still reviewing" reassurance email);
 * paging ops at the same mark warned on the routine case forever — Rx reviews
 * run ~2.6h median / ~12.6h P95, so the 2h page fired 95 times in a month of
 * healthy operation. 6h flags the genuine slow tail while staying far inside
 * the 24h internal maximum. The patient email timing is unchanged.
 */
const STALE_QUEUE_SENTRY_ALERT_MIN_HOURS = 6

/**
 * Stale Queue Monitor
 *
 * Runs every hour via Vercel Cron (configured in vercel.json).
 * - Sends a "still reviewing" email to patients waiting `patient_delay_email_hours`
 *   (default 2h), once per intake
 * - Tracks stale queue pressure through PostHog and Sentry without paging Telegram.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("stale-queue")

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()

    const flags = await getFeatureFlags()
    const patientDelayEmailHours = flags.patient_delay_email_hours ?? 2

    const patientEmailThreshold = new Date(now.getTime() - patientDelayEmailHours * 60 * 60 * 1000)

    // ── Stale queue metrics (PostHog only) ──────────────────────────────────
    // Seeded-E2E filter: CI re-pays the persistent seeded fixture, which sat
    // "paid" here and paged "1 intake waiting 2h+" for days (2026-07-04) while
    // the doctor queue (already filtered) showed nothing. Alerts must count
    // the same world the queue shows.
    const { count: staleCount } = await filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .eq("payment_status", "paid")
        .lt("paid_at", patientEmailThreshold.toISOString()),
    )

    const totalStale = staleCount ?? 0

    if (totalStale > 0) {
      trackBusinessMetric({
        metric: "queue_backup",
        severity: totalStale >= 5 ? "critical" : "warning",
        metadata: { stale_count: totalStale },
      })
      logger.warn("Stale intakes detected", { stale_count: totalStale })
    }

    // Sentry paging runs on its own, higher threshold (see the constant above):
    // the PostHog metric keeps the email-threshold denominator for dashboard
    // continuity, but ops only get paged for the genuine slow tail.
    const sentryAlertHours = Math.max(STALE_QUEUE_SENTRY_ALERT_MIN_HOURS, patientDelayEmailHours)
    const sentryAlertThreshold = new Date(now.getTime() - sentryAlertHours * 60 * 60 * 1000)
    const { count: sentryStaleCount } = await filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .eq("payment_status", "paid")
        .lt("paid_at", sentryAlertThreshold.toISOString()),
    )
    const totalSentryStale = sentryStaleCount ?? 0

    if (totalSentryStale > 0) {
      Sentry.captureMessage(
        totalSentryStale >= 5
          ? `Critical: ${totalSentryStale} intakes waiting ${sentryAlertHours}h+ without review`
          : `Warning: ${totalSentryStale} intake(s) waiting ${sentryAlertHours}h+ without review`,
        {
          level: totalSentryStale >= 5 ? "error" : "warning",
          tags: { alert_type: "stale_queue", severity: totalSentryStale >= 5 ? "critical" : "warning" },
          extra: { stale_count: totalSentryStale },
        },
      )
    }

    // ── Hourly Telegram waiting-line reminder (see the constant above) ──────
    const reminderThreshold = new Date(
      now.getTime() - QUEUE_WAITING_TELEGRAM_REMINDER_MIN_MINUTES * 60 * 1000,
    )
    const { count: waitingReminderCount, data: oldestWaitingRows } =
      await filterSeededE2EIntakes(
        supabase
          .from("intakes")
          .select("paid_at", { count: "exact" })
          .eq("status", "paid")
          .eq("payment_status", "paid")
          .lt("paid_at", reminderThreshold.toISOString())
          .order("paid_at", { ascending: true })
          .limit(1),
      )
    const waitingForReminder = waitingReminderCount ?? 0
    if (waitingForReminder > 0) {
      const oldestPaidAtRaw = oldestWaitingRows?.[0]?.paid_at
      const oldestPaidAtMs = oldestPaidAtRaw ? Date.parse(oldestPaidAtRaw) : Number.NaN
      const oldestWaitingMinutes = Number.isFinite(oldestPaidAtMs)
        ? Math.max(0, Math.floor((now.getTime() - oldestPaidAtMs) / 60_000))
        : QUEUE_WAITING_TELEGRAM_REMINDER_MIN_MINUTES
      await sendQueueWaitingReminderViaTelegram({
        waitingCount: waitingForReminder,
        oldestWaitingMinutes,
      })
    }

    // ── Patient delay emails ─────────────────────────────────────────────────
    // Send a "we're running late" email to patients waiting the configured hours (once per intake).
    let delayEmailsSent = 0
    try {
      const { data: delayEmailCandidates } = await filterSeededE2EIntakes(
        supabase
          .from("intakes")
          .select(`
            id, category, patient_id,
            patient:profiles!patient_id(full_name, email)
          `)
          .eq("status", "paid")
          .lt("paid_at", patientEmailThreshold.toISOString())
          .is("delay_notification_sent_at", null)
          // Cross-guard with the retry-auto-approval cron, which sends the SAME
          // still_reviewing email but tracks it on follow_up_sent_at. Without
          // this, the patient gets the identical email twice. Whichever cron
          // sends first now blocks the other.
          .is("follow_up_sent_at", null)
          .not("patient_id", "is", null)
          .limit(20),
      )

      if (delayEmailCandidates && delayEmailCandidates.length > 0) {
        const [{ sendEmail }, { StillReviewingEmail, stillReviewingSubject }, React] =
          await Promise.all([
            import("@/lib/email/send-email"),
            import("@/lib/email/components/templates/still-reviewing"),
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

            const requestType = emailRequestTypeLabel(intake.category as string | null)

            try {
              const emailResult = await sendEmail({
                to: patient.email,
                toName: patient.full_name || undefined,
                subject: stillReviewingSubject(requestType),
                template: React.createElement(StillReviewingEmail, {
                  patientName: patient.full_name || "there",
                  requestType,
                  requestId: intake.id,
                  requestAccessUrl: buildPatientRequestAccessUrl({
                    appUrl: env.appUrl,
                    intakeId: intake.id,
                  }),
                }),
                emailType: "still_reviewing",
                intakeId: intake.id,
                patientId: intake.patient_id,
              })
              if (emailResult.success || emailResult.outboxId) {
                await supabase
                  .from("intakes")
                  .update({ delay_notification_sent_at: new Date().toISOString() })
                  .eq("id", intake.id)
                delayEmailsSent++
              } else {
                logger.error("Patient delay notification failed without outbox recovery", {
                  intakeId: intake.id,
                  error: emailResult.error,
                })
              }
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

    const { count: stuckScriptCount } = await filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("status", "awaiting_script")
        .lt("updated_at", awaitingScriptThreshold.toISOString()),
    )

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
