import { beforeEach, describe, expect, it, vi } from "vitest"

import { mockSupabaseFrom, mockSupabaseSingle, resetAllMocks } from "./setup"

const DECLINE_UPDATED_AT = "2026-08-16T00:00:00.111Z"

const mocks = vi.hoisted(() => ({
  getStripeLivemode: vi.fn(),
  processRefund: vi.fn(),
  requireRoleOrNull: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: (...args: unknown[]) => mocks.requireRoleOrNull(...args),
}))

vi.mock("@/lib/config/env", () => ({
  getStripeLivemode: () => mocks.getStripeLivemode(),
}))

vi.mock("@/app/actions/decline-refund", () => ({
  processRefund: (...args: unknown[]) => mocks.processRefund(...args),
  REFUND_ON_DECLINE_CATEGORIES: [
    "medical_certificate",
    "prescription",
    "consult",
  ],
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  trackIntakeFunnelStep: vi.fn(),
}))

vi.mock("@/lib/data/intake-events", () => ({
  logStatusChange: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/audit/compliance-audit", () => ({
  logTriageDeclined: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/email/senders", () => ({
  sendRequestDeclinedEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/security/phi-field-wrappers", () => ({
  prepareDoctorNotesWrite: vi.fn(async (notes: string) => ({
    doctor_notes: notes,
    doctor_notes_enc: `encrypted:${notes}`,
  })),
}))

import { declineIntake } from "@/app/actions/decline-intake"

type UpdateChain = Record<string, ReturnType<typeof vi.fn>>

function makeIntakeRow(overrides: Record<string, unknown> = {}) {
  return {
    amount_cents: 1_995,
    category: "medical_certificate",
    id: "intake-123",
    patient: [{
      auth_user_id: "test-auth-user-id",
      email: "patient@example.test",
      full_name: "Test Patient",
      id: "patient-1",
    }],
    patient_id: "patient-1",
    payment_id: "cs_test_abc",
    payment_status: "paid",
    refund_amount_cents: 0,
    refund_status: "not_applicable",
    refund_stripe_id: null,
    script_sent: false,
    status: "paid",
    stripe_payment_intent_id: "pi_test_xyz",
    subtype: "work",
    ...overrides,
  }
}

function mockActor(role: "admin" | "doctor" = "doctor") {
  mocks.requireRoleOrNull.mockResolvedValue({
    profile: {
      email: `${role}@example.test`,
      id: `${role}-1`,
      role,
    },
    user: { id: `auth-${role}-1` },
  })
}

function mockDeclineFlow(intake: ReturnType<typeof makeIntakeRow>) {
  mockSupabaseSingle
    .mockResolvedValueOnce({ data: intake, error: null })
    .mockResolvedValueOnce({
      data: { id: intake.id, updated_at: DECLINE_UPDATED_AT },
      error: null,
    })
}

function updateEntries(): Array<{
  chain: UpdateChain
  payload: Record<string, unknown>
}> {
  return mockSupabaseFrom.mock.results.flatMap((result) => {
    const chain = result.value as UpdateChain
    return (chain.update?.mock.calls ?? []).map((call) => ({
      chain,
      payload: call[0] as Record<string, unknown>,
    }))
  })
}

function declineUpdate() {
  return updateEntries().find(({ payload }) => payload.status === "declined")
}

