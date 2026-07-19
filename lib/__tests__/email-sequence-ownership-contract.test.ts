import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ABANDONED_CHECKOUT_FIRST_NUDGE_DELAY_MINUTES,
  ABANDONED_CHECKOUT_FIRST_NUDGE_LOOKBACK_HOURS,
  ABANDONED_CHECKOUT_FOLLOWUP_DELAY_HOURS,
  ABANDONED_CHECKOUT_FOLLOWUP_LOOKBACK_HOURS,
  formatAbandonedCheckoutStartedAgo,
} from "@/lib/email/abandoned-checkout-timing"
import {
  REVIEW_REQUEST_CATCH_UP_DAYS,
  REVIEW_REQUEST_DELAY_HOURS,
  REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS,
} from "@/lib/email/review-request-timing"
import {
  buildEmailOutboxIdempotencyKey,
  DB_IDEMPOTENT_EMAIL_TYPES,
} from "@/lib/email/send/idempotency"
import { EMAIL_SEQUENCES } from "@/lib/email/sequence-registry"

const partialRecoverySource = readFileSync(
  join(process.cwd(), "lib/email/partial-intake-recovery.ts"),
  "utf8",
)
const partialRecoveryPolicySource = readFileSync(
  join(process.cwd(), "lib/email/partial-intake-recovery-policy.ts"),
  "utf8",
)
const partialRecoveryCandidateMigrationSource = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260719113000_partial_recovery_candidate_anti_join.sql",
  ),
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
const reviewRequestCandidateMigrationSource = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260719101500_review_request_candidate_anti_join.sql",
  ),
  "utf8",
)
const reviewRequestPolicySource = readFileSync(
  join(process.cwd(), "lib/email/review-request-policy.ts"),
  "utf8",
)
const reviewRequestRouteSource = readFileSync(
  join(process.cwd(), "app/api/cron/review-request/route.ts"),
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

function expandMinuteField(field: string): number[] {
  if (field === "*") return Array.from({ length: 60 }, (_, minute) => minute)
  if (field.startsWith("*/")) {
    const step = Number(field.slice(2))
    return Array.from({ length: 60 }, (_, minute) => minute).filter((minute) => minute % step === 0)
  }
  return field.split(",").map((value) => Number(value))
}

describe("email sequence ownership contract", () => {
  it("keeps draft recovery responsible for pre-intake review and checkout drafts", () => {
    expect(partialRecoverySource).not.toContain('const PAYMENT_STAGE_DRAFT_STEPS = ["review", "checkout"] as const')
    expect(partialRecoverySource).not.toContain('.not("current_step_id", "in"')
    expect(partialRecoverySource).toContain('emailType: "partial_intake_recovery"')
    expect(partialRecoverySource).not.toContain('emailType: "abandoned_checkout"')

    expect(partialRecoveryCandidateMigrationSource).toContain(
      "partial.converted_to_intake_id is null",
    )
    expect(partialRecoveryPolicySource).toContain("answers.consultSubtype")
    expect(partialRecoveryPolicySource).toContain("buildPartialIntakeRecoveryUrl")
    expect(recoveryLinksSource).toContain("buildDraftResumePath")
    expect(recoveryLinksSource).toContain("if (!resumePath) return null")
    expect(partialRecoveryPolicySource).toContain("draft_not_resumable")
    expect(partialRecoverySource).not.toContain(
      "`${appUrl}/request?service=${encodeURIComponent(draft.service_type)}&d=${encodeURIComponent(draft.session_id)}",
    )
    expect(abandonedCheckoutSource).toContain('.in("status", ["pending_payment", "checkout_failed"])')
    expect(abandonedCheckoutSource).toContain('emailType: "abandoned_checkout"')
    expect(abandonedCheckoutSource).toContain('emailType: "abandoned_checkout_followup"')
  })

  it("does not schedule the two recovery sequences at the exact same minute", () => {
    const schedules = new Map(vercelConfig.crons.map((cron) => [cron.path, cron.schedule]))
    const abandonedMinutes = expandMinuteField(schedules.get("/api/cron/abandoned-checkouts")?.split(" ")[0] ?? "")
    const partialMinutes = expandMinuteField(schedules.get("/api/cron/recover-partial-intakes")?.split(" ")[0] ?? "")

    expect(schedules.get("/api/cron/abandoned-checkouts")).toBe("*/20 * * * *")
    expect(schedules.get("/api/cron/recover-partial-intakes")).toBe("15 * * * *")
    expect(abandonedMinutes.filter((minute) => partialMinutes.includes(minute))).toEqual([])
  })

  it("keeps checkout-stage recovery faster than draft-stage recovery", () => {
    const checkoutSequence = EMAIL_SEQUENCES.find((sequence) => sequence.id === "abandoned_checkout")

    expect(ABANDONED_CHECKOUT_FIRST_NUDGE_DELAY_MINUTES).toBe(20)
    expect(ABANDONED_CHECKOUT_FIRST_NUDGE_LOOKBACK_HOURS).toBe(24)
    expect(ABANDONED_CHECKOUT_FOLLOWUP_DELAY_HOURS).toBe(24)
    expect(ABANDONED_CHECKOUT_FOLLOWUP_LOOKBACK_HOURS).toBe(72)
    expect(partialRecoveryPolicySource).toContain(
      "PARTIAL_RECOVERY_MIN_IDLE_MINUTES = 60",
    )
    expect(checkoutSequence?.cadence).toBe("20-40m nudge, 24h follow-up")
    expect(abandonedCheckoutSource).toContain("firstNudgeReadyAt")
    expect(abandonedCheckoutSource).toContain("firstNudgeWindowFloor")
    expect(abandonedCheckoutSource).not.toContain("const oneHourAgo")
  })

  it("formats faster checkout recovery copy without zero-hour wording", () => {
    const now = new Date("2026-06-18T12:00:00.000Z")

    expect(formatAbandonedCheckoutStartedAgo("2026-06-18T11:41:00.000Z", now)).toBe("about 20 minutes ago")
    expect(formatAbandonedCheckoutStartedAgo("2026-06-18T11:26:00.000Z", now)).toBe("about 35 minutes ago")
    expect(formatAbandonedCheckoutStartedAgo("2026-06-18T10:10:00.000Z", now)).toBe("about 2 hours ago")
    expect(formatAbandonedCheckoutStartedAgo("not-a-date", now)).toBe("recently")
  })

  it("prevents abandoned checkout followup from becoming eligible in the same cron run as the first nudge", () => {
    expect(abandonedCheckoutSource).toContain('.gte("abandoned_email_sent_at", followupWindowFloor)')
    expect(abandonedCheckoutSource).toContain('.lte("abandoned_email_sent_at", followupReadyAt)')
    expect(abandonedCheckoutSource).toContain("prevents a boundary case")
  })

  it("suppresses duplicate sends once the outbox idempotency guard finds a matching row", () => {
    expect(outboxSource).toContain("duplicate: true")
    expect(sendEmailSource).toContain("Duplicate send suppressed by outbox guard")
    expect(sendEmailSource).toContain("Sentry.addBreadcrumb")
    expect(sendEmailSource).toContain("outboxResult.duplicate")
    expect(sendEmailSource).toContain("skipped: true")
    expect(templateSenderSource).toContain("Template email suppressed by idempotency guard")
    expect(templateSenderSource).toContain("pending.duplicate")
    expect(existsSync(join(process.cwd(), "lib/email/send/html-outbox.ts"))).toBe(false)
  })

  it("keeps immediate recovery sends from being claimed by the dispatcher while in flight", () => {
    expect(outboxSource).toContain('initialStatus?: "pending" | "sending"')
    expect(outboxSource).toContain("Immediate sends should start as `sending`")
    expect(outboxSource).toContain('status: entry.initialStatus ?? "pending"')
    expect(sendEmailSource).toContain("initialStatus: scheduledFor && new Date(scheduledFor).getTime() > Date.now()")
    expect(sendEmailSource).toContain(': "sending"')
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
      metadata: { recovery_tracking_id: "tracking-123" },
    })
    const second = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "patient@example.com",
      metadata: { recovery_tracking_id: "tracking-123" },
    })
    const legacy = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "patient@example.com",
      metadata: { draft_idempotency_hash: "safe-hash-123" },
    })

    expect(first).toBe(second)
    expect(first).toMatch(/^email:partial_intake_recovery:/)
    expect(legacy).toMatch(/^email:partial_intake_recovery:/)
    expect(partialRecoverySource).toContain("recovery_tracking_id:")
    expect(partialRecoverySource).not.toContain("draft_idempotency_hash:")
    expect(partialRecoverySource).not.toContain("draft_session_id:")
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

    expect(schedules.get("/api/cron/review-request")).toBe("0 0,23 * * *")
    expect(sequence?.status).toBe("active")
    expect(sequence?.owner).toBe("Post-fulfilment lifecycle")
    expect(sequence?.trigger).toBe("Confirmed document or eScript delivery")
    expect(sequence?.cadence).toBe("Once, 48h after fulfilment")
    expect(sequence?.guard).toBe("One per request plus 30-day patient cooldown")
    expect(REVIEW_REQUEST_DELAY_HOURS).toBe(48)
    expect(REVIEW_REQUEST_CATCH_UP_DAYS).toBeGreaterThan(72 / 24)
    expect(REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS).toBe(30)
    expect(reviewRequestRouteSource).toContain("isSydneyReviewRequestHour(now)")
    expect(reviewRequestRouteSource).toContain("Outside the 10:00 Australia/Sydney send hour")
    expect(reviewRequestSource).toContain("findReviewRequestCandidates")
    expect(reviewRequestSource).toContain('"get_review_request_candidates"')
    expect(reviewRequestCandidateMigrationSource).toContain(
      "intake.document_sent_at",
    )
    expect(reviewRequestCandidateMigrationSource).toContain(
      "intake.script_sent_at",
    )
    expect(reviewRequestCandidateMigrationSource).toContain(
      "intake.payment_status = 'paid'",
    )
    expect(reviewRequestCandidateMigrationSource).toContain("and not exists (")
    expect(reviewRequestCandidateMigrationSource).not.toContain(
      "outbox.status in",
    )
    expect(reviewRequestSource).toContain("REVIEW_REQUEST_CATCH_UP_DAYS")
    expect(reviewRequestPolicySource).toContain(
      "REVIEW_REQUEST_PATIENT_COOLDOWN_DAYS",
    )
    expect(reviewRequestSource).not.toContain("seventyTwoHoursAgo")
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

  it("deduplicates review asks per request while allowing a later request after cooldown", () => {
    const first = buildEmailOutboxIdempotencyKey({
      email_type: "review_request",
      to_email: "Patient@Example.com",
      intake_id: "intake-123",
      patient_id: "patient-123",
    })
    const sameRequest = buildEmailOutboxIdempotencyKey({
      email_type: "review_request",
      to_email: "patient@example.com",
      intake_id: "intake-123",
      patient_id: "patient-123",
    })
    const laterRequest = buildEmailOutboxIdempotencyKey({
      email_type: "review_request",
      to_email: "patient@example.com",
      intake_id: "intake-456",
      patient_id: "patient-123",
    })

    expect(DB_IDEMPOTENT_EMAIL_TYPES.has("review_request")).toBe(true)
    expect(first).toBe(sameRequest)
    expect(laterRequest).not.toBe(first)
    expect(reviewRequestPolicySource).toContain(
      "hasReviewRequestCooldownReservation",
    )
    expect(reviewRequestPolicySource).toContain(
      "currentOutboxId: input.currentOutboxId",
    )
    expect(reviewRequestPolicySource).toContain('.neq("id", input.intakeId)')
  })

  it("re-checks marketing consent immediately before the review send", () => {
    const finalPolicyGate = sendEmailSource.indexOf(
      "const reviewGate = await gateReviewRequestProviderDelivery({",
    )
    const providerSend = sendEmailSource.indexOf(
      'await fetch("https://api.resend.com/emails"',
      finalPolicyGate,
    )

    expect(reviewRequestPolicySource).toContain(
      "getMarketingEmailDecision(patientId)",
    )
    expect(finalPolicyGate).toBeGreaterThan(-1)
    expect(providerSend).toBeGreaterThan(finalPolicyGate)
    expect(
      sendEmailSource.slice(finalPolicyGate, providerSend),
    ).not.toContain("await sleep")
    expect(sendEmailSource).toContain(
      'emailType !== "review_request"',
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
