import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const opsPageSource = readFileSync(
  join(process.cwd(), "app/admin/ops/page.tsx"),
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
const operatorPageSource = readFileSync(
  join(process.cwd(), "components/operator/operator-page.tsx"),
  "utf8",
)
const parchmentOpsPageSource = readFileSync(
  join(process.cwd(), "app/admin/ops/parchment/page.tsx"),
  "utf8",
)
const prescribingIdentityOpsPageSource = readFileSync(
  join(process.cwd(), "app/admin/ops/prescribing-identity/page.tsx"),
  "utf8",
)
const patientMergeAuditPageSource = readFileSync(
  join(process.cwd(), "app/admin/ops/patient-merge-audit/page.tsx"),
  "utf8",
)
const stuckIntakesClientSource = readFileSync(
  join(process.cwd(), "components/shared/ops/intakes-stuck-client.tsx"),
  "utf8",
)
const reconciliationClientSource = readFileSync(
  join(process.cwd(), "components/shared/ops/reconciliation-client.tsx"),
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
const nextConfigSource = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8")
const dashboardRoutesSource = readFileSync(
  join(process.cwd(), "lib/dashboard/routes.ts"),
  "utf8",
)
const opsFailuresSource = readFileSync(
  join(process.cwd(), "lib/admin/ops-failures.ts"),
  "utf8",
)
const refundsPageSource = readFileSync(
  join(process.cwd(), "app/admin/refunds/page.tsx"),
  "utf8",
)
const refundsClientSource = readFileSync(
  join(process.cwd(), "app/admin/refunds/refunds-client.tsx"),
  "utf8",
)
const adminIntakeDetailSource = readFileSync(
  join(process.cwd(), "app/admin/intakes/[id]/page.tsx"),
  "utf8",
)
const patientMessagesDataSource = readFileSync(
  join(process.cwd(), "lib/data/patient-messages.ts"),
  "utf8",
)

describe("ops dashboard data contract", () => {
  it("renders ops screens inside the shared operator workspace", () => {
    expect(operatorPageSource).toContain("data-testid=\"operator-page\"")
    expect(operatorPageSource).toContain("data-testid=\"operator-scroll-area\"")
    expect(operatorPageSource).toContain("lg:h-[calc(100vh-4rem)]")

    const opsSurfaceSources = [
      opsClientSource,
      parchmentOpsPageSource,
      prescribingIdentityOpsPageSource,
      patientMergeAuditPageSource,
      stuckIntakesClientSource,
      reconciliationClientSource,
    ]

    for (const source of opsSurfaceSources) {
      expect(source).toContain("OperatorPage")
      expect(source).toContain("OperatorPageHeader")
      expect(source).toContain("OperatorScrollArea")
    }

    expect(opsClientSource).toContain('title="Operations"')
    expect(opsClientSource).not.toContain('title="Operations Dashboard"')
    expect(opsClientSource).not.toContain("p-6 space-y-6")
  })

  it("reads the real Stripe webhook dead-letter table", () => {
    expect(opsPageSource).toContain('.from("stripe_webhook_dead_letter")')
    expect(opsPageSource).not.toContain('.from("webhook_dlq")')
  })

  it("surfaces durable webhook_failed audit events in ops recent errors", () => {
    expect(opsPageSource).toContain('.eq("action", "webhook_failed")')
    expect(opsPageSource).toContain("isNonActionableParchmentSandboxError")
    expect(opsPageSource).toContain("no_awaiting_script_intake")
  })

  it("excludes ALL external patient_not_found webhooks from the prescription-delivery count + feed", () => {
    // patient_not_found = no InstantMed profile matched (the doctor's non-InstantMed
    // Parchment scripts). They must not inflate the Parchment-unsynced counter or the
    // recent feed, regardless of the sandbox sentinel.
    expect(opsPageSource).toContain('if (error === "patient_not_found") return true')
  })

  it("uses honest counter + feed labels (Stripe-scoped DLQ, 7-day recent window)", () => {
    expect(opsClientSource).toContain('label="Stripe webhook DLQ"')
    expect(opsClientSource).toContain("Recent (7 days)")
    expect(opsClientSource).not.toContain('label="Webhook DLQ"')
    expect(opsClientSource).not.toContain("Recent (last 24h)")
  })

  it("does not render a second navigation menu at the bottom of ops", () => {
    expect(opsClientSource).not.toContain("opsActionGroups")
    expect(opsClientSource).not.toContain("Recovery Paths")
    expect(opsClientSource).not.toContain("Clinical ops")
    expect(opsClientSource).not.toContain("Integration recovery")
    expect(opsClientSource).not.toContain("Audit and identity")
  })

  it("keeps Parchment ops focused on recovery instead of a metrics wall", () => {
    expect(parchmentOpsPageSource).toContain("Actionable failures")
    expect(parchmentOpsPageSource).toContain("Only webhooks that still need staff attention")
    expect(parchmentOpsPageSource).toContain("Production prescribing gate")
    expect(parchmentOpsPageSource).toContain("More evidence")
    expect(parchmentOpsPageSource).not.toContain("StatCard")
    expect(parchmentOpsPageSource).not.toContain("syncedPrescriptions7d")
  })

  it("keeps webhook recovery on the canonical Stripe DLQ surface", () => {
    expect(dashboardRoutesSource).toContain('ADMIN_WEBHOOK_DLQ_HREF = "/admin/webhook-dlq"')
    expect(opsPageSource).toContain("ADMIN_WEBHOOK_DLQ_HREF")
    expect(adminSidebarSource).not.toContain('href: "/admin/webhooks"')
    expect(adminSidebarSource).not.toContain('href: "/admin/webhook-dlq"')

    expect(nextConfigSource).toContain('source: "/admin/webhooks"')
    expect(nextConfigSource).toContain('destination: "/admin/webhook-dlq"')
    expect(nextConfigSource).not.toContain('.from("webhook_events")')
    expect(nextConfigSource).not.toContain('.from("webhook_dlq")')
  })

  it("lets admins send an audited Telegram test alert from ops", () => {
    expect(opsClientSource).not.toContain("sendTelegramTestAlertAction")
    expect(opsClientSource).not.toContain("Live alert check")
    expect(opsClientSource).not.toContain("Telegram test alert sent")

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
    expect(opsClientSource).not.toContain("sendOpsTestEmailAction")
    expect(opsClientSource).not.toContain("Live email check")
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
    expect(emailHubClientSource).toContain("OperatorPage")
    expect(emailHubClientSource).toContain("OperatorScrollArea")
    expect(emailHubClientSource).toContain("Outgoing email ledger")
    expect(emailHubClientSource).toContain("EmailStatusPill")
    expect(emailHubClientSource).toContain("retryOutboxEmail")
    expect(emailHubClientSource).toContain('params.set("tab", "queue")')
    expect(opsClientSource).not.toContain("Outgoing emails")
    expect(opsClientSource).not.toContain("Production health timeline")
    expect(opsClientSource).not.toContain("Recovery palette")
  })

  it("surfaces certificate timestamp drift as a compact ops invariant linked to the rescue panel", () => {
    expect(opsPageSource).toContain("certificateSentMissingTimestampHelper")
    expect(opsPageSource).toContain("certificateSentMissingTimestamp")
    expect(opsPageSource).toContain("#certificate-delivery-rescue")

    expect(opsClientSource).toContain('id="certificate-delivery-rescue"')
    expect(opsClientSource).toContain('label="Cert timestamp drift"')
    expect(opsClientSource).toContain("invariants.certificateSentMissingTimestamp")
  })

  it("keeps core ops pages as recovery rows instead of dense tables", () => {
    expect(opsClientSource).not.toContain("StaffCommandPalette")
    expect(opsClientSource).not.toContain("OpsCommandPalette")

    expect(stuckIntakesClientSource).toContain('data-testid="stuck-intakes-task-list"')
    expect(stuckIntakesClientSource).toContain("Summary chips")
    expect(stuckIntakesClientSource).toContain("<details")
    expect(stuckIntakesClientSource).toContain("SLA thresholds")
    expect(stuckIntakesClientSource).not.toContain("<Table")
    expect(stuckIntakesClientSource).not.toContain("stuck-intakes-table")

    expect(reconciliationClientSource).toContain('data-testid="reconciliation-task-list"')
    expect(reconciliationClientSource).toContain("Summary chips")
    expect(reconciliationClientSource).toContain("<details")
    expect(reconciliationClientSource).toContain("Delivery status guide")
    expect(reconciliationClientSource).not.toContain("<Table")
    expect(reconciliationClientSource).not.toContain("reconciliation-table")

    expect(nextConfigSource).toContain('source: "/admin/ops/doctors"')
    expect(nextConfigSource).toContain('destination: "/admin/doctors"')
    expect(nextConfigSource).toContain('source: "/admin/ops/sla"')
    expect(nextConfigSource).toContain('destination: "/admin/analytics"')
  })

  it("surfaces failed refunds in ops without adding a broad finance dashboard", () => {
    expect(opsPageSource).toContain("refundFailuresResult")
    expect(opsPageSource).toContain('.eq("refund_status", "failed")')
    expect(opsFailuresSource).toContain("refund_failures")
    expect(opsFailuresSource).toContain("Refund failures")
    expect(refundsPageSource).toContain("initialStatusFilter")
    expect(refundsClientSource).toContain("Refund work")
    expect(refundsClientSource).toContain("Only showing failed refund rows")
    expect(refundsClientSource).toContain("Open intake")
    expect(refundsClientSource).toContain("selectedPayment.intake?.id")
    expect(refundsClientSource).toContain('selectedPayment.refund_status === "failed"')
  })

  it("keeps auth recovery health inside compact email controls", () => {
    expect(emailHubClientSource).toContain("Email delivery controls")
    expect(emailHubClientSource).toContain("Auth recovery")
    expect(emailHubClientSource).toContain("Verification preview")
    expect(emailHubClientSource).toContain("Magic-link preview")
    expect(emailHubClientSource).not.toContain("Auth email hook")
  })

  it("keeps noisy doctor dashboard toast controls off the simplified ops dashboard", () => {
    expect(opsClientSource).not.toContain("Doctor dashboard toasts")
    expect(opsClientSource).not.toContain("new requests only")
    expect(opsClientSource).not.toContain("All doctor toasts")
  })

  it("lets admin copy an operations-safe request summary from intake detail", () => {
    expect(adminIntakeDetailSource).toContain("AdminRequestSummaryButton")
    expect(adminIntakeDetailSource).toContain("Copy summary")
    expect(adminIntakeDetailSource).toContain("Operator request summary")
    expect(adminIntakeDetailSource).not.toContain("copy full clinical answers")
  })

  it("uses the compact operator intake detail instead of a duplicate admin detail page", () => {
    expect(adminIntakeDetailSource).toContain("IntakeDetailClient")
    expect(adminIntakeDetailSource).toContain("PanelProvider")
    expect(adminIntakeDetailSource).toContain("compact")
    expect(adminIntakeDetailSource).toContain("backLabel=\"Back to work\"")
    expect(adminIntakeDetailSource).toContain("getPatientMessagesForIntake(id)")
    expect(adminIntakeDetailSource).not.toContain("Recent events")
    expect(adminIntakeDetailSource).not.toContain("Payment, refund, and message signals only")
    expect(adminIntakeDetailSource).not.toContain("message.content")
    expect(patientMessagesDataSource).toContain('direction: "asc" | "desc" = "asc"')
  })
})
