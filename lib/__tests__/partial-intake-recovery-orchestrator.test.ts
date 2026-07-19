import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  CommunicationOutcome,
  SendEmailResult,
} from "@/lib/email/send/types"

interface PartialRecoveryCandidate {
  answers_encrypted: null
  converted_to_intake_id: null
  email: string
  expires_at: string
  first_name: string
  recovery_email_sent_at: null
  recovery_email_suppressed_at: null
  recovery_tracking_id: string
  service_type: "med-cert"
  session_id: string
  updated_at: string
}

const state = vi.hoisted(() => ({
  candidateResult: {
    data: [] as PartialRecoveryCandidate[],
    error: null as { message: string } | null,
  },
  filters: [] as Array<{
    method: "eq" | "gte" | "in" | "is" | "lte" | "not" | "order"
    column: string
    value: unknown
  }>,
  limits: [] as number[],
  updates: [] as Array<Record<string, unknown>>,
}))

const mocks = vi.hoisted(() => ({
  decryptJSONB: vi.fn(),
  evaluatePartialIntakeRecoveryPolicy: vi.fn(),
  isEmailSendDeliveryConfirmed: vi.fn(),
  markPartialIntakeRecoveryCommunicationOutcome: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/config/env", () => ({
  getAppUrl: () => "https://instantmed.example",
}))

vi.mock("@/lib/email/outbox-delivery", () => ({
  isEmailSendDeliveryConfirmed: mocks.isEmailSendDeliveryConfirmed,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/email/partial-intake-recovery-policy", () => ({
  evaluatePartialIntakeRecoveryPolicy:
    mocks.evaluatePartialIntakeRecoveryPolicy,
  markPartialIntakeRecoveryCommunicationOutcome:
    mocks.markPartialIntakeRecoveryCommunicationOutcome,
  PARTIAL_RECOVERY_MAX_IDLE_HOURS: 6,
  PARTIAL_RECOVERY_MIN_IDLE_MINUTES: 60,
}))

vi.mock("@/lib/security/phi-encryption", () => ({
  decryptJSONB: mocks.decryptJSONB,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    rpc: async () => ({ data: [], error: null }),
    from: () => ({
      select: () => {
        const filters: Array<{
          column: string
          method: "eq" | "gte" | "in" | "is" | "lte" | "not" | "order"
          value: unknown
        }> = []
        const chain = {
          eq: (column: string, value: unknown) => {
            const filter = { method: "eq" as const, column, value }
            filters.push(filter)
            state.filters.push(filter)
            return chain
          },
          gte: (column: string, value: unknown) => {
            const filter = { method: "gte" as const, column, value }
            filters.push(filter)
            state.filters.push(filter)
            return chain
          },
          in: (column: string, value: unknown) => {
            const filter = { method: "in" as const, column, value }
            filters.push(filter)
            state.filters.push(filter)
            return chain
          },
          is: (column: string, value: unknown) => {
            const filter = { method: "is" as const, column, value }
            filters.push(filter)
            state.filters.push(filter)
            return chain
          },
          limit: async (limit: number) => {
            state.limits.push(limit)
            return state.candidateResult
          },
          lte: (column: string, value: unknown) => {
            const filter = { method: "lte" as const, column, value }
            filters.push(filter)
            state.filters.push(filter)
            return chain
          },
          maybeSingle: async () => {
            const trackingId = filters.find(
              (filter) => filter.column === "recovery_tracking_id",
            )?.value
            const row = state.candidateResult.data.find(
              (candidate) => candidate.recovery_tracking_id === trackingId,
            )
            return { data: row ?? null, error: state.candidateResult.error }
          },
          not: (column: string, value: unknown) => {
            const filter = { method: "not" as const, column, value }
            filters.push(filter)
            state.filters.push(filter)
            return chain
          },
          order: (column: string, value: unknown) => {
            const filter = { method: "order" as const, column, value }
            filters.push(filter)
            state.filters.push(filter)
            return chain
          },
        }
        return chain
      },
      update: (values: Record<string, unknown>) => {
        state.updates.push(values)
        const filters: Array<{ column: string; value: unknown }> = []
        const chain = {
          eq: (column: string, value: unknown) => {
            filters.push({ column, value })
            return chain
          },
          is: () => chain,
          maybeSingle: async () => ({
            data: {
              recovery_tracking_id: filters.find(
                (filter) => filter.column === "recovery_tracking_id",
              )?.value ?? "tracking-marker",
            },
            error: null,
          }),
          select: () => chain,
        }
        return chain
      },
    }),
  }),
}))

import * as recoveryModule from "@/lib/email/partial-intake-recovery"

type RecoveryModule = typeof recoveryModule & {
  findPartialIntakeRecoveryCandidates: (
    now: Date,
  ) => Promise<PartialRecoveryCandidate[]>
}

const recovery = recoveryModule as RecoveryModule
const NOW = new Date("2026-07-20T00:00:00.000Z")

