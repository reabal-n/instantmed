import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { CONTACT_EMAIL, CONTACT_EMAIL_NOREPLY } from "@/lib/constants"
import { getDuplicatePatientProfileSummary } from "@/lib/doctor/patient-identity-report"
import { sendViaResend } from "@/lib/email/resend"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-daily-digest")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Daily ops digest.
 *
 * One email per day at 23:00 UTC (9am AEST / 10am AEDT during Sydney DST).
 * Recipient(s) pulled from `ADMIN_EMAILS` env var (comma-separated), falling
 * back to CONTACT_EMAIL.
 *
 * Contents:
 *   - Revenue + order count last 24h
 *   - Funnel counts (new patients, paid, approved, declined)
 *   - Avg review time (paid -> approved)
 *   - Service-type breakdown
 *   - Needs-attention list (stuck intakes, disputes, SLA breaches)
 *   - Simple health summary
 *
 * Replaces the habit of logging into Stripe / Supabase / PostHog / Vercel
 * every morning. Non-urgent alerts should land here rather than in Telegram.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  const start = Date.now()
  const supabase = createServiceRoleClient()

  try {
    const now = new Date()
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // ─── Intake counts by status (last 24h) ──────────────────────────────────
    const { data: recentIntakes } = await supabase
      .from("intakes")
      .select("id, status, service_type, created_at, payment_status")
      .gte("created_at", since.toISOString())

    const byStatus = {
      paid: 0,
      in_review: 0,
      approved: 0,
      declined: 0,
      pending_info: 0,
      escalated: 0,
    }
    const byService: Record<string, number> = {}
    for (const intake of recentIntakes ?? []) {
      const s = intake.status as keyof typeof byStatus
      if (s in byStatus) byStatus[s]++
      const svc = intake.service_type ?? "unknown"
      byService[svc] = (byService[svc] ?? 0) + 1
    }
    const paidCount = (recentIntakes ?? []).filter(i => i.payment_status === "paid").length

    // ─── New patients (profiles created in last 24h) ─────────────────────────
    const { count: newPatients } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString())

    // ─── Avg review time (paid -> approved in last 24h) ──────────────────────
    const { data: reviewTimes } = await supabase
      .from("intake_status_history")
      .select("intake_id, new_status, old_status, created_at")
      .eq("new_status", "approved")
      .gte("created_at", since.toISOString())
      .limit(200)

    let avgReviewMinutes: number | null = null
    if (reviewTimes && reviewTimes.length > 0) {
      const intakeIds = reviewTimes.map(r => r.intake_id)
      const { data: paidEvents } = await supabase
        .from("intake_status_history")
        .select("intake_id, new_status, created_at")
        .in("intake_id", intakeIds)
        .eq("new_status", "paid")
      const paidMap = new Map(paidEvents?.map(p => [p.intake_id, new Date(p.created_at).getTime()]) ?? [])
      const deltas = reviewTimes
        .map(r => {
          const paidAt = paidMap.get(r.intake_id)
          if (!paidAt) return null
          return (new Date(r.created_at).getTime() - paidAt) / 60000
        })
        .filter((d): d is number => d !== null && d > 0 && d < 24 * 60)
      if (deltas.length > 0) {
        avgReviewMinutes = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
      }
    }

    // ─── Revenue last 24h (Stripe) ───────────────────────────────────────────
    let revenueCents = 0
    let revenueCount = 0
    try {
      const since24hSeconds = Math.floor(since.getTime() / 1000)
      const charges = await stripe.charges.list({
        created: { gte: since24hSeconds },
        limit: 100,
      })
      for (const charge of charges.data) {
        if (charge.paid && !charge.refunded && charge.status === "succeeded") {
          revenueCents += charge.amount
          revenueCount++
        }
      }
    } catch (err) {
      logger.warn("stripe_charge_list_failed", { err: String(err) })
    }

    // ─── 7-day rolling funnel ────────────────────────────────────────────────
    const { count: weekSubmitted } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString())
    const { count: weekPaid } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .gte("created_at", sevenDaysAgo.toISOString())

    const conversionRate = weekSubmitted && weekSubmitted > 0
      ? Math.round(((weekPaid ?? 0) / weekSubmitted) * 1000) / 10
      : null

    // ─── Needs attention ─────────────────────────────────────────────────────
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000)
    const { count: stuckPaid } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .lt("created_at", eightHoursAgo.toISOString())

    const { count: highRiskWaiting } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review"])
      .in("risk_tier", ["high", "critical"])

    let openDisputes = 0
    try {
      const disputes = await stripe.disputes.list({ limit: 20 })
      openDisputes = disputes.data.filter(d =>
        d.status === "warning_needs_response" || d.status === "needs_response"
      ).length
    } catch (err) {
      logger.warn("stripe_dispute_list_failed", { err: String(err) })
    }

    // Stripe webhook DLQ — stale items older than 24h. The dlq-monitor cron
    // only Sentry-alerts at 5+ items (emergency only); everything smaller is
    // surfaced here so the founder sees drift without getting paged.
    const dlqThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const { count: dlqStale } = await supabase
      .from("stripe_webhook_dead_letter")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null)
      .lt("created_at", dlqThreshold.toISOString())

    const patientIdentity = await getDuplicatePatientProfileSummary(supabase)

    // ─── Recipients ──────────────────────────────────────────────────────────
    // Priority: DIGEST_EMAIL_RECIPIENT (founder digest only) → ADMIN_EMAILS
    // (general admin distro list) → CONTACT_EMAIL (last-resort fallback).
    // We keep these separate so operational admin alerts and the founder's
    // morning digest can route to different inboxes.
    const digestOverride = process.env.DIGEST_EMAIL_RECIPIENT
    const adminEmailsEnv = process.env.ADMIN_EMAILS
    const rawRecipients = digestOverride
      ? digestOverride.split(",").map(s => s.trim()).filter(Boolean)
      : (adminEmailsEnv
        ? adminEmailsEnv.split(",").map(s => s.trim()).filter(Boolean)
        : [CONTACT_EMAIL])
    const recipients = rawRecipients.filter(e => /^.+@.+\..+$/.test(e))

    if (recipients.length === 0) {
      logger.warn("daily_digest_no_recipients")
      return NextResponse.json({ ok: false, reason: "no_recipients" })
    }

    // ─── Compose email ───────────────────────────────────────────────────────
    const today = now.toLocaleDateString("en-AU", {
      timeZone: "Australia/Sydney",
      weekday: "long",
      day: "numeric",
      month: "short",
    })
    const revenueDisplay = revenueCents > 0 ? `$${(revenueCents / 100).toFixed(2)}` : "$0"

    const serviceRows = Object.entries(byService)
      .sort((a, b) => b[1] - a[1])
      .map(([svc, n]) => `<li style="margin:0;padding:0">${svc}: <strong>${n}</strong></li>`)
      .join("")

    const attentionItems: string[] = []
    if ((stuckPaid ?? 0) > 0) attentionItems.push(`${stuckPaid} intake${stuckPaid === 1 ? "" : "s"} stuck in 'paid' &gt;8h`)
    if ((highRiskWaiting ?? 0) > 0) attentionItems.push(`${highRiskWaiting} high/critical risk intake${highRiskWaiting === 1 ? "" : "s"} in queue`)
    if (openDisputes > 0) attentionItems.push(`${openDisputes} open Stripe dispute${openDisputes === 1 ? "" : "s"}`)
    if ((dlqStale ?? 0) > 0) attentionItems.push(`${dlqStale} Stripe webhook${dlqStale === 1 ? "" : "s"} in DLQ &gt;24h`)
    if (patientIdentity.duplicateProfileCount > 0) {
      attentionItems.push(`${patientIdentity.duplicateProfileCount} duplicate patient profile${patientIdentity.duplicateProfileCount === 1 ? "" : "s"} across ${patientIdentity.duplicateGroupCount} identity group${patientIdentity.duplicateGroupCount === 1 ? "" : "s"}`)
    }

    const attentionHtml = attentionItems.length > 0
      ? `<ul style="margin:4px 0 0 0;padding-left:18px;color:#b91c1c">${attentionItems.map(i => `<li>${i}</li>`).join("")}</ul>`
      : `<p style="margin:4px 0 0 0;color:#16a34a;font-weight:500">All clear ✓</p>`

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Overnight · InstantMed · ${today}</title></head>
<body style="margin:0;padding:24px;background:#f8f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid rgba(2,132,199,0.08);overflow:hidden">

    <div style="padding:24px 28px 12px 28px;border-bottom:1px solid rgba(0,0,0,0.04)">
      <div style="font-size:12px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase">Overnight · ${today}</div>
      <div style="font-size:22px;font-weight:600;margin-top:4px">${revenueDisplay} · ${revenueCount} order${revenueCount === 1 ? "" : "s"}</div>
    </div>

    <div style="padding:20px 28px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr>
          <td style="padding:8px 0;color:#64748b">💰 Revenue (24h)</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${revenueDisplay}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">📬 Paid orders (24h)</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${paidCount}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">✅ Approved</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${byStatus.approved}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">❌ Declined</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${byStatus.declined}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">⏱ Avg review time</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${avgReviewMinutes !== null ? `${avgReviewMinutes} min` : "—"}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">👥 New patients</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${newPatients ?? 0}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b">🧾 Duplicate profiles</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${patientIdentity.duplicateProfileCount}</td>
        </tr>
      </table>
    </div>

    ${serviceRows ? `
    <div style="padding:4px 28px 20px 28px">
      <div style="font-size:13px;color:#64748b;margin-bottom:8px">By service</div>
      <ul style="margin:0;padding-left:18px;list-style:disc;font-size:14px;line-height:1.8">${serviceRows}</ul>
    </div>
    ` : ""}

    <div style="padding:4px 28px 20px 28px;border-top:1px solid rgba(0,0,0,0.04)">
      <div style="font-size:13px;color:#64748b;margin-bottom:4px">🚨 Needs attention</div>
      ${attentionHtml}
    </div>

    <div style="padding:4px 28px 20px 28px;border-top:1px solid rgba(0,0,0,0.04)">
      <div style="font-size:13px;color:#64748b;margin-bottom:8px">📈 Funnel (7 days)</div>
      <div style="font-size:14px;line-height:1.8">
        Submitted: <strong>${weekSubmitted ?? 0}</strong>
        &nbsp;·&nbsp; Paid: <strong>${weekPaid ?? 0}</strong>
        ${conversionRate !== null ? `&nbsp;·&nbsp; Conv: <strong>${conversionRate}%</strong>` : ""}
      </div>
    </div>

    <div style="padding:14px 28px;background:rgba(2,132,199,0.04);border-top:1px solid rgba(0,0,0,0.04);font-size:12px;color:#64748b;text-align:center">
      <a href="https://instantmed.com.au/admin" style="color:#0284c7;text-decoration:none">Open admin</a>
      &nbsp;·&nbsp;
      <a href="https://us.posthog.com/project/277439/dashboard/1491397" style="color:#0284c7;text-decoration:none">CWV dashboard</a>
      &nbsp;·&nbsp;
      <a href="https://dashboard.stripe.com/dashboard" style="color:#0284c7;text-decoration:none">Stripe</a>
    </div>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">InstantMed ops digest · ${now.toISOString()}</p>
