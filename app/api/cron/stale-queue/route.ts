import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import * as Sentry from "@sentry/nextjs"
import { trackBusinessMetric } from "@/lib/posthog-server"
import { sendViaResend } from "@/lib/email/resend"
import { CONTACT_EMAIL } from "@/lib/constants"

const logger = createLogger("cron-stale-queue")

// Alert thresholds
const STALE_THRESHOLD_HOURS = 4 // Patients expect "within an hour"
const CRITICAL_THRESHOLD_HOURS = 8

function formatServiceType(category: string | null): string {
  if (category === "medical_certificate") return "medical certificate"
  if (category === "prescription") return "prescription"
  if (category === "consultation") return "consultation"
  return "request"
}

/**
 * Stale Queue Monitor
 * 
 * Checks for paid intakes that have been waiting in the doctor queue
 * for longer than expected. Sends alerts to ensure SLA compliance.
 * 
 * Runs every hour via Vercel Cron (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("stale-queue")

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()

    // Find paid intakes older than threshold that haven't been picked up
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000)
    const criticalThreshold = new Date(now.getTime() - CRITICAL_THRESHOLD_HOURS * 60 * 60 * 1000)

    const { data: staleIntakes, error, count } = await supabase
      .from("intakes")
      .select("id, paid_at, status, category", { count: "exact" })
      .eq("status", "paid")
      .eq("payment_status", "paid")
      .lt("paid_at", staleThreshold.toISOString())
      .order("paid_at", { ascending: true })
      .limit(20)

    if (error) {
      logger.error("Failed to query stale intakes", { error: error.message })
      return NextResponse.json({ error: "Failed to query stale intakes" }, { status: 500 })
    }

    const staleCount = count || 0

    if (staleCount === 0) {
      logger.info("Queue health check passed - no stale intakes", {})
      return NextResponse.json({
        success: true,
        stale_count: 0,
        checked_at: now.toISOString(),
      })
    }

    // Categorize by severity
    const criticalIntakes = staleIntakes?.filter(i =>
      i.paid_at && new Date(i.paid_at) < criticalThreshold
    ) || []
    const warningIntakes = staleIntakes?.filter(i =>
      i.paid_at && new Date(i.paid_at) >= criticalThreshold
    ) || []

    // Calculate wait times
    const waitTimes = staleIntakes?.map(i => {
      const paidAt = new Date(i.paid_at)
      const hoursWaiting = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60)
      return { id: i.id, serviceType: i.category || 'unknown', hoursWaiting: Math.round(hoursWaiting * 10) / 10 }
    }) || []

    // ── Patient delay notification emails ────────────────────────────────────
    // Send a "we're running late" email to patients who have been waiting 4h+
    // but haven't yet received a delay notification. Uses delay_notification_sent_at
    // as a guard so we only send once per intake.
    let delayEmailsSent = 0
    try {
      const { data: delayEmailCandidates } = await supabase
        .from("intakes")
        .select(`
          id, category,
          patient:profiles!patient_id(full_name, email)
        `)
        .eq("status", "paid")
        .lt("paid_at", staleThreshold.toISOString())
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
              // Mark sent so we don't send on the next cron run
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
      // Non-blocking — ops alerting below must still run
    }

    // Alert based on severity
    if (criticalIntakes.length > 0) {
      Sentry.captureMessage(`CRITICAL: ${criticalIntakes.length} intakes waiting 8+ hours`, {
        level: "error",
        tags: {
          source: "stale-queue-monitor",
          alert_type: "critical_sla_breach",
        },
        extra: {
          critical_count: criticalIntakes.length,
          warning_count: warningIntakes.length,
          total_stale: staleCount,
          oldest_intakes: waitTimes.slice(0, 5),
        },
      })
      logger.error("CRITICAL SLA breach - intakes waiting 8+ hours", {
        critical_count: criticalIntakes.length,
        intake_ids: criticalIntakes.map(i => i.id),
      })
      trackBusinessMetric({
        metric: 'sla_breach',
        severity: 'critical',
        metadata: { critical_count: criticalIntakes.length, total_stale: staleCount },
      })

      // Email escalation — Sentry alone is not enough for an 8h breach
      const intakeRows = waitTimes.slice(0, 10).map(i =>
        `<tr><td style="padding:4px 8px;font-family:monospace">${i.id}</td><td style="padding:4px 8px">${i.serviceType}</td><td style="padding:4px 8px;color:#dc2626;font-weight:600">${i.hoursWaiting}h</td></tr>`
      ).join("")
      await sendViaResend({
        to: CONTACT_EMAIL,
        from: `InstantMed Alerts <noreply@instantmed.com.au>`,
        subject: `🚨 SLA BREACH: ${criticalIntakes.length} intake${criticalIntakes.length !== 1 ? "s" : ""} waiting 8+ hours`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">SLA Breach — Immediate Action Required</h2>
            <p><strong>${criticalIntakes.length} paid intake${criticalIntakes.length !== 1 ? "s" : ""} ${criticalIntakes.length !== 1 ? "have" : "has"} been waiting 8+ hours without a doctor review.</strong></p>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
              <thead><tr style="background:#f9fafb"><th style="padding:4px 8px;text-align:left">Intake ID</th><th style="padding:4px 8px;text-align:left">Service</th><th style="padding:4px 8px;text-align:left">Wait</th></tr></thead>
              <tbody>${intakeRows}</tbody>
            </table>
            ${staleCount > 10 ? `<p style="color:#6b7280;font-size:14px">…and ${staleCount - 10} more. Check the doctor queue.</p>` : ""}
            <p style="margin-top:24px"><a href="https://instantmed.com.au/doctor/queue" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Open Doctor Queue</a></p>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">Sent by stale-queue monitor at ${now.toISOString()}</p>
          </div>
        `,
        tags: [{ name: "category", value: "ops_sla_alert" }],
      }).catch(emailErr => {
        logger.error("Failed to send SLA breach email alert", { error: String(emailErr) })
      })
    } else if (warningIntakes.length > 0) {
      Sentry.captureMessage(`Warning: ${warningIntakes.length} intakes waiting 4+ hours`, {
        level: "warning",
        tags: {
          source: "stale-queue-monitor",
          alert_type: "sla_warning",
        },
        extra: {
          stale_count: staleCount,
          oldest_intakes: waitTimes.slice(0, 5),
        },
      })
      logger.warn("SLA warning - intakes waiting 4+ hours", {
        stale_count: staleCount,
        oldest_wait_hours: waitTimes[0]?.hoursWaiting,
      })
      trackBusinessMetric({
        metric: 'queue_backup',
        severity: 'warning',
        metadata: { stale_count: staleCount, oldest_wait_hours: waitTimes[0]?.hoursWaiting },
      })
    }

    // ── Check for stale in_review intakes (revoked AI certs awaiting manual doctor review) ──
    // When a doctor revokes an AI-approved cert, the intake is moved back to in_review.
    // The stale-paid monitor above doesn't catch these — they need a separate check.
    const { data: staleInReviewIntakes, error: inReviewError, count: inReviewCount } = await supabase
      .from("intakes")
      .select("id, updated_at, category, ai_approved", { count: "exact" })
      .eq("status", "in_review")
      .eq("payment_status", "paid")
      .lt("updated_at", staleThreshold.toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)

    if (inReviewError) {
      logger.error("Failed to query stale in_review intakes", { error: inReviewError.message })
    }

    const staleInReviewCount = inReviewCount ?? staleInReviewIntakes?.length ?? 0

    if (staleInReviewCount > 0) {
      const inReviewDetails = staleInReviewIntakes?.map(i => {
        const updatedAt = new Date(i.updated_at)
        const hoursWaiting = Math.round(((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)) * 10) / 10
        return { id: i.id, category: i.category || "unknown", hoursWaiting, revokedAiCert: i.ai_approved === true }
      }) || []

      const severity = inReviewDetails.some((i) => i.hoursWaiting >= CRITICAL_THRESHOLD_HOURS) ? "error" : "warning"

      Sentry.captureMessage(`${staleInReviewCount} intake(s) stuck in in_review for 4+ hours`, {
        level: severity,
        tags: {
          source: "stale-queue-monitor",
          alert_type: "stale_in_review",
        },
        extra: {
          stale_in_review_count: staleInReviewCount,
          intakes: inReviewDetails.slice(0, 5),
        },
      })
      logger.warn("Intakes stuck in in_review for 4+ hours — likely revoked AI certs awaiting manual review", {
        stale_in_review_count: staleInReviewCount,
        oldest_hours: inReviewDetails[0]?.hoursWaiting,
      })
      trackBusinessMetric({
        metric: "queue_backup",
        severity: severity === "error" ? "critical" : "warning",
        metadata: { stale_in_review_count: staleInReviewCount, oldest_hours: inReviewDetails[0]?.hoursWaiting, alert_type: "stale_in_review" },
      })
    }

    // ── Check for stuck awaiting_script intakes (48h threshold) ──
    const AWAITING_SCRIPT_THRESHOLD_HOURS = 48
    const awaitingScriptThreshold = new Date(now.getTime() - AWAITING_SCRIPT_THRESHOLD_HOURS * 60 * 60 * 1000)

    const { data: stuckScriptIntakes, error: scriptError, count: scriptCount } = await supabase
      .from("intakes")
      .select("id, updated_at, category", { count: "exact" })
      .eq("status", "awaiting_script")
      .lt("updated_at", awaitingScriptThreshold.toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)

    if (scriptError) {
      logger.error("Failed to query stuck awaiting_script intakes", { error: scriptError.message })
    }

    const stuckScriptCount = scriptCount ?? stuckScriptIntakes?.length ?? 0

    if (stuckScriptCount > 0) {
      const stuckScriptDetails = stuckScriptIntakes?.map(i => {
        const updatedAt = new Date(i.updated_at)
        const hoursStuck = Math.round(((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)) * 10) / 10
        return { id: i.id, serviceType: i.category || "unknown", hoursStuck }
      }) || []

      Sentry.captureMessage(`Warning: ${stuckScriptCount} intakes stuck in awaiting_script for 48+ hours`, {
        level: "warning",
        tags: {
          source: "stale-queue-monitor",
          alert_type: "stuck_awaiting_script",
        },
        extra: {
          stuck_count: stuckScriptCount,
          intakes: stuckScriptDetails.slice(0, 5),
        },
      })
      logger.warn("Intakes stuck in awaiting_script for 48+ hours", {
        stuck_count: stuckScriptCount,
        oldest_hours: stuckScriptDetails[0]?.hoursStuck,
      })
      trackBusinessMetric({
        metric: 'stuck_awaiting_script',
        severity: 'warning',
        metadata: { stuck_count: stuckScriptCount, oldest_hours: stuckScriptDetails[0]?.hoursStuck },
      })
    }

    return NextResponse.json({
      success: true,
      stale_count: staleCount,
      critical_count: criticalIntakes.length,
      warning_count: warningIntakes.length,
      oldest_wait_hours: waitTimes[0]?.hoursWaiting,
      stale_in_review_count: staleInReviewCount,
      stuck_awaiting_script_count: stuckScriptCount,
      delay_emails_sent: delayEmailsSent,
      alert_sent: true,
      checked_at: now.toISOString(),
    })
  } catch (error) {
    logger.error("Stale queue monitor failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    
    Sentry.captureException(error, {
      tags: { source: "stale-queue-monitor" },
    })

    return NextResponse.json(
      { error: "Stale queue monitor failed" },
      { status: 500 }
    )
  }
}