describe("declineIntake", () => {
  beforeEach(() => {
    resetAllMocks()
    delete process.env.E2E_MODE
    delete process.env.PLAYWRIGHT
    delete process.env.VERCEL_ENV
    mockSupabaseSingle.mockReset()
    mocks.getStripeLivemode.mockReset()
    mocks.getStripeLivemode.mockReturnValue(false)
    mocks.processRefund.mockReset()
    mocks.processRefund.mockResolvedValue({
      amount: 1_995,
      status: "pending",
      stripeRefundId: "re_decline",
    })
    mocks.requireRoleOrNull.mockReset()
  })

  describe("actor and intake gates", () => {
    it("rejects unauthenticated or unauthorized actors before reading the intake", async () => {
      mocks.requireRoleOrNull.mockResolvedValue(null)

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(mocks.requireRoleOrNull).toHaveBeenCalledWith(["doctor", "admin"])
      expect(result).toEqual({
        error: "Only doctors and admins can decline requests",
        success: false,
      })
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it.each(["doctor", "admin"] as const)(
      "accepts an authenticated %s",
      async (role) => {
        mockActor(role)
        mockDeclineFlow(makeIntakeRow())

        const result = await declineIntake({ intakeId: "intake-123" })

        expect(result.success).toBe(true)
        expect(mocks.processRefund).toHaveBeenCalledOnce()
      },
    )

    it("returns not found without committing a decline", async () => {
      mockActor()
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "not found" },
      })

      const result = await declineIntake({ intakeId: "missing" })

      expect(result).toEqual({ error: "Request not found", success: false })
      expect(declineUpdate()).toBeUndefined()
      expect(mocks.processRefund).not.toHaveBeenCalled()
    })

    it("returns idempotently when the intake is already declined", async () => {
      mockActor()
      mockSupabaseSingle.mockResolvedValueOnce({
        data: makeIntakeRow({ status: "declined" }),
        error: null,
      })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result).toEqual({ alreadyDeclined: true, success: true })
      expect(declineUpdate()).toBeUndefined()
      expect(mocks.getStripeLivemode).not.toHaveBeenCalled()
      expect(mocks.processRefund).not.toHaveBeenCalled()
    })

    it("rejects a non-declinable status before refund routing", async () => {
      mockActor()
      mockSupabaseSingle.mockResolvedValueOnce({
        data: makeIntakeRow({ status: "approved" }),
        error: null,
      })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result).toEqual({
        error: "Cannot decline request in 'approved' status",
        success: false,
      })
      expect(declineUpdate()).toBeUndefined()
      expect(mocks.processRefund).not.toHaveBeenCalled()
    })
  })

  describe("prescription fulfilment boundary", () => {
    it("rejects a prescription with durable script-sent evidence", async () => {
      mockActor()
      mockSupabaseSingle.mockResolvedValueOnce({
        data: makeIntakeRow({
          category: "prescription",
          script_sent: true,
          status: "awaiting_script",
        }),
        error: null,
      })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result).toEqual({
        error: "Cannot decline this request after the prescription has been recorded.",
        success: false,
      })
      expect(declineUpdate()).toBeUndefined()
      expect(mocks.processRefund).not.toHaveBeenCalled()
    })

    it("fails without refunding when fulfilment wins the optimistic update race", async () => {
      mockActor()
      mockSupabaseSingle
        .mockResolvedValueOnce({
          data: makeIntakeRow({
            category: "prescription",
            script_sent: false,
            status: "awaiting_script",
          }),
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116", message: "No rows returned" },
        })

      const result = await declineIntake({ intakeId: "intake-123" })
      const update = declineUpdate()

      expect(result).toEqual({
        error: "Request status or prescription fulfilment changed. Please refresh and try again.",
        success: false,
      })
      expect(update?.chain.not).toHaveBeenCalledWith("script_sent", "is", true)
      expect(mocks.processRefund).not.toHaveBeenCalled()
    })
  })

  describe("refund entitlement", () => {
    it.each([
      { amountCents: 1_995, category: "medical_certificate" },
      { amountCents: 2_995, category: "prescription" },
      { amountCents: 4_995, category: "consult" },
    ])("routes a full $category entitlement to the refund owner", async ({
      amountCents,
      category,
    }) => {
      mockActor()
      const intake = makeIntakeRow({ amount_cents: amountCents, category })
      mockDeclineFlow(intake)
      mocks.processRefund.mockResolvedValueOnce({
        amount: amountCents,
        status: "pending",
        stripeRefundId: `re_${category}`,
      })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(mocks.processRefund).toHaveBeenCalledWith(
        "intake-123",
        expect.objectContaining({
          amount_cents: amountCents,
          category,
          refund_amount_cents: 0,
        }),
        "doctor-1",
        DECLINE_UPDATED_AT,
      )
      expect(result.refund).toEqual({
        amount: amountCents,
        status: "pending",
        stripeRefundId: `re_${category}`,
      })
    })

    it("preserves the full target entitlement after a prior partial refund", async () => {
      mockActor()
      const intake = makeIntakeRow({
        amount_cents: 4_995,
        category: "consult",
        payment_status: "partially_refunded",
        refund_amount_cents: 995,
        refund_status: "succeeded",
        refund_stripe_id: "re_priority_fee",
      })
      mockDeclineFlow(intake)
      mocks.processRefund.mockResolvedValueOnce({
        amount: 4_000,
        status: "pending",
        stripeRefundId: "re_decline_topup",
      })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(mocks.processRefund).toHaveBeenCalledWith(
        "intake-123",
        expect.objectContaining({
          amount_cents: 4_995,
          payment_status: "partially_refunded",
          refund_amount_cents: 995,
        }),
        "doctor-1",
        DECLINE_UPDATED_AT,
      )
      expect(result.refund).toEqual({
        amount: 4_000,
        status: "pending",
        stripeRefundId: "re_decline_topup",
      })
    })

    it.each(["referral_letter", "pathology", null])(
      "marks refundable category=%s as ineligible without invoking the refund owner",
      async (category) => {
        mockActor()
        mockDeclineFlow(makeIntakeRow({ category }))

        const result = await declineIntake({ intakeId: "intake-123" })

        expect(result.refund).toEqual({ status: "not_eligible" })
        expect(mocks.getStripeLivemode).not.toHaveBeenCalled()
        expect(mocks.processRefund).not.toHaveBeenCalled()
        expect(updateEntries().map(({ payload }) => payload)).toContainEqual(
          expect.objectContaining({ refund_status: "not_eligible" }),
        )
      },
    )

    it("does not create a refund obligation for an unpaid intake", async () => {
      mockActor()
      mockDeclineFlow(makeIntakeRow({ payment_status: "pending_payment" }))

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result.refund).toEqual({ status: "not_applicable" })
      expect(declineUpdate()?.payload).not.toHaveProperty(
        "refund_obligation_livemode",
      )
      expect(mocks.getStripeLivemode).not.toHaveBeenCalled()
      expect(mocks.processRefund).not.toHaveBeenCalled()
    })
  })

  describe("durable Stripe mode snapshot", () => {
    it.each([false, true])(
      "atomically records refund_obligation_livemode=%s before a real refund",
      async (livemode) => {
        mockActor()
        mocks.getStripeLivemode.mockReturnValue(livemode)
        mockDeclineFlow(makeIntakeRow())

        const result = await declineIntake({ intakeId: "intake-123" })
        const update = declineUpdate()

        expect(result.success).toBe(true)
        expect(update?.payload).toEqual(expect.objectContaining({
          refund_obligation_livemode: livemode,
          status: "declined",
        }))
        expect(update?.chain.update.mock.invocationCallOrder[0]).toBeLessThan(
          mocks.processRefund.mock.invocationCallOrder[0],
        )
      },
    )

    it("stops before the decline commit when Stripe mode cannot be determined", async () => {
      mockActor()
      mocks.getStripeLivemode.mockImplementation(() => {
        throw new Error("STRIPE_SECRET_KEY mode is invalid")
      })
      mockSupabaseSingle.mockResolvedValueOnce({
        data: makeIntakeRow(),
        error: null,
      })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result).toEqual({
        error: "Refund processing is temporarily unavailable. The request was not declined.",
        success: false,
      })
      expect(declineUpdate()).toBeUndefined()
      expect(mocks.processRefund).not.toHaveBeenCalled()
    })
  })

  describe("E2E-only refund skip", () => {
    it.each([
      ["PLAYWRIGHT", "1"],
      ["E2E_MODE", "true"],
    ] as const)("skips Stripe only when %s=%s", async (key, value) => {
      process.env[key] = value
      mockActor()
      mockDeclineFlow(makeIntakeRow({ category: "consult" }))

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result.refund).toEqual({ status: "skipped_e2e" })
      expect(declineUpdate()?.payload).not.toHaveProperty(
        "refund_obligation_livemode",
      )
      expect(mocks.getStripeLivemode).not.toHaveBeenCalled()
      expect(mocks.processRefund).not.toHaveBeenCalled()
      expect(updateEntries().map(({ payload }) => payload)).toContainEqual(
        expect.objectContaining({ refund_status: "skipped_e2e" }),
      )
    })

    it.each(["production", "preview"] as const)(
      "never skips a refund in the Vercel %s environment",
      async (vercelEnv) => {
        process.env.PLAYWRIGHT = "1"
        process.env.VERCEL_ENV = vercelEnv
        mockActor()
        mockDeclineFlow(makeIntakeRow({ category: "consult" }))

        const result = await declineIntake({ intakeId: "intake-123" })

        expect(result.refund).toEqual({
          amount: 1_995,
          status: "pending",
          stripeRefundId: "re_decline",
        })
        expect(declineUpdate()?.payload).toEqual(expect.objectContaining({
          refund_obligation_livemode: false,
          status: "declined",
        }))
        expect(mocks.getStripeLivemode).toHaveBeenCalledOnce()
        expect(mocks.processRefund).toHaveBeenCalledOnce()
      },
    )
  })
})
