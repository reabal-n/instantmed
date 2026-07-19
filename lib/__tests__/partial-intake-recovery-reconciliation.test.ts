import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CommunicationOutcome } from "@/lib/email/send/types"

const state = vi.hoisted(() => ({
  fromCalls: [] as string[],
  reconciliationResult: {
    data: [] as Array<{ recovery_tracking_id: string }>,
    error: null as { message: string } | null,
  },
  candidateResult: {
    data: [] as Array<Record<string, unknown>>,
    error: null as { message: string } | null,
  },
}))

const mocks = vi.hoisted(() => ({
  markPartialIntakeRecoveryCommunicationOutcome: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/email/partial-intake-recovery-policy", () => ({
  evaluatePartialIntakeRecoveryPolicy: vi.fn(),
  markPartialIntakeRecoveryCommunicationOutcome:
    mocks.markPartialIntakeRecoveryCommunicationOutcome,
  PARTIAL_RECOVERY_MAX_IDLE_HOURS: 6,
  PARTIAL_RECOVERY_MIN_IDLE_MINUTES: 60,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    rpc: () => state.reconciliationResult,
    from: (table: string) => {
      state.fromCalls.push(table)
      const chain = {
        eq: () => chain,
        gte: () => chain,
        is: () => chain,
        limit: async () => state.candidateResult,
        lte: () => chain,
        not: () => chain,
        order: () => chain,
        select: () => chain,
      }
      return chain
    },
  }),
}))

import {
  processPartialIntakeRecoveries,
  reconcileSentPartialIntakeRecoveryMarkers,
} from "@/lib/email/partial-intake-recovery"

describe("partial-intake recovery sent-marker reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.fromCalls = []
    state.reconciliationResult = { data: [], error: null }
    state.candidateResult = { data: [], error: null }
    mocks.markPartialIntakeRecoveryCommunicationOutcome.mockImplementation(
      async (_trackingId: string, outcome: CommunicationOutcome) => outcome,
    )
  })

  it("heals from confirmed sent outbox proof using only recovery_tracking_id", async () => {
    state.reconciliationResult.data = [
      { recovery_tracking_id: "tracking-1" },
      { recovery_tracking_id: "tracking-2" },
    ]

    await expect(
      reconcileSentPartialIntakeRecoveryMarkers(),
    ).resolves.toEqual({
      reconciled: 2,
      failed: 0,
    })

    expect(mocks.markPartialIntakeRecoveryCommunicationOutcome.mock.calls)
      .toEqual([
        ["tracking-1", { kind: "sent" }],
        ["tracking-2", { kind: "sent" }],
      ])
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("keeps marker write failures distinct from reconciled sent truth", async () => {
    state.reconciliationResult.data = [
      { recovery_tracking_id: "tracking-1" },
      { recovery_tracking_id: "tracking-2" },
    ]
    mocks.markPartialIntakeRecoveryCommunicationOutcome
      .mockResolvedValueOnce({ kind: "sent" })
      .mockResolvedValueOnce({
        kind: "transiently_blocked",
        reason: "recovery_marker_write_failed",
      })

    await expect(
      reconcileSentPartialIntakeRecoveryMarkers(),
    ).resolves.toEqual({
      reconciled: 1,
      failed: 1,
    })
  })

  it("surfaces an outbox query failure instead of treating it as no work", async () => {
    state.reconciliationResult.error = { message: "database unavailable" }

    await expect(
      reconcileSentPartialIntakeRecoveryMarkers(),
    ).rejects.toThrow(
      "Failed to fetch sent partial recovery outbox rows: database unavailable",
    )
    expect(mocks.markPartialIntakeRecoveryCommunicationOutcome)
      .not.toHaveBeenCalled()
  })

  it("reconciles before candidate lookup without changing public counters", async () => {
    await expect(processPartialIntakeRecoveries()).resolves.toEqual({
      found: 0,
      sent: 0,
      policy_suppressed: 0,
      transiently_blocked: 0,
      pending: 0,
      provider_failed: 0,
    })

    expect(state.fromCalls).toEqual(["partial_intakes"])
  })
})
