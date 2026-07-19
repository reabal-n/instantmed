import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  CommunicationOutcome,
  SendEmailResult,
} from "@/lib/email/send/types"

const state = vi.hoisted(() => ({
  candidateResult: {
    data: [] as Array<{
      email: string
      recovery_tracking_id: string
      updated_at: string
    }>,
    error: null as { message: string } | null,
  },
  rpcCalls: [] as Array<{
    name: string
    args: unknown[]
  }>,
  reconciliationResult: {
    data: [] as Array<{ recovery_tracking_id: string }>,
    error: null as { message: string } | null,
  },
}))

const mocks = vi.hoisted(() => ({
  evaluatePartialIntakeRecoveryPolicy: vi.fn(),
  finalizeOutboxSequenceDisposition: vi.fn(),
  isEmailSendDeliveryConfirmed: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/email/partial-intake-recovery-policy", () => ({
  evaluatePartialIntakeRecoveryPolicy:
    mocks.evaluatePartialIntakeRecoveryPolicy,
  PARTIAL_RECOVERY_MAX_IDLE_HOURS: 6,
  PARTIAL_RECOVERY_MIN_IDLE_MINUTES: 60,
}))

vi.mock("@/lib/email/outbox-delivery", () => ({
  isEmailSendDeliveryConfirmed: mocks.isEmailSendDeliveryConfirmed,
}))

vi.mock("@/lib/email/outbox-disposition", () => ({
  finalizeOutboxSequenceDisposition:
    mocks.finalizeOutboxSequenceDisposition,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ name, args: [args] })
      return name === "get_unmarked_sent_partial_recoveries"
        ? state.reconciliationResult
        : state.candidateResult
    },
  }),
}))

import {
  processPartialIntakeRecoveries,
} from "@/lib/email/partial-intake-recovery"
import {
  findPartialIntakeRecoveryCandidates,
} from "@/lib/email/partial-intake-recovery-candidates"

const NOW = new Date("2026-07-20T00:00:00.000Z")
const EMAIL = "alex.taylor@patientmail.com.au"
const UPDATED_AT = "2026-07-19T22:00:00.000Z"
const candidateMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260719113000_partial_recovery_candidate_anti_join.sql",
  ),
  "utf8",
)

function candidate(trackingId = "tracking-1") {
  return {
    email: EMAIL,
    recovery_tracking_id: trackingId,
    updated_at: UPDATED_AT,
  }
}

function allowedDecision(trackingId = "tracking-1") {
  const sessionId = "11111111-1111-4111-8111-111111111111"
  return {
    kind: "allowed" as const,
    draft: {
      recoveryTrackingId: trackingId,
      sessionId,
      serviceType: "med-cert",
      email: EMAIL,
      firstName: "Alex",
      updatedAt: UPDATED_AT,
      expiresAt: "2026-07-26T00:00:00.000Z",
      resumeUrl:
        `https://instantmed.example/request?service=med-cert&d=${sessionId}` +
        "&utm_source=recovery_email&utm_medium=email" +
        "&utm_campaign=partial_intake_recovery&utm_content=med-cert",
    },
  }
}

function sendResult(outcome: CommunicationOutcome): SendEmailResult {
  return {
    success: outcome.kind === "sent" || outcome.kind === "pending",
    ...(outcome.kind === "sent" || outcome.kind === "pending"
      ? { outboxId: outcome.outboxId }
      : {}),
    suppressed: outcome.kind === "policy_suppressed",
    outcome,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.rpcCalls.length = 0
  state.candidateResult = { data: [], error: null }
  state.reconciliationResult = { data: [], error: null }
  mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValue(
    allowedDecision(),
  )
  mocks.finalizeOutboxSequenceDisposition.mockResolvedValue({
    finalized: true,
  })
  mocks.isEmailSendDeliveryConfirmed.mockResolvedValue(false)
})

describe("partial-intake recovery candidate ownership", () => {
  it("uses inclusive 60-minute/6-hour bounds in the bounded database query", async () => {
    await findPartialIntakeRecoveryCandidates(NOW)

    expect(state.rpcCalls).toContainEqual({
      name: "get_partial_intake_recovery_candidates",
      args: [{
        p_eligible_after: "2026-07-19T18:00:00.000Z",
        p_eligible_before: "2026-07-19T23:00:00.000Z",
        p_limit: 50,
      }],
    })
  })

  it("excludes every durable owner before the oldest-first limit", () => {
    expect(candidateMigration).toContain("and not exists (")
    expect(candidateMigration).toContain(
      "outbox.email_type = 'partial_intake_recovery'",
    )
    expect(candidateMigration).toContain(
      "partial.recovery_tracking_id::text",
    )
    expect(candidateMigration).not.toContain("outbox.status")
    expect(candidateMigration).toContain(
      "from public, anon, authenticated",
    )
    expect(candidateMigration).toContain("to service_role")
  })

  it("fails closed when the database candidate read fails", async () => {
    state.candidateResult.error = { message: "candidate read failed" }
    await expect(
      findPartialIntakeRecoveryCandidates(NOW),
    ).rejects.toThrow("candidate read failed")
  })
})