function candidate(
  trackingId: string,
  overrides: Partial<PartialRecoveryCandidate> = {},
): PartialRecoveryCandidate {
  const sessionSuffix = trackingId.match(/\d+$/)?.[0].padStart(12, "0") ??
    "000000000001"

  return {
    answers_encrypted: null,
    converted_to_intake_id: null,
    email: "alex.taylor@patientmail.com.au",
    expires_at: "2026-07-25T00:00:00.000Z",
    first_name: "Alex",
    recovery_email_sent_at: null,
    recovery_email_suppressed_at: null,
    recovery_tracking_id: trackingId,
    service_type: "med-cert",
    session_id: `11111111-1111-4111-8111-${sessionSuffix}`,
    updated_at: "2026-07-19T22:00:00.000Z",
    ...overrides,
  }
}

function allowedDecision(row: PartialRecoveryCandidate) {
  return {
    kind: "allowed" as const,
    draft: {
      recoveryTrackingId: row.recovery_tracking_id,
      sessionId: row.session_id,
      serviceType: row.service_type,
      email: row.email,
      firstName: row.first_name,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
      resumeUrl:
        `https://instantmed.example/request?service=med-cert&d=${row.session_id}`,
    },
  }
}

function resultFor(outcome: CommunicationOutcome): SendEmailResult {
  return {
    success: outcome.kind === "sent" || outcome.kind === "pending",
    outboxId: outcome.kind === "sent" || outcome.kind === "pending"
      ? outcome.outboxId
      : undefined,
    suppressed: outcome.kind === "policy_suppressed",
    outcome,
  }
}

describe("partial-intake recovery candidate truth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.candidateResult = { data: [], error: null }
    state.filters = []
    state.limits = []
    state.updates = []
    mocks.decryptJSONB.mockResolvedValue({})
    mocks.evaluatePartialIntakeRecoveryPolicy.mockImplementation(
      async ({ recoveryTrackingId }: { recoveryTrackingId: string }) => {
        const row = state.candidateResult.data.find(
          (value) => value.recovery_tracking_id === recoveryTrackingId,
        ) as PartialRecoveryCandidate
        return allowedDecision(row)
      },
    )
    mocks.markPartialIntakeRecoveryCommunicationOutcome.mockImplementation(
      async (_trackingId: string, outcome: CommunicationOutcome) => {
        if (outcome.kind === "sent") {
          state.updates.push({ recovery_email_sent_at: expect.any(String) })
        } else if (outcome.kind === "policy_suppressed") {
          state.updates.push({
            recovery_email_suppressed_at: expect.any(String),
          })
        }
        return outcome
      },
    )
    mocks.isEmailSendDeliveryConfirmed.mockImplementation(
      async (result: SendEmailResult) => result.outcome?.kind === "sent",
    )
  })

  it("uses one supplied now for inclusive 60-minute and 6-hour boundaries", async () => {
    state.candidateResult.data = [candidate("tracking-1")]

    await recovery.findPartialIntakeRecoveryCandidates(NOW)

    expect(state.filters).toContainEqual({
      method: "lte",
      column: "updated_at",
      value: "2026-07-19T23:00:00.000Z",
    })
    expect(state.filters).toContainEqual({
      method: "gte",
      column: "updated_at",
      value: "2026-07-19T18:00:00.000Z",
    })
    expect(state.filters).toContainEqual({
      method: "is",
      column: "converted_to_intake_id",
      value: null,
    })
    expect(state.filters).toContainEqual({
      method: "is",
      column: "recovery_email_sent_at",
      value: null,
    })
    expect(state.filters).toContainEqual({
      method: "is",
      column: "recovery_email_suppressed_at",
      value: null,
    })
  })

  it("throws a candidate query error instead of flattening it into no work", async () => {
    state.candidateResult.error = { message: "database unavailable" }

    await expect(
      recovery.findPartialIntakeRecoveryCandidates(NOW),
    ).rejects.toThrow("database unavailable")
  })

  it("returns an empty batch only for a successful empty query", async () => {
    await expect(
      recovery.findPartialIntakeRecoveryCandidates(NOW),
    ).resolves.toEqual([])
  })
})