</body>
</html>`

    const plainText = [
      `Overnight · InstantMed · ${today}`,
      "",
      `Revenue (24h):   ${revenueDisplay}`,
      `Paid orders:     ${paidCount}`,
      `Approved:        ${byStatus.approved}`,
      `Declined:        ${byStatus.declined}`,
      `Avg review:      ${avgReviewMinutes !== null ? `${avgReviewMinutes} min` : "—"}`,
      `New patients:    ${newPatients ?? 0}`,
      `Dup profiles:    ${patientIdentity.duplicateProfileCount} (${patientIdentity.uniqueProfileCount} unique / ${patientIdentity.rawProfileCount} raw)`,
      "",
      `By service:      ${Object.entries(byService).map(([s, n]) => `${s}=${n}`).join(", ") || "—"}`,
      "",
      `Needs attention:`,
      ...(attentionItems.length ? attentionItems.map(i => `  · ${i}`) : ["  all clear"]),
      "",
      `7-day funnel:    submitted=${weekSubmitted ?? 0}, paid=${weekPaid ?? 0}${conversionRate !== null ? `, conv=${conversionRate}%` : ""}`,
      "",
      `Admin: https://instantmed.com.au/admin`,
    ].join("\n")

    // ─── Send ────────────────────────────────────────────────────────────────
    const subject = `Overnight · ${revenueDisplay} · ${paidCount} order${paidCount === 1 ? "" : "s"}${attentionItems.length ? ` · ${attentionItems.length} ⚠️` : ""}`

    const results = await Promise.allSettled(
      recipients.map(to =>
        sendViaResend({
          to,
          subject,
          html,
          text: plainText,
          from: `InstantMed Ops <${CONTACT_EMAIL_NOREPLY}>`,
        })
      )
    )

    const sent = results.filter(r => r.status === "fulfilled" && r.value.success).length
    const failed = results.length - sent

    logger.info("daily_digest_sent", {
      sent,
      failed,
      recipients: recipients.length,
      revenueCents,
      paidCount,
      attentionCount: attentionItems.length,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      revenueCents,
      paidCount,
      attentionItems: attentionItems.length,
    })
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err))
    captureCronError(e, { jobName: "daily-digest" })
    Sentry.captureException(e, { tags: { cron: "daily-digest" } })
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