describe("partial-intake recovery orchestration", () => {
  it("persists only the non-bearer tracking correlation and explicit scope", async () => {
    state.candidateResult.data = [candidate()]
    mocks.sendEmail.mockResolvedValue(sendResult({
      kind: "pending",
      outboxId: "outbox-1",
    }))

    await processPartialIntakeRecoveries()

    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "partial-intake-recovery:tracking-1",
      metadata: {
        recovery_tracking_id: "tracking-1",
      },
      partialRecoveryExpectedUpdatedAt: UPDATED_AT,
    }))
    const metadata = mocks.sendEmail.mock.calls[0]?.[0]?.metadata
    expect(JSON.stringify(metadata)).not.toContain("session")
    expect(JSON.stringify(metadata)).not.toContain("resume")
    expect(JSON.stringify(metadata)).not.toContain("hash")
  })

  it("terminally suppresses synthetic drafts without provider contact", async () => {
    state.candidateResult.data = [candidate()]
    mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValue({
      kind: "policy_suppressed",
      reason: "test_identity",
    })

    await expect(processPartialIntakeRecoveries()).resolves.toMatchObject({
      found: 1,
      policy_suppressed: 1,
      testSkipped: 1,
    })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.finalizeOutboxSequenceDisposition).toHaveBeenCalledWith(
      expect.objectContaining({
        email_type: "partial_intake_recovery",
        metadata: { recovery_tracking_id: "tracking-1" },
      }),
      "suppressed",
    )
  })

  it("leaves transient policy decisions unmarked and unqueued", async () => {
    state.candidateResult.data = [candidate()]
    mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValue({
      kind: "transiently_blocked",
      reason: "draft_read_failed",
    })

    await expect(processPartialIntakeRecoveries()).resolves.toMatchObject({
      transiently_blocked: 1,
    })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.finalizeOutboxSequenceDisposition).not.toHaveBeenCalled()
  })

  it("does not count skipped_e2e as sent or finalize its marker", async () => {
    state.candidateResult.data = [candidate()]
    mocks.sendEmail.mockResolvedValue({
      success: true,
      skipped: true,
      outboxId: "outbox-e2e",
      outcome: { kind: "pending", outboxId: "outbox-e2e" },
    })
    mocks.isEmailSendDeliveryConfirmed.mockResolvedValue(false)

    await expect(processPartialIntakeRecoveries()).resolves.toMatchObject({
      sent: 0,
      pending: 1,
    })
    expect(mocks.finalizeOutboxSequenceDisposition).not.toHaveBeenCalled()
  })

  it("writes the sent marker only after durable outbox confirmation", async () => {
    state.candidateResult.data = [candidate()]
    mocks.sendEmail.mockResolvedValue({
      success: true,
      messageId: "message-1",
      outboxId: "outbox-1",
    })
    mocks.isEmailSendDeliveryConfirmed.mockResolvedValue(true)

    await expect(processPartialIntakeRecoveries()).resolves.toMatchObject({
      sent: 1,
    })
    expect(mocks.isEmailSendDeliveryConfirmed).toHaveBeenCalled()
    expect(mocks.finalizeOutboxSequenceDisposition).toHaveBeenCalledWith(
      expect.objectContaining({ id: "outbox-1" }),
      "sent",
    )
    expect(
      mocks.isEmailSendDeliveryConfirmed.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.finalizeOutboxSequenceDisposition.mock.invocationCallOrder[0],
    )
  })

  it("writes the suppression marker after a durable terminal provider gate", async () => {
    state.candidateResult.data = [candidate()]
    mocks.sendEmail.mockResolvedValue({
      success: false,
      suppressed: true,
      outboxId: "outbox-suppressed",
      retryable: false,
      outcome: {
        kind: "policy_suppressed",
        reason: "recipient_changed",
      },
    })
    mocks.isEmailSendDeliveryConfirmed.mockResolvedValue(false)

    await expect(processPartialIntakeRecoveries()).resolves.toMatchObject({
      policy_suppressed: 1,
    })
    expect(mocks.finalizeOutboxSequenceDisposition).toHaveBeenCalledWith(
      expect.objectContaining({ id: "outbox-suppressed" }),
      "suppressed",
    )
  })

  it("does not finalize after provider success whose sent write was not durable", async () => {
    state.candidateResult.data = [candidate()]
    mocks.sendEmail.mockResolvedValue({
      success: false,
      outboxId: "outbox-ambiguous",
      retryable: true,
      outcome: {
        kind: "transiently_blocked",
        reason: "outbox_sent_persistence_failed",
      },
    })
    mocks.isEmailSendDeliveryConfirmed.mockResolvedValue(false)

    await expect(processPartialIntakeRecoveries()).resolves.toMatchObject({
      sent: 0,
      transiently_blocked: 1,
    })
    expect(mocks.finalizeOutboxSequenceDisposition).not.toHaveBeenCalled()
  })
})