describe("partial-intake recovery orchestration truth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.candidateResult = { data: [], error: null }
    state.filters = []
    state.limits = []
    state.updates = []
    mocks.decryptJSONB.mockResolvedValue({})
    mocks.evaluatePartialIntakeRecoveryPolicy.mockImplementation(
      async ({ recoveryTrackingId }: { recoveryTrackingId: string }) => {
        const row = state.candidateResult.data.find(
          (value) => value.recovery_tracking_id === recoveryTrackingId,
        ) as PartialRecoveryCandidate
        return allowedDecision(row)
      },
    )
    mocks.markPartialIntakeRecoveryCommunicationOutcome.mockImplementation(
      async (_trackingId: string, outcome: CommunicationOutcome) => {
        if (outcome.kind === "sent") {
          state.updates.push({ recovery_email_sent_at: expect.any(String) })
        } else if (outcome.kind === "policy_suppressed") {
          state.updates.push({
            recovery_email_suppressed_at: expect.any(String),
          })
        }
        return outcome
      },
    )
    mocks.isEmailSendDeliveryConfirmed.mockImplementation(
      async (result: SendEmailResult) => result.outcome?.kind === "sent",
    )
  })

  it("uses only the non-bearer tracking id for metadata and the explicit key", async () => {
    state.candidateResult.data = [candidate("tracking-1")]
    mocks.sendEmail.mockResolvedValue(resultFor({
      kind: "pending",
      outboxId: "outbox-1",
    }))

    await recovery.processPartialIntakeRecoveries()

    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "partial-intake-recovery:tracking-1",
      metadata: {
        recovery_tracking_id: "tracking-1",
      },
    }))
    const call = mocks.sendEmail.mock.calls[0]?.[0]
    expect(JSON.stringify(call?.metadata)).not.toContain("session")
    expect(JSON.stringify(call?.metadata)).not.toContain("hash")
  })

  it("gives two drafts at one address distinct tracking-scoped keys", async () => {
    state.candidateResult.data = [
      candidate("tracking-1"),
      candidate("tracking-2"),
    ]
    mocks.sendEmail.mockResolvedValue(resultFor({ kind: "pending" }))

    await recovery.processPartialIntakeRecoveries()

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail.mock.calls.map(([input]) => input.idempotencyKey)).toEqual([
      "partial-intake-recovery:tracking-1",
      "partial-intake-recovery:tracking-2",
    ])
  })

  it("reports the exact five lifecycle outcome counters", async () => {
    state.candidateResult.data = [
      candidate("tracking-1"),
      candidate("tracking-2"),
      candidate("tracking-3"),
      candidate("tracking-4"),
      candidate("tracking-5"),
    ]
    mocks.sendEmail
      .mockResolvedValueOnce(resultFor({
        kind: "sent",
        messageId: "message-1",
        outboxId: "outbox-1",
      }))
      .mockResolvedValueOnce(resultFor({
        kind: "policy_suppressed",
        reason: "address_suppressed",
      }))
      .mockResolvedValueOnce(resultFor({
        kind: "transiently_blocked",
        reason: "suppression_read_failed",
      }))
      .mockResolvedValueOnce(resultFor({
        kind: "pending",
        outboxId: "outbox-4",
      }))
      .mockResolvedValueOnce(resultFor({
        kind: "provider_failed",
        error: "provider rejected request",
        retryable: false,
        outboxId: "outbox-5",
      }))

    await expect(recovery.processPartialIntakeRecoveries()).resolves.toEqual({
      found: 5,
      sent: 1,
      policy_suppressed: 1,
      transiently_blocked: 1,
      pending: 1,
      provider_failed: 1,
      testSkipped: 0,
    })
  })

  it("durably suppresses synthetic identities without provider contact", async () => {
    state.candidateResult.data = [
      candidate("tracking-1", {
        email: "patient@example.com",
        first_name: "E2E Test Patient",
      }),
    ]
    mocks.evaluatePartialIntakeRecoveryPolicy.mockResolvedValueOnce({
      kind: "policy_suppressed",
      reason: "test_identity",
    })

    await expect(recovery.processPartialIntakeRecoveries()).resolves.toEqual({
      found: 1,
      sent: 0,
      policy_suppressed: 1,
      transiently_blocked: 0,
      pending: 0,
      provider_failed: 0,
      testSkipped: 1,
    })

    expect(
      mocks.markPartialIntakeRecoveryCommunicationOutcome,
    ).toHaveBeenCalledWith("tracking-1", {
      kind: "policy_suppressed",
      reason: "test_identity",
    })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("writes sent only after durable confirmation and keeps suppression separate", async () => {
    state.candidateResult.data = [
      candidate("tracking-1"),
      candidate("tracking-2"),
      candidate("tracking-3"),
    ]
    mocks.sendEmail
      .mockResolvedValueOnce(resultFor({
        kind: "sent",
        outboxId: "outbox-1",
      }))
      .mockResolvedValueOnce(resultFor({
        kind: "policy_suppressed",
        reason: "address_suppressed",
      }))
      .mockResolvedValueOnce(resultFor({
        kind: "pending",
        outboxId: "outbox-3",
      }))
    mocks.isEmailSendDeliveryConfirmed
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)

    await recovery.processPartialIntakeRecoveries()

    expect(state.updates.filter(
      (update) => "recovery_email_sent_at" in update,
    )).toHaveLength(1)
    expect(state.updates.filter(
      (update) => "recovery_email_suppressed_at" in update,
    )).toHaveLength(1)
    expect(state.updates.some(
      (update) => (
        "recovery_email_sent_at" in update &&
        "recovery_email_suppressed_at" in update
      ),
    )).toBe(false)
  })
})
