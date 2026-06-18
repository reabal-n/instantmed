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
const recoveryLinksSource = readFileSync(
  join(process.cwd(), "lib/email/recovery-links.ts"),
  "utf8",
)
const reviewRequestSource = readFileSync(
  join(process.cwd(), "lib/email/review-request.ts"),
  "utf8",
)
const sendEmailSource = readFileSync(
  join(process.cwd(), "lib/email/send-email.ts"),
  "utf8",
)
const templateSenderSource = readFileSync(
  join(process.cwd(), "lib/email/template-sender.ts"),
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
  it("keeps draft recovery responsible for pre-intake review and checkout drafts", () => {
    expect(partialRecoverySource).not.toContain('const PAYMENT_STAGE_DRAFT_STEPS = ["review", "checkout"] as const')
    expect(partialRecoverySource).not.toContain('.not("current_step_id", "in"')
    expect(partialRecoverySource).toContain('emailType: "partial_intake_recovery"')
    expect(partialRecoverySource).not.toContain('emailType: "abandoned_checkout"')

    expect(partialRecoverySource).toContain("review/checkout drafts that have not created an intake")
    expect(partialRecoverySource).toContain("answers.consultSubtype")
    expect(partialRecoverySource).toContain("buildPartialIntakeRecoveryUrl")
    expect(recoveryLinksSource).toContain('new URL(draft.serviceType === "consult" && !draft.consultSubtype ? "/consult" : "/request"')
    expect(recoveryLinksSource).toContain('url.searchParams.set("d", draft.sessionId)')
    expect(partialRecoverySource).not.toContain(
      "`${appUrl}/request?service=${encodeURIComponent(draft.service_type)}&d=${encodeURIComponent(draft.session_id)}",
    )
    expect(abandonedCheckoutSource).toContain('.in("status", ["pending_payment", "checkout_failed"])')
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

  it("keeps immediate recovery sends from being claimed by the dispatcher while in flight", () => {
    expect(outboxSource).toContain('initialStatus?: "pending" | "sending"')
    expect(outboxSource).toContain("Immediate sends should start as `sending`")
    expect(outboxSource).toContain('status: entry.initialStatus ?? "pending"')
    expect(sendEmailSource).toContain("initialStatus: scheduledFor && new Date(scheduledFor).getTime() > Date.now()")
    expect(sendEmailSource).toContain(': "sending"')
    expect(htmlOutboxSource).toContain('initialStatus: "sending"')
    expect(templateSenderSource).toContain('initialStatus: "sending"')
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

  it("keeps the duplicate med-cert day-3 follow-up cron retired", () => {
    const schedules = new Map(vercelConfig.crons.map((cron) => [cron.path, cron.schedule]))
    const sequence = EMAIL_SEQUENCES.find((item) => item.id === "follow_up_reminder")

    expect(existsSync(join(process.cwd(), "app/api/cron/follow-up-reminder/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/email/follow-up-reminder.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/email/components/templates/follow-up-reminder.tsx"))).toBe(false)
    expect(schedules.has("/api/cron/follow-up-reminder")).toBe(false)
    expect(sequence?.status).toBe("inactive")
    expect(sequence?.guard).toBe("No cron/template; review request owns post-care messaging")
    expect(DB_IDEMPOTENT_EMAIL_TYPES.has("follow_up_reminder" as never)).toBe(false)
    expect(readFileSync(join(process.cwd(), "app/(dev)/email-preview/page.tsx"), "utf8")).not.toContain("follow-up-reminder")
  })

  it("keeps review requests to one post-care ask", () => {
    const sequence = EMAIL_SEQUENCES.find((item) => item.id === "review_request")
    const schedules = new Map(vercelConfig.crons.map((cron) => [cron.path, cron.schedule]))

    expect(schedules.has("/api/cron/review-request")).toBe(true)
    expect(sequence?.status).toBe("active")
    expect(sequence?.cadence).toBe("Day 2 only")
    expect(reviewRequestSource).toContain("findReviewRequestCandidates")
    expect(reviewRequestSource).not.toContain("findReviewFollowupCandidates")
    expect(reviewRequestSource).not.toContain("sendReviewFollowupEmail")
    expect(reviewRequestSource).not.toContain("review_followup")
    expect(existsSync(join(process.cwd(), "lib/email/components/templates/review-followup.tsx"))).toBe(false)
    expect(DB_IDEMPOTENT_EMAIL_TYPES.has("review_followup" as never)).toBe(false)
    expect(readFileSync(join(process.cwd(), "app/(dev)/email-preview/page.tsx"), "utf8")).not.toContain("review-followup")
    expect(readFileSync(join(process.cwd(), "scripts/check-orphaned-files.sh"), "utf8")).toContain(
      "lib/email/components/templates/review-followup.tsx",
    )
  })

  it("keeps automated treatment follow-up reminders retired", () => {
    const schedules = new Map(vercelConfig.crons.map((cron) => [cron.path, cron.schedule]))
    const sequence = EMAIL_SEQUENCES.find((item) => item.id === "treatment_followup")
    const templateIndexSource = readFileSync(join(process.cwd(), "lib/email/components/templates/index.ts"), "utf8")
    const sendTypesSource = readFileSync(join(process.cwd(), "lib/email/send/types.ts"), "utf8")
    const dispatcherSource = readFileSync(join(process.cwd(), "lib/email/email-dispatcher.ts"), "utf8")

    expect(existsSync(join(process.cwd(), "app/api/cron/treatment-followup/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/email/treatment-followup.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/email/components/templates/treatment-followup.tsx"))).toBe(false)
    expect(schedules.has("/api/cron/treatment-followup")).toBe(false)
    expect(sequence?.status).toBe("inactive")
    expect(sequence?.guard).toBe("No cron/template/patient route; history remains staff-only")
    expect(sendTypesSource).not.toContain("treatment_followup")
    expect(dispatcherSource).not.toContain("treatment_followup")
    expect(templateIndexSource).not.toContain("TreatmentFollowup")
    expect(readFileSync(join(process.cwd(), "app/(dev)/email-preview/page.tsx"), "utf8")).not.toContain("treatment-followup")
  })

  it("surfaces active and retired sequences in one compact admin map", () => {
    const ids = EMAIL_SEQUENCES.map((sequence) => sequence.id)

    expect(ids).toContain("partial_intake_recovery")
    expect(ids).toContain("abandoned_checkout")
    expect(ids).toContain("repeat_rx_reminder")
    expect(EMAIL_SEQUENCES.find((sequence) => sequence.id === "repeat_rx_reminder")?.status).toBe("inactive")
    expect(EMAIL_SEQUENCES.find((sequence) => sequence.id === "follow_up_reminder")?.status).toBe("inactive")
    expect(EMAIL_SEQUENCES.find((sequence) => sequence.id === "treatment_followup")?.status).toBe("inactive")
    expect(emailHubSource).toContain("EMAIL_SEQUENCES")
    expect(emailHubSource).toContain("Sequence ownership")
  })
})
