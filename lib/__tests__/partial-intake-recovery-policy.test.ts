import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  decryptJSONB: vi.fn(),
  getEmailBounceSuppressionDecision: vi.fn(),
  getEmailSuppressionDecisions: vi.fn(),
  queryCalls: [] as Array<{ method: string; args: unknown[] }>,
  selectResults: [] as Array<{ data: unknown; error: unknown }>,
  updateResults: [] as Array<{ data: unknown; error: unknown }>,
}))

vi.mock("server-only", () => ({}))

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
}))

vi.mock("@/lib/security/phi-encryption", () => ({
  decryptJSONB: mocks.decryptJSONB,
}))

vi.mock("@/lib/email/utils", () => ({
  getEmailBounceSuppressionDecision: mocks.getEmailBounceSuppressionDecision,
}))

vi.mock("@/lib/email/suppression", () => ({
  getEmailSuppressionDecisions: mocks.getEmailSuppressionDecisions,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      mocks.queryCalls.push({ method: "from", args: [table] })

      const selectChain = {
        select(...args: unknown[]) {
          mocks.queryCalls.push({ method: "select.select", args })
          return selectChain
        },
        eq(...args: unknown[]) {
          mocks.queryCalls.push({ method: "select.eq", args })
          return selectChain
        },
        limit(...args: unknown[]) {
          mocks.queryCalls.push({ method: "select.limit", args })
          return selectChain
        },
        maybeSingle() {
          mocks.queryCalls.push({ method: "select.maybeSingle", args: [] })
          return Promise.resolve(
            mocks.selectResults.shift() ?? { data: null, error: null }
          )
        },
        single() {
          mocks.queryCalls.push({ method: "select.single", args: [] })
          return Promise.resolve(
            mocks.selectResults.shift() ?? { data: null, error: null }
          )
        },
      }

      const updateChain = {
        eq(...args: unknown[]) {
          mocks.queryCalls.push({ method: "update.eq", args })
          return updateChain
        },
        is(...args: unknown[]) {
          mocks.queryCalls.push({ method: "update.is", args })
          return updateChain
        },
        select(...args: unknown[]) {
          mocks.queryCalls.push({ method: "update.select", args })
          return updateChain
        },
        maybeSingle() {
          mocks.queryCalls.push({ method: "update.maybeSingle", args: [] })
          return Promise.resolve(
            mocks.updateResults.shift() ?? { data: null, error: null }
          )
        },
        single() {
          mocks.queryCalls.push({ method: "update.single", args: [] })
          return Promise.resolve(
            mocks.updateResults.shift() ?? { data: null, error: null }
          )
        },
      }

      return {
        select(...args: unknown[]) {
          return selectChain.select(...args)
        },
        update(...args: unknown[]) {
          mocks.queryCalls.push({ method: "update", args })
          return updateChain
        },
      }
    },
  }),
}))

import {
  evaluatePartialIntakeRecoveryPolicy,
  markPartialIntakeRecoveryCommunicationOutcome,
} from "@/lib/email/partial-intake-recovery-policy"

const NOW = new Date("2026-07-19T08:00:00.000Z")
const TRACKING_ID = "a6bd50f7-ad78-4fba-9822-a89580b58bf7"
const SESSION_ID = "11111111-1111-4111-8111-111111111111"
const EMAIL = "patient@example.com"

function draftRow(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    recovery_tracking_id: TRACKING_ID,
    session_id: SESSION_ID,
    service_type: "med-cert",
    email: EMAIL,
    first_name: "Taylor",
    updated_at: "2026-07-19T07:00:00.000Z",
    expires_at: "2026-07-26T08:00:00.000Z",
    converted_to_intake_id: null,
    recovery_email_sent_at: null,
    recovery_email_suppressed_at: null,
    answers_encrypted: null,
    ...overrides,
  }
}

function queueDraft(row: Record<string, unknown>) {
  mocks.selectResults.push({ data: row, error: null })
}

