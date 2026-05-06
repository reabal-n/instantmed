import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const opsPageSource = readFileSync(
  join(process.cwd(), "app/admin/ops/page.tsx"),
  "utf8",
)
const adminHubZonesSource = readFileSync(
  join(process.cwd(), "components/admin/admin-hub-zones.tsx"),
  "utf8",
)
const adminSidebarSource = readFileSync(
  join(process.cwd(), "components/admin/admin-sidebar.tsx"),
  "utf8",
)
const opsClientSource = readFileSync(
  join(process.cwd(), "app/admin/ops/ops-client.tsx"),
  "utf8",
)
const telegramOpsActionsSource = readFileSync(
  join(process.cwd(), "app/actions/telegram-ops.ts"),
  "utf8",
)
const emailOpsActionsSource = readFileSync(
  join(process.cwd(), "app/actions/email-ops.ts"),
  "utf8",
)
const telegramNotificationsSource = readFileSync(
  join(process.cwd(), "lib/notifications/telegram.ts"),
  "utf8",
)
const opsTestEmailSource = readFileSync(
  join(process.cwd(), "lib/email/components/templates/ops-test.tsx"),
  "utf8",
)
const emailHubClientSource = readFileSync(
  join(process.cwd(), "app/admin/emails/hub/email-hub-client.tsx"),
  "utf8",
)
const emailHubPageSource = readFileSync(
  join(process.cwd(), "app/admin/emails/hub/page.tsx"),
  "utf8",
)
const emailSendTypesSource = readFileSync(
  join(process.cwd(), "lib/email/send/types.ts"),
  "utf8",
)
const emailReconstructSource = readFileSync(
  join(process.cwd(), "lib/email/send/reconstruct.ts"),
  "utf8",
)
const legacyWebhooksPageSource = readFileSync(
  join(process.cwd(), "app/admin/webhooks/page.tsx"),
  "utf8",
)
const dashboardRoutesSource = readFileSync(
  join(process.cwd(), "lib/dashboard/routes.ts"),
  "utf8",
)

