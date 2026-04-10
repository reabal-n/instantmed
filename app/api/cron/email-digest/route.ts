import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { verifyCronRequest } from "@/lib/api/cron-auth"
import { sendViaResend } from "@/lib/email/resend"
import { CONTACT_EMAIL } from "@/lib/constants"
import { toError } from "@/lib/errors"
import * as Sentry from "@sentry/nextjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const logger = createLogger("cron-email-digest")

/**
 * Weekly Email Ops Digest
 *
 * Sends a summary email to support@instantmed.com.au every Monday 08:00 AEST.
 * Covers the last 7 days:
 * - Total sent, delivered, bounced, complained, opened
 * - Delivery rate percentage
 * - Bounced addresses (if any)
 * - Top email types by volume
 *
 * Schedule: `0 22 * * 0` (Sunday 22:00 UTC = Monday 08:00 AEST)
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Parallel count queries for the week
    const [sentRes, failedRes, bouncedRes, complainedRes, deliveredRes, openedRes] = await Promise.all([
      supabase.from("email_outbox").select("id", { count: "exact", head: true }).in("status", ["sent", "skipped_e2e"]).gte("created_at", weekAgo),
      supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", weekAgo),
      supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("delivery_status", "bounced").gte("created_at", weekAgo),
      supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("delivery_status", "complained").gte("created_at", weekAgo),
      supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("delivery_status", "delivered").gte("created_at", weekAgo),
      supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("delivery_status", "opened").gte("created_at", weekAgo),
    ])

    const sent = sentRes.count || 0
    const failed = failedRes.count || 0
    const bounced = bouncedRes.count || 0
    const complained = complainedRes.count || 0
    const delivered = deliveredRes.count || 0
    const opened = openedRes.count || 0
    const total = sent + failed
    const deliveryRate = total > 0 ? ((sent / total) * 100).toFixed(1) : "N/A"

    // Top email types by volume (last 7 days)
    const { data: typeBreakdown } = await supabase
      .from("email_outbox")
      .select("email_type")
      .gte("created_at", weekAgo)
      .not("email_type", "is", null)
      .limit(500)

    const typeCounts: Record<string, number> = {}
    for (const row of typeBreakdown || []) {
      const t = row.email_type || "unknown"
      typeCounts[t] = (typeCounts[t] || 0) + 1
    }
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Bounced addresses this week
    const { data: bouncedAddresses } = await supabase
      .from("email_outbox")
      .select("to_email, error_message")
      .eq("delivery_status", "bounced")
      .gte("created_at", weekAgo)
      .limit(20)

    // Build the digest email
    const weekLabel = `${new Date(weekAgo).toLocaleDateString("en-AU")} – ${now.toLocaleDateString("en-AU")}`

    const typeRows = topTypes
      .map(([type, count]) => `<tr><td style="padding:4px 12px 4px 0;font-size:14px;">${type}</td><td style="padding:4px 0;font-size:14px;text-align:right;">${count}</td></tr>`)
      .join("")

    const bounceRows = (bouncedAddresses || [])
      .map((r) => `<tr><td style="padding:4px 12px 4px 0;font-size:13px;font-family:monospace;">${r.to_email}</td><td style="padding:4px 0;font-size:13px;color:#94A3B8;">${r.error_message || "—"}</td></tr>`)
      .join("")

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1C1917;margin:0;padding:24px;">
<h1 style="font-size:20px;margin:0 0 4px 0;">Weekly Email Digest</h1>
<p style="font-size:14px;color:#78716C;margin:0 0 24px 0;">${weekLabel}</p>

<table style="border-collapse:collapse;margin-bottom:24px;">
  <tr><td style="padding:6px 16px 6px 0;font-size:14px;color:#78716C;">Sent</td><td style="font-size:20px;font-weight:600;">${sent}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-size:14px;color:#78716C;">Failed</td><td style="font-size:20px;font-weight:600;${failed > 0 ? "color:#DC2626;" : ""}">${failed}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-size:14px;color:#78716C;">Delivered</td><td style="font-size:20px;font-weight:600;">${delivered}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-size:14px;color:#78716C;">Bounced</td><td style="font-size:20px;font-weight:600;${bounced > 0 ? "color:#DC2626;" : ""}">${bounced}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-size:14px;color:#78716C;">Complained</td><td style="font-size:20px;font-weight:600;${complained > 0 ? "color:#DC2626;" : ""}">${complained}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-size:14px;color:#78716C;">Opened</td><td style="font-size:20px;font-weight:600;">${opened}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-size:14px;color:#78716C;">Delivery Rate</td><td style="font-size:20px;font-weight:600;">${deliveryRate}%</td></tr>
</table>

${topTypes.length > 0 ? `<h2 style="font-size:16px;margin:0 0 8px 0;">Top Email Types</h2>
<table style="border-collapse:collapse;margin-bottom:24px;">${typeRows}</table>` : ""}

${(bouncedAddresses || []).length > 0 ? `<h2 style="font-size:16px;margin:0 0 8px 0;">Bounced Addresses</h2>
<table style="border-collapse:collapse;margin-bottom:24px;">${bounceRows}</table>` : "<p style='font-size:14px;color:#22C55E;margin-bottom:24px;'>No bounces this week.</p>"}

<p style="font-size:12px;color:#A8A29E;">Automated digest from InstantMed email system. <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"}/doctor/email-suppression">View suppression list</a></p>
</body></html>`

    await sendViaResend({
      to: CONTACT_EMAIL,
      subject: `Email Digest: ${sent} sent, ${deliveryRate}% delivered (${weekLabel})`,
      html,
      tags: [{ name: "category", value: "email_digest" }],
    })

    logger.info("Weekly email digest sent", { sent, failed, bounced, complained, delivered, opened })

    return NextResponse.json({
      success: true,
      stats: { sent, failed, bounced, complained, delivered, opened, deliveryRate },
    })
  } catch (error) {
    logger.error("Failed to send email digest", {}, toError(error))
    Sentry.captureException(error, { tags: { source: "cron-email-digest" } })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
