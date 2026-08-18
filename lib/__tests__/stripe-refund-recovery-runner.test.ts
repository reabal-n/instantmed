import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  finalize: vi.fn(),
  finalizeAttempts: vi.fn(),
  persist: vi.fn(),
  queue: vi.fn(),
  readTarget: vi.fn(),
  reconcile: vi.fn(),
  recover: vi.fn(),
}))

vi.mock("@/lib/analytics/google-ads-conversion-adjustments", () => ({
  queueExactGoogleAdsConversionAdjustment: mocks.queue,
}))
vi.mock("@/lib/stripe/refund-attempt-recovery", () => ({
  recoverStripeRefundAttempt: mocks.recover,
}))
vi.mock("@/lib/stripe/refund-event-persistence", () => ({
  finalizePersistedStripeRefundAttempts: mocks.finalizeAttempts,
  persistStripeRefundApiObservation: mocks.persist,
  readExactRefundAdjustmentTarget: mocks.readTarget,
  reconcilePersistedStripeRefundState: mocks.reconcile,
}))
vi.mock("@/lib/stripe/refund-notification-finalizer", () => ({
  finalizeRefundNotifications: mocks.finalize,
}))

import { runStripeRefundRecovery } from "@/lib/stripe/refund-recovery-runner"

const operations: string[] = []

const attempt = {
  attempt_id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-08-16T01:00:00.000Z",
  idempotency_key: "refund-attempt:11111111-1111-4111-8111-111111111111",
  intake_id: "22222222-2222-4222-8222-222222222222",
  lease_token: "33333333-3333-4333-8333-333333333333",
  livemode: false,
  payment_intent_id: "pi_recovery",
  refund_type: "decline",
  requested_amount_cents: 4_000,
  state: "submitted",
  stripe_refund_id: "re_recovery",
}

function harness(input?: {
  claimedAttempt?: Record<string, unknown>
  claimError?: string
  recoveryIssueCount?: number
  recoveryIssueError?: string
}) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_stale_stripe_refund_attempts") {
      return {
        data: input?.claimError ? null : [input?.claimedAttempt ?? attempt],
        error: input?.claimError ? { message: input.claimError } : null,
      }
    }
    if (name === "count_stripe_refund_recovery_issues") {
      return {
        data: input?.recoveryIssueError
          ? null
          : input?.recoveryIssueCount ?? 0,
        error: input?.recoveryIssueError
          ? { message: input.recoveryIssueError }
          : null,
      }
    }
    return { data: true, error: null }
  })
  return { stripe: {}, supabase: { rpc }, rpc }
}

