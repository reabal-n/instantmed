import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { buildEmailOutboxIdempotencyKey,DB_IDEMPOTENT_EMAIL_TYPES } from "@/lib/email/send/idempotency"
import { EMAIL_SEQUENCES } from "@/lib/email/sequence-registry"

const partialRecoverySource = readFileSync(
  join(process.cwd(), "lib/email/partial-intake-recovery.ts"),
  "utf8",
)
const abandonedCheckoutSource = readFileSync(
  join(process.cwd(), "lib/email/abandoned-checkout.ts"),
  "utf8",
)
const sendEmailSource = readFileSync(
  join(process.cwd(), "lib/email/send-email.ts"),
  "utf8",
)
const outboxSource = readFileSync(
  join(process.cwd(), "lib/email/send/outbox.ts"),
  "utf8",
)
const htmlOutboxSource = readFileSync(
  join(process.cwd(), "lib/email/send/html-outbox.ts"),
  "utf8",
)
const idempotencyMigrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260513161000_email_outbox_idempotency_key.sql"),
  "utf8",
)
const emailHubSource = readFileSync(
  join(process.cwd(), "app/admin/emails/hub/email-hub-client.tsx"),
  "utf8",
)
const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as {
  crons: Array<{ path: string; schedule: string }>
}

describe("email sequence ownership contract", () => {
  it("keeps pre-checkout draft recovery separate from payment-stage abandoned checkout", () => {
    expect(partialRecoverySource).toContain('const PAYMENT_STAGE_DRAFT_STEPS = ["review", "checkout"] as const')
    expect(partialRecoverySource).toContain('.not("current_step_id", "in"')
    expect(partialRecoverySource).toContain('emailType: "partial_intake_recovery"')
    expect(partialRecoverySource).not.toContain('emailType: "abandoned_checkout"')

    expect(abandonedCheckoutSource).toContain('.eq("status", "pending_payment")')
    expect(abandonedCheckoutSource).toContain('emailType: "abandoned_checkout"')
    expect(abandonedCheckoutSource).toContain('emailType: "abandoned_checkout_followup"')
  })

  it("does not schedule the two recovery sequences at the exact same minute", () => {
    const schedules = new Map(vercelConfig.crons.map((cron) => [cron.path, cron.schedule]))

    expect(schedules.get("/api/cron/abandoned-checkouts")).toBe("0 * * * *")
    expect(schedules.get("/api/cron/recover-partial-intakes")).toBe("15 * * * *")
  })

  it("prevents abandoned checkout followup from becoming eligible in the same cron run as the first nudge", () => {
    expect(abandonedCheckoutSource).toContain('.gte("abandoned_email_sent_at", seventyTwoHoursAgo)')
    expect(abandonedCheckoutSource).toContain('.lte("abandoned_email_sent_at", twentyFourHoursAgo)')
    expect(abandonedCheckoutSource).toContain("prevents a boundary case")
  })

  it("suppresses duplicate sends once the outbox idempotency guard finds a matching row", () => {
    expect(outboxSource).toContain("duplicate: true")
    expect(sendEmailSource).toContain("Duplicate send suppressed by outbox guard")
    expect(sendEmailSource).toContain("Sentry.addBreadcrumb")
    expect(htmlOutboxSource).toContain("Duplicate HTML send suppressed by outbox guard")
    expect(htmlOutboxSource).toContain("Sentry.addBreadcrumb")
    expect(sendEmailSource).toContain("outboxResult.duplicate")
    expect(sendEmailSource).toContain("skipped: true")
  })

  it("has a DB-backed idempotency key for one-shot lifecycle emails", () => {
    expect(idempotencyMigrationSource).toContain("ADD COLUMN IF NOT EXISTS idempotency_key")
    expect(idempotencyMigrationSource).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_email_outbox_idempotency_key")
    expect(outboxSource).toContain("buildEmailOutboxIdempotencyKey")
    expect(DB_IDEMPOTENT_EMAIL_TYPES.has("partial_intake_recovery")).toBe(true)
    expect(DB_IDEMPOTENT_EMAIL_TYPES.has("abandoned_checkout")).toBe(true)
    expect(DB_IDEMPOTENT_EMAIL_TYPES.has("med_cert_patient")).toBe(false)

    const first = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "Patient@Example.com",
      metadata: { draft_session_id: "draft-123" },
    })
    const second = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "patient@example.com",
      metadata: { draft_session_id: "draft-123" },
    })

    expect(first).toBe(second)
    expect(first).toMatch(/^email:partial_intake_recovery:/)
  })

  it("keeps internal digest emails retired in favor of dashboard-led operations", () => {
    const schedules = new Map(vercelConfig.crons.map((cron) => [cron.path, cron.schedule]))
    const ids = EMAIL_SEQUENCES.map((sequence) => sequence.id)

    expect(existsSync(join(process.cwd(), "app/api/cron/daily-digest/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/cron/email-digest/route.ts"))).toBe(false)
    expect(schedules.has("/api/cron/daily-digest")).toBe(false)
    expect(schedules.has("/api/cron/email-digest")).toBe(false)
    expect(ids).not.toContain("ops_daily_digest")
    expect(ids).not.toContain("ops_email_digest")
  })

  it("keeps declined clinical-request re-engagement retired", () => {
    const schedules = new Map(vercelConfig.crons.map((cron) => [cron.path, cron.schedule]))
    const ids = EMAIL_SEQUENCES.map((sequence) => sequence.id)
    const sendersSource = readFileSync(join(process.cwd(), "lib/email/senders.ts"), "utf8")
    const templateIndexSource = readFileSync(join(process.cwd(), "lib/email/components/templates/index.ts"), "utf8")

    expect(existsSync(join(process.cwd(), "app/api/cron/decline-reengagement/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/email/components/templates/decline-reengagement.tsx"))).toBe(false)
    expect(schedules.has("/api/cron/decline-reengagement")).toBe(false)
    expect(ids).not.toContain("decline_reengagement")
    expect(DB_IDEMPOTENT_EMAIL_TYPES.has("decline_reengagement" as never)).toBe(false)
    expect(sendersSource).not.toContain("sendDeclineReengagementEmail")
    expect(templateIndexSource).not.toContain("DeclineReengagement")
  })

  it("surfaces active and retired sequences in one compact admin map", () => {
    const ids = EMAIL_SEQUENCES.map((sequence) => sequence.id)

    expect(ids).toContain("partial_intake_recovery")
    expect(ids).toContain("abandoned_checkout")
    expect(ids).toContain("repeat_rx_reminder")
    expect(EMAIL_SEQUENCES.find((sequence) => sequence.id === "repeat_rx_reminder")?.status).toBe("inactive")
    expect(emailHubSource).toContain("EMAIL_SEQUENCES")
    expect(emailHubSource).toContain("Sequence ownership")
  })
})