function evaluateInitial(
  row: Record<string, unknown>,
  inputOverrides: Record<string, unknown> = {}
) {
  queueDraft(row)
  return evaluatePartialIntakeRecoveryPolicy({
    recoveryTrackingId: TRACKING_ID,
    expectedUpdatedAt: row.updated_at as string,
    expectedRecipient: EMAIL,
    mode: "initial",
    now: NOW,
    ...inputOverrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.queryCalls.length = 0
  mocks.selectResults.length = 0
  mocks.updateResults.length = 0

  mocks.decryptJSONB.mockResolvedValue({})
  mocks.getEmailBounceSuppressionDecision.mockResolvedValue({
    kind: "allowed",
  })
  mocks.getEmailSuppressionDecisions.mockResolvedValue(
    new Map([[EMAIL, { kind: "allowed" }]]),
  )
})

describe("evaluatePartialIntakeRecoveryPolicy", () => {
  it("rereads the authoritative draft by recovery tracking ID", async () => {
    const result = await evaluateInitial(draftRow())

    expect(result).toMatchObject({
      kind: "allowed",
      draft: {
        recoveryTrackingId: TRACKING_ID,
        sessionId: SESSION_ID,
        email: EMAIL,
      },
    })
    expect(mocks.queryCalls).toContainEqual({
      method: "select.eq",
      args: ["recovery_tracking_id", TRACKING_ID],
    })
    expect(mocks.queryCalls).not.toContainEqual({
      method: "select.eq",
      args: ["session_id", SESSION_ID],
    })
  })

  it.each([
    ["the exact 60-minute idle boundary", "2026-07-19T07:00:00.000Z"],
    ["the exact 6-hour idle boundary", "2026-07-19T02:00:00.000Z"],
  ])("allows initial recovery at %s", async (_label, updatedAt) => {
    const result = await evaluateInitial(
      draftRow({ updated_at: updatedAt })
    )

    expect(result).toMatchObject({ kind: "allowed" })
  })

  it("transiently blocks initial recovery before 60 minutes idle", async () => {
    const result = await evaluateInitial(
      draftRow({ updated_at: "2026-07-19T07:00:00.001Z" })
    )

    expect(result).toMatchObject({ kind: "transiently_blocked" })
  })

  it("terminally suppresses initial recovery after the 6-hour window", async () => {
    const result = await evaluateInitial(
      draftRow({ updated_at: "2026-07-19T01:59:59.999Z" })
    )

    expect(result).toMatchObject({ kind: "policy_suppressed" })
  })

  it("allows dispatcher retries beyond 6 hours when the draft remains eligible", async () => {
    const row = draftRow({ updated_at: "2026-07-18T08:00:00.000Z" })
    queueDraft(row)

    const result = await evaluatePartialIntakeRecoveryPolicy({
      recoveryTrackingId: TRACKING_ID,
      expectedRecipient: EMAIL,
      mode: "dispatcher",
      now: NOW,
    })

    expect(result).toMatchObject({ kind: "allowed" })
  })

  it("transiently blocks an initial send when the draft snapshot changed", async () => {
    const result = await evaluateInitial(draftRow(), {
      expectedUpdatedAt: "2026-07-19T06:59:59.000Z",
    })

    expect(result).toMatchObject({ kind: "transiently_blocked" })
  })

  it("terminally suppresses an initial send when the recipient changed", async () => {
    const result = await evaluateInitial(
      draftRow({ email: "changed@example.com" })
    )

    expect(result).toMatchObject({ kind: "policy_suppressed" })
  })

  it.each([
    [
      "a converted draft",
      { converted_to_intake_id: "intake-123" },
    ],
    [
      "an already-sent draft",
      { recovery_email_sent_at: "2026-07-19T07:30:00.000Z" },
    ],
    [
      "an already-suppressed draft",
      { recovery_email_suppressed_at: "2026-07-19T07:30:00.000Z" },
    ],
    [
      "an expired draft",
      { expires_at: "2026-07-19T08:00:00.000Z" },
    ],
  ])("terminally suppresses %s", async (_label, overrides) => {
    const result = await evaluateInitial(draftRow(overrides))

    expect(result).toMatchObject({ kind: "policy_suppressed" })
  })

  it("transiently blocks a draft query failure", async () => {
    mocks.selectResults.push({
      data: null,
      error: { message: "database unavailable" },
    })

    const result = await evaluatePartialIntakeRecoveryPolicy({
      recoveryTrackingId: TRACKING_ID,
      expectedUpdatedAt: "2026-07-19T07:00:00.000Z",
      expectedRecipient: EMAIL,
      mode: "initial",
      now: NOW,
    })

    expect(result).toMatchObject({ kind: "transiently_blocked" })
  })

  it("terminally suppresses an explicitly suppressed address", async () => {
    mocks.getEmailSuppressionDecisions.mockResolvedValue(
      new Map([
        [
          EMAIL,
          {
            kind: "policy_suppressed",
            reason: "email_suppressed",
          },
        ],
      ])
    )

    const result = await evaluateInitial(draftRow())

    expect(result).toMatchObject({ kind: "policy_suppressed" })
  })

  it("transiently blocks when suppression status cannot be established", async () => {
    mocks.getEmailSuppressionDecisions.mockResolvedValue(
      new Map([
        [
          EMAIL,
          {
            kind: "transiently_blocked",
            reason: "suppression_lookup_failed",
          },
        ],
      ])
    )

    const result = await evaluateInitial(draftRow())

    expect(result).toMatchObject({ kind: "transiently_blocked" })
  })

  it("terminally suppresses a hard-bounced address", async () => {
    mocks.getEmailBounceSuppressionDecision.mockResolvedValue({
      kind: "policy_suppressed",
      reason: "hard_bounce",
    })

    const result = await evaluateInitial(draftRow())

    expect(result).toMatchObject({ kind: "policy_suppressed" })
  })

  it("transiently blocks when encrypted consult answers cannot be decrypted", async () => {
    mocks.decryptJSONB.mockRejectedValue(new Error("KMS unavailable"))

    const result = await evaluateInitial(
      draftRow({
        service_type: "consult",
        answers_encrypted: { ciphertext: "encrypted" },
      })
    )

    expect(result).toMatchObject({ kind: "transiently_blocked" })
  })

  it.each([
    ["an invalid service", "unknown-service", null, {}],
    ["a bare consult", "consult", { ciphertext: "encrypted" }, {}],
    [
      "a gated consult subtype",
      "consult",
      { ciphertext: "encrypted" },
      { consultSubtype: "weight_loss" },
    ],
  ])(
    "terminally suppresses %s instead of generating a generic resume route",
    async (_label, serviceType, answersEncrypted, decryptedAnswers) => {
      mocks.decryptJSONB.mockResolvedValue(decryptedAnswers)

      const result = await evaluateInitial(
        draftRow({
          service_type: serviceType,
          answers_encrypted: answersEncrypted,
        })
      )

      expect(result).toMatchObject({ kind: "policy_suppressed" })
    }
  )
})

describe("markPartialIntakeRecoveryCommunicationOutcome", () => {
  it.each([
    [
      "sent",
      { kind: "sent", messageId: "email-123" } as const,
      "recovery_email_sent_at",
    ],
    [
      "policy suppressed",
      {
        kind: "policy_suppressed",
        reason: "email_suppressed",
      } as const,
      "recovery_email_suppressed_at",
    ],
  ])(
    "CAS-marks a %s outcome while both terminal markers are null",
    async (_label, outcome, markerColumn) => {
      mocks.updateResults.push({
        data: { recovery_tracking_id: TRACKING_ID },
        error: null,
      })

      const result =
        await markPartialIntakeRecoveryCommunicationOutcome(
          TRACKING_ID,
          outcome
        )

      expect(result).toEqual(outcome)
      expect(mocks.queryCalls).toContainEqual({
        method: "update.eq",
        args: ["recovery_tracking_id", TRACKING_ID],
      })
      expect(mocks.queryCalls).toContainEqual({
        method: "update.is",
        args: ["recovery_email_sent_at", null],
      })
      expect(mocks.queryCalls).toContainEqual({
        method: "update.is",
        args: ["recovery_email_suppressed_at", null],
      })
      expect(mocks.queryCalls).toContainEqual({
        method: "update",
        args: [expect.objectContaining({ [markerColumn]: expect.any(String) })],
      })
    }
  )

  it("treats a zero-row CAS as idempotent when the requested marker is already set", async () => {
    const outcome = { kind: "sent" as const, messageId: "email-123" }
    mocks.updateResults.push({ data: null, error: null })
    mocks.selectResults.push({
      data: draftRow({
        recovery_email_sent_at: "2026-07-19T08:00:00.000Z",
      }),
      error: null,
    })

    const result =
      await markPartialIntakeRecoveryCommunicationOutcome(
        TRACKING_ID,
        outcome
      )

    expect(result).toEqual(outcome)
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it("reports a zero-row CAS conflict when the opposite terminal marker won", async () => {
    const outcome = { kind: "sent" as const, messageId: "email-123" }
    mocks.updateResults.push({ data: null, error: null })
    mocks.selectResults.push({
      data: draftRow({
        recovery_email_suppressed_at: "2026-07-19T08:00:00.000Z",
      }),
      error: null,
    })

    const result =
      await markPartialIntakeRecoveryCommunicationOutcome(
        TRACKING_ID,
        outcome
      )

    expect(result).toEqual({
      kind: "transiently_blocked",
      reason: "recovery_marker_invariant_conflict",
    })
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("recovery"),
      expect.objectContaining({ level: "error" })
    )
  })

  it("returns a transient outcome when the marker target disappears", async () => {
    mocks.updateResults.push({ data: null, error: null })
    mocks.selectResults.push({ data: null, error: null })

    const result =
      await markPartialIntakeRecoveryCommunicationOutcome(TRACKING_ID, {
        kind: "sent",
        messageId: "email-123",
      })

    expect(result).toEqual({
      kind: "transiently_blocked",
      reason: "recovery_marker_write_failed",
    })
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("disappeared"),
      expect.objectContaining({ level: "error" }),
    )
  })

  it("returns a transient outcome when the marker write fails", async () => {
    mocks.updateResults.push({
      data: null,
      error: { message: "database unavailable" },
    })

    const result =
      await markPartialIntakeRecoveryCommunicationOutcome(TRACKING_ID, {
        kind: "sent",
        messageId: "email-123",
      })

    expect(result).toMatchObject({ kind: "transiently_blocked" })
  })
})