describe("runStripeRefundRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    operations.length = 0
    mocks.recover.mockResolvedValue({
      error: null,
      refund: { id: "re_recovery", status: "succeeded" },
      status: "observed",
    })
    mocks.persist.mockResolvedValue({
      error: null,
      evidence: [{ stripe_refund_id: "re_recovery" }],
    })
    mocks.reconcile.mockResolvedValue({
      error: null,
      state: {
        amount_cents: 4_995,
        id: attempt.intake_id,
        payment_status: "refunded",
        refund_amount_cents: 4_995,
      },
    })
    mocks.finalize.mockImplementation(async () => {
      operations.push("notification")
      return { error: null }
    })
    mocks.finalizeAttempts.mockImplementation(async () => {
      operations.push("attempt")
      return { error: null }
    })
    mocks.readTarget.mockImplementation(async () => {
      operations.push("target")
      return {
        adjustmentDateTime: new Date("2026-08-16T01:05:00.000Z"),
        error: null,
        targetNetValueCents: 0,
      }
    })
    mocks.queue.mockImplementation(async () => {
      operations.push("queue")
      return { error: null, state: "pending" }
    })
  })

  it("claims a bounded batch and completes every durable downstream effect", async () => {
    const { rpc, stripe, supabase } = harness()

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25, nowMs: Date.parse("2026-08-16T06:00:00.000Z") },
    )

    expect(rpc).toHaveBeenCalledWith("claim_stale_stripe_refund_attempts", {
      p_limit: 25,
      p_livemode: false,
    })
    expect(mocks.recover).toHaveBeenCalledWith(
      { stripe, supabase },
      { attempt, nowMs: Date.parse("2026-08-16T06:00:00.000Z") },
    )
    expect(mocks.persist).toHaveBeenCalledWith({
      intakeId: attempt.intake_id,
      livemode: false,
      refund: expect.objectContaining({ id: "re_recovery" }),
      supabase,
    })
    expect(mocks.finalize).toHaveBeenCalledWith({
      evidence: [expect.objectContaining({ stripe_refund_id: "re_recovery" })],
      intakeId: attempt.intake_id,
      livemode: false,
      supabase,
    })
    expect(mocks.finalizeAttempts).toHaveBeenCalledWith({
      evidence: [expect.objectContaining({ stripe_refund_id: "re_recovery" })],
      livemode: false,
      refunds: [expect.objectContaining({ id: "re_recovery" })],
      supabase,
    })
    expect(mocks.queue).toHaveBeenCalledWith({
      adjustmentDateTime: new Date("2026-08-16T01:05:00.000Z"),
      amountCents: 4_995,
      intakeId: attempt.intake_id,
      source: "stripe_refund_lifecycle",
      supabase,
      targetNetValueCents: 0,
    })
    expect(operations).toEqual(["notification", "attempt", "target", "queue"])
    expect(result).toEqual({
      claimed: 1,
      errors: [],
      failed: 0,
      manualReview: 0,
      processed: 1,
    })
  })

  it("replays a terminal attempt whose downstream marker is still incomplete", async () => {
    const terminalAttempt = {
      ...attempt,
      state: "succeeded",
      stripe_refund_id: "re_recovery",
    }
    const { stripe, supabase } = harness({ claimedAttempt: terminalAttempt })

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(mocks.recover).toHaveBeenCalledWith(
      { stripe, supabase },
      { attempt: terminalAttempt },
    )
    expect(mocks.finalizeAttempts).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ failed: 0, processed: 1 })
  })

  it("does not finalize an attempt when durable notification fails", async () => {
    mocks.finalize.mockImplementation(async () => {
      operations.push("notification")
      return { error: "notification outbox unavailable" }
    })
    const { stripe, supabase } = harness()

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result.errors).toContainEqual({
      attemptId: attempt.attempt_id,
      code: "notification_failed",
    })
    expect(mocks.finalizeAttempts).not.toHaveBeenCalled()
    expect(mocks.readTarget).not.toHaveBeenCalled()
    expect(operations).toEqual(["notification"])
  })

  it("retries terminal attempt finalization before Ads work", async () => {
    mocks.finalizeAttempts.mockImplementation(async () => {
      operations.push("attempt")
      return { error: "terminal attempt finalization incomplete" }
    })
    const { stripe, supabase } = harness()

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result.errors).toContainEqual({
      attemptId: attempt.attempt_id,
      code: "attempt_finalization_failed",
    })
    expect(mocks.readTarget).not.toHaveBeenCalled()
    expect(mocks.queue).not.toHaveBeenCalled()
    expect(operations).toEqual(["notification", "attempt"])
  })

  it("keeps Ads work retryable after finalizing the cash attempt", async () => {
    mocks.queue.mockImplementation(async () => {
      operations.push("queue")
      return { error: "Ads queue unavailable" }
    })
    const { stripe, supabase } = harness()

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result.errors).toContainEqual({
      attemptId: attempt.attempt_id,
      code: "adjustment_queue_failed",
    })
    expect(mocks.finalizeAttempts).toHaveBeenCalledOnce()
    expect(result.processed).toBe(0)
    expect(operations).toEqual(["notification", "attempt", "target", "queue"])
  })

  it("surfaces an old unknown outcome for manual review without creating downstream fiction", async () => {
    mocks.recover.mockResolvedValue({
      error: "Stripe refund outcome remains unknown beyond the safe replay window",
      refund: null,
      status: "manual_review",
    })
    const { stripe, supabase } = harness()

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result).toMatchObject({ claimed: 1, failed: 0, manualReview: 1, processed: 0 })
    expect(result.errors).toEqual([{
      attemptId: attempt.attempt_id,
      code: "manual_review_required",
    }])
    expect(mocks.persist).not.toHaveBeenCalled()
  })

  it("does not double-count a newly quarantined attempt in the issue-view total", async () => {
    mocks.recover.mockResolvedValue({
      error: "Stripe refund outcome remains unknown beyond the safe replay window",
      refund: null,
      status: "manual_review",
    })
    const { stripe, supabase } = harness({ recoveryIssueCount: 1 })

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result.manualReview).toBe(1)
    expect(result.errors).toEqual([
      {
        attemptId: attempt.attempt_id,
        code: "manual_review_required",
      },
      { attemptId: null, code: "manual_review_required" },
    ])
  })

  it("does not persist a recovered Refund until its attempt identity is durably bound", async () => {
    mocks.recover.mockResolvedValue({
      error: "Stripe refund attempt binding failed",
      refund: { id: "re_recovery", status: "succeeded" },
      status: "observed",
    })
    const { stripe, supabase } = harness()

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result).toEqual({
      claimed: 1,
      errors: [{ attemptId: attempt.attempt_id, code: "recovery_failed" }],
      failed: 1,
      manualReview: 0,
      processed: 0,
    })
    expect(mocks.persist).not.toHaveBeenCalled()
  })

  it("fails the run closed when stale-work claiming is unavailable", async () => {
    const { stripe, supabase } = harness({ claimError: "database unavailable" })

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result).toEqual({
      claimed: 0,
      errors: [{ attemptId: null, code: "claim_failed" }],
      failed: 1,
      manualReview: 0,
      processed: 0,
    })
    expect(mocks.recover).not.toHaveBeenCalled()
  })

  it("surfaces durable decline-obligation issues without exposing intake ids", async () => {
    const { stripe, supabase } = harness({ recoveryIssueCount: 2 })

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result.manualReview).toBe(2)
    expect(result.errors).toContainEqual({
      attemptId: null,
      code: "manual_review_required",
    })
  })

  it("fails closed when durable recovery issues cannot be counted", async () => {
    const { stripe, supabase } = harness({
      recoveryIssueError: "issue view unavailable",
    })

    const result = await runStripeRefundRecovery(
      { stripe: stripe as never, supabase: supabase as never },
      { limit: 25 },
    )

    expect(result.errors).toContainEqual({
      attemptId: null,
      code: "recovery_issue_read_failed",
    })
    expect(result.failed).toBe(1)
  })
})