describe("ops dashboard data contract", () => {
  it("reads the real Stripe webhook dead-letter table", () => {
    expect(opsPageSource).toContain('.from("stripe_webhook_dead_letter")')
    expect(opsPageSource).not.toContain('.from("webhook_dlq")')
  })

  it("uses paid_at, not created_at, for stale paid intake monitoring", () => {
    expect(opsPageSource).toContain('.lt("paid_at"')
    expect(opsPageSource).not.toContain('.lt("created_at"')
  })

  it("surfaces durable webhook_failed audit events in ops recent errors", () => {
    expect(opsPageSource).toContain('action.ilike.%error%,action.eq.webhook_failed')
    expect(opsPageSource.indexOf('action.ilike.%error%,action.eq.webhook_failed')).toBeLessThan(
      opsPageSource.indexOf('.gte("created_at", weekAgo.toISOString())'),
    )
    expect(opsPageSource).toContain("filterNonActionableOpsErrors")
    expect(opsPageSource).toContain("no_awaiting_script_intake")
  })

  it("does not render a second navigation menu at the bottom of ops", () => {
    expect(opsClientSource).not.toContain("opsActionGroups")
    expect(opsClientSource).not.toContain("Recovery Paths")
    expect(opsClientSource).not.toContain("Clinical ops")
    expect(opsClientSource).not.toContain("Integration recovery")
    expect(opsClientSource).not.toContain("Audit and identity")
  })

  it("keeps webhook recovery on the canonical Stripe DLQ surface", () => {
    expect(adminHubZonesSource).toContain("ADMIN_WEBHOOK_DLQ_HREF")
    expect(dashboardRoutesSource).toContain('ADMIN_WEBHOOK_DLQ_HREF = "/admin/webhook-dlq"')
    expect(opsClientSource).toContain("ADMIN_WEBHOOK_DLQ_HREF")
    expect(adminHubZonesSource).not.toContain('href: "/admin/webhooks"')
    expect(adminSidebarSource).not.toContain('href: "/admin/webhooks"')
    expect(adminSidebarSource).not.toContain('href: "/admin/webhook-dlq"')

    expect(legacyWebhooksPageSource).toContain('redirect("/admin/webhook-dlq")')
    expect(legacyWebhooksPageSource).not.toContain('.from("webhook_events")')
    expect(legacyWebhooksPageSource).not.toContain('.from("webhook_dlq")')
  })

  it("surfaces Telegram alert configuration without exposing secret values", () => {
    expect(opsPageSource).toContain("getMissingTelegramAlertEnv")
    expect(opsPageSource).toContain("telegramAlertsHealthy")
    expect(opsClientSource).toContain("Telegram alerts")
    expect(opsClientSource).toContain("missingTelegramVars")
    expect(opsClientSource).not.toContain("process.env.TELEGRAM_BOT_TOKEN")
    expect(opsClientSource).not.toContain("process.env.TELEGRAM_CHAT_ID")
  })

  it("lets admins send an audited Telegram test alert from ops", () => {
    expect(opsClientSource).toContain("sendTelegramTestAlertAction")
    expect(opsClientSource).toContain("Live alert check")
    expect(opsClientSource).toContain("Send test")
    expect(opsClientSource).toContain("Telegram test alert sent")

    expect(telegramOpsActionsSource).toContain('requireRoleOrNull(["admin"])')
    expect(telegramOpsActionsSource).toContain("checkServerActionRateLimit")
    expect(telegramOpsActionsSource).toContain("getMissingTelegramAlertEnv")
    expect(telegramOpsActionsSource).toContain("sendTelegramTestAlert")
    expect(telegramOpsActionsSource).toContain("logAuditEvent")
    expect(telegramOpsActionsSource).toContain('action_type: "telegram_test_alert"')
    expect(telegramOpsActionsSource).toContain('status: "blocked"')
    expect(telegramOpsActionsSource).toContain('status: "sent"')
    expect(telegramOpsActionsSource).toContain('status: "failed"')
  })

  it("keeps the Telegram test helper operational and PHI-minimal", () => {
    const functionStart = telegramNotificationsSource.indexOf("export async function sendTelegramTestAlert")
    const functionSource = telegramNotificationsSource.slice(functionStart)

    expect(functionStart).toBeGreaterThan(0)
    expect(functionSource).toContain("InstantMed ops test alert")
    expect(functionSource).toContain("message_id")
    expect(functionSource).toContain("Telegram test alert failed")
    expect(functionSource).not.toContain("patientName")
    expect(functionSource).not.toContain("intakeId")
  })

  it("lets admins send an audited PHI-free email delivery test", () => {
    expect(opsClientSource).toContain("sendOpsTestEmailAction")
    expect(opsClientSource).toContain("Live email check")
    expect(opsClientSource).toContain("Test email sent")
    expect(emailHubClientSource).toContain("sendOpsTestEmailAction")
    expect(emailHubClientSource).toContain("Send test")

    expect(emailOpsActionsSource).toContain('requireRoleOrNull(["admin"])')
    expect(emailOpsActionsSource).toContain("checkServerActionRateLimit")
    expect(emailOpsActionsSource).toContain("sendEmail")
    expect(emailOpsActionsSource).toContain('emailType: "ops_test"')
    expect(emailOpsActionsSource).toContain("logAuditEvent")
    expect(emailOpsActionsSource).toContain('action_type: "ops_test_email"')
    expect(emailOpsActionsSource).toContain('status: "blocked"')
    expect(emailOpsActionsSource).toContain('result.success ? "sent" : "failed"')
    expect(emailOpsActionsSource).toContain('status: "failed"')

    expect(opsTestEmailSource).toContain("InstantMed email delivery test")
    expect(opsTestEmailSource).toContain("PHI-free")
    expect(opsTestEmailSource).not.toContain("patientName")
    expect(opsTestEmailSource).not.toContain("intakeId")
  })

  it("keeps ops test emails reconstructable from the outbox", () => {
    expect(emailSendTypesSource).toContain('"ops_test"')
    expect(emailReconstructSource).toContain('row.email_type === "ops_test"')
    expect(emailReconstructSource).toContain("OpsTestEmail")
    expect(emailReconstructSource).toContain("metadata?.event_id")
  })

  it("surfaces outgoing email status and recovery actions in admin", () => {
    expect(emailHubPageSource).toContain("getEmailOutboxList")
    expect(emailHubPageSource).toContain("outboxRows")
    expect(emailHubClientSource).toContain("Outgoing email ledger")
    expect(emailHubClientSource).toContain("EmailStatusPill")
    expect(emailHubClientSource).toContain("retryOutboxEmail")
    expect(emailHubClientSource).toContain('params.set("tab", "queue")')
    expect(opsClientSource).toContain("Outgoing emails")
    expect(opsClientSource).toContain("Production health timeline")
    expect(opsClientSource).toContain("Recovery palette")
    expect(opsClientSource).toContain("ADMIN_PARCHMENT_OPS_HREF")
  })
})
