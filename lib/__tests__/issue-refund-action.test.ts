/**
 * Boundary tests for the manual refund action.
 *
 * The durable Stripe mutation protocol is owned by
 * `stripe-refund-attempts.test.ts`. This suite keeps only the action's actor,
 * intake, refund-target, error-mapping, and cache-invalidation contracts.
 */

import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { stripe } from "@/lib/stripe/client"

import {
  mockSupabaseFrom,
  mockSupabaseRpc,
  mockSupabaseSingle,
  resetAllMocks,
} from "./setup"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const mockRequireRole = vi.fn()
vi.mock("@/lib/auth/helpers", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}))

vi.mock("@/app/actions/decline-intake", () => ({
  declineIntake: vi.fn(),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({
  trackIntakeFunnelStep: vi.fn(),
}))
vi.mock("@/lib/audit/compliance-audit", () => ({
  logExternalPrescribingIndicated: vi.fn(),
}))
vi.mock("@/lib/clinical/case-summary", () => ({
  buildClinicalCaseSummary: vi.fn(),
}))
vi.mock("@/lib/clinical/intake-validation", () => ({
  isControlledSubstance: vi.fn(() => false),
}))
vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidatePatient: vi.fn(),
  revalidateStaff: vi.fn(),
}))
vi.mock("@/lib/data/intake-lifecycle", () => ({
  IntakeLifecycleError: class IntakeLifecycleError extends Error {},
}))
vi.mock("@/lib/data/intake-lock-warning", () => ({
  formatClaimWarning: vi.fn(() => "claimed"),
}))
vi.mock("@/lib/data/intakes", () => ({
  approvePrescribedScript: vi.fn(),
  flagForFollowup: vi.fn(),
  markAsReviewed: vi.fn(),
  saveDoctorNotes: vi.fn(),
  startParchmentPrescribing: vi.fn(),
  updateIntakeStatus: vi.fn(),
  updateScriptSent: vi.fn(),
}))
vi.mock("@/lib/doctor/case-action-guard", () => ({
  getDoctorCaseActionError: vi.fn(() => null),
}))
vi.mock("@/lib/doctor/clinical-notes", () => ({
  resolveClinicalDecisionNote: vi.fn(),
}))
vi.mock("@/lib/doctor/parchment-claim", () => ({
  getParchmentPatientSyncEligibility: vi.fn(),
  getParchmentScriptCompletionEligibility: vi.fn(),
  isParchmentClaimSatisfied: vi.fn(),
}))
vi.mock("@/lib/doctor/service-types", () => ({
  isPrescribingServiceRequest: vi.fn(() => false),
  isPrescribingServiceType: vi.fn(() => false),
}))
vi.mock("@/lib/notifications/edit-paid-request-telegram", () => ({
  editPaidRequestTelegramMessageToApproved: vi.fn(),
  editPaidRequestTelegramMessageToDeclined: vi.fn(),
}))
vi.mock("@/lib/parchment/sync-patient", () => ({
  getParchmentPatientIdentityIssues: vi.fn(() => []),
}))
vi.mock("@/lib/security/phi-field-wrappers", () => ({
  readAnswers: vi.fn(async () => ({})),
}))

import { issueRefundAction } from "@/app/doctor/queue/actions"

const INTAKE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111"
const LEASE_TOKEN = "22222222-2222-4222-8222-222222222222"

type MockChain = {
  eq: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  single: typeof mockSupabaseSingle
  update: ReturnType<typeof vi.fn>
}

let chains: MockChain[]

function installIntakeChain(): void {
  mockSupabaseFrom.mockImplementation(() => {
    const chain = {} as MockChain
    chain.eq = vi.fn(() => chain)
    chain.select = vi.fn(() => chain)
    chain.single = mockSupabaseSingle
    chain.update = vi.fn(() => chain)
    chains.push(chain)
    return chain
  })
}

function makeIntakeRow(overrides: Record<string, unknown> = {}) {
  return {
    amount_cents: 1_995,
    category: "medical_certificate",
    id: INTAKE_ID,
    patient: [{ email: "patient@example.com", full_name: "Test Patient", id: "patient-1" }],
    patient_id: "patient-1",
    payment_id: "cs_test_abc",
    payment_status: "paid",
    refund_amount_cents: null,
    refund_status: "not_applicable",
    refund_stripe_id: null,
    status: "approved",
    stripe_payment_intent_id: "pi_test_xyz",
    updated_at: "2026-08-14T00:00:00.000Z",
    ...overrides,
  }
}

function mockActor(
  role: "admin" | "doctor" | "support",
  id = `${role}-1`,
): string {
  mockRequireRole.mockResolvedValue({
    profile: { email: `${role}@example.com`, id, role },
    user: { id: `auth-${id}` },
  })
  return id
}

function mockIntake(intake = makeIntakeRow()): void {
  mockSupabaseSingle.mockResolvedValueOnce({ data: intake, error: null })
}

function mockDurableReservation(requestedAmountCents = 1_995): void {
  mockSupabaseRpc.mockImplementation(async (name: string) => {
    if (name === "reserve_stripe_refund_attempt") {
      return {
        data: {
          attempt_id: ATTEMPT_ID,
          idempotency_key: `refund-attempt:${ATTEMPT_ID}`,
          lease_token: LEASE_TOKEN,
          requested_amount_cents: requestedAmountCents,
          reserved: true,
        },
        error: null,
      }
    }
    if (
      name === "complete_stripe_refund_attempt" ||
      name === "complete_stripe_refund_attempt_error"
    ) {
      return { data: true, error: null }
    }
    return { data: null, error: { message: `Unexpected RPC: ${name}` } }
  })
}

function mockReservationError(message: string): void {
  mockSupabaseRpc.mockImplementation(async (name: string) => name ===
    "reserve_stripe_refund_attempt"
    ? { data: null, error: { message } }
    : { data: true, error: null })
}

function mockStripeAccepted(
  id = "re_manual",
  amount = 1_995,
): void {
  vi.mocked(stripe.refunds.create).mockImplementation(async (
    params?: Stripe.RefundCreateParams,
  ) => ({
    amount,
    id,
    metadata: params?.metadata ?? {},
    payment_intent: params?.payment_intent ?? null,
    status: "pending",
  } as never))
}

function reserveCalls() {
  return mockSupabaseRpc.mock.calls.filter(
    ([name]) => name === "reserve_stripe_refund_attempt",
  )
}

describe("issueRefundAction", () => {
  beforeEach(() => {
    resetAllMocks()
    chains = []
    installIntakeChain()
    mockRequireRole.mockReset()
    mockSupabaseSingle.mockReset()
    vi.mocked(stripe.checkout.sessions.retrieve).mockReset()
    vi.mocked(stripe.refunds.create).mockReset()
    mockDurableReservation()
    mockStripeAccepted()
  })

  it("rejects a non-UUID intake before auth or database access", async () => {
    const result = await issueRefundAction("intake-123")

    expect(result).toEqual({ error: "Invalid intake ID", success: false })
    expect(mockRequireRole).not.toHaveBeenCalled()
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
  })

  it("requires exactly doctor, admin, or support and rejects missing profiles", async () => {
    mockRequireRole.mockResolvedValue({ profile: null })

    const result = await issueRefundAction(INTAKE_ID)

    expect(mockRequireRole).toHaveBeenCalledWith(["doctor", "admin", "support"])
    expect(result).toEqual({ error: "Unauthorized", success: false })
    expect(mockSupabaseFrom).not.toHaveBeenCalled()
  })

  it("submits one canonical durable refund attempt without mutating the intake", async () => {
    const actorId = mockActor("doctor")
    mockIntake()

    const result = await issueRefundAction(INTAKE_ID)

    expect(reserveCalls()).toEqual([["reserve_stripe_refund_attempt", {
      p_actor_profile_id: actorId,
      p_intake_id: INTAKE_ID,
      p_livemode: false,
      p_payment_intent_id: "pi_test_xyz",
      p_refund_type: "standalone",
      p_target_total_cents: 1_995,
    }]])
    expect(stripe.refunds.create).toHaveBeenCalledWith({
      amount: 1_995,
      metadata: {
        intake_id: INTAKE_ID,
        refund_attempt_id: ATTEMPT_ID,
        refund_type: "standalone",
      },
      payment_intent: "pi_test_xyz",
      reason: "requested_by_customer",
    }, { idempotencyKey: `refund-attempt:${ATTEMPT_ID}` })
    expect(mockSupabaseRpc).toHaveBeenCalledWith(
      "complete_stripe_refund_attempt",
      {
        p_attempt_id: ATTEMPT_ID,
        p_lease_token: LEASE_TOKEN,
        p_stripe_refund_id: "re_manual",
        p_stripe_status: "pending",
      },
    )
    expect(chains.every((chain) => chain.update.mock.calls.length === 0)).toBe(true)
    expect(result).toEqual({
      amount: 1_995,
      pending: true,
      refundId: "re_manual",
      success: true,
      totalRefunded: 0,
    })
    expect(revalidateStaff).toHaveBeenCalledWith({ content: true, intakeId: INTAKE_ID })
    expect(revalidatePatient).toHaveBeenCalledWith({ intakeId: INTAKE_ID })
  })

  it("targets the authoritative total while Stripe receives only the top-up remainder", async () => {
    mockActor("admin")
    mockIntake(makeIntakeRow({
      amount_cents: 4_995,
      payment_status: "partially_refunded",
      refund_amount_cents: 2_000,
    }))
    mockDurableReservation(2_995)
    mockStripeAccepted("re_topup", 2_995)

    const result = await issueRefundAction(INTAKE_ID)

    expect(reserveCalls()).toEqual([["reserve_stripe_refund_attempt", {
      p_actor_profile_id: "admin-1",
      p_intake_id: INTAKE_ID,
      p_livemode: false,
      p_payment_intent_id: "pi_test_xyz",
      p_refund_type: "standalone_topup",
      p_target_total_cents: 4_995,
    }]])
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2_995 }),
      expect.anything(),
    )
    expect(result).toEqual({
      amount: 2_995,
      pending: true,
      refundId: "re_topup",
      success: true,
      totalRefunded: 2_000,
    })
  })

  it.each([
    ["refunded", "This request has already been fully refunded."],
    ["unpaid", "Refund is not available for payment status 'unpaid'."],
    ["failed", "Refund is not available for payment status 'failed'."],
    ["pending_payment", "Refund is not available for payment status 'pending_payment'."],
  ])("blocks non-refundable payment status %s", async (paymentStatus, error) => {
    mockActor("doctor")
    mockIntake(makeIntakeRow({ payment_status: paymentStatus }))

    const result = await issueRefundAction(INTAKE_ID)

    expect(result).toEqual({ error, success: false })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it("blocks a second refund while settlement is pending", async () => {
    mockActor("doctor")
    mockIntake(makeIntakeRow({ refund_status: "pending" }))

    const result = await issueRefundAction(INTAKE_ID)

    expect(result).toEqual({
      error: "A refund request is already pending Stripe settlement.",
      success: false,
    })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
  })

  it("blocks a top-up when the durable cash mirror leaves no remainder", async () => {
    mockActor("admin")
    mockIntake(makeIntakeRow({
      amount_cents: 4_995,
      payment_status: "partially_refunded",
      refund_amount_cents: 4_995,
    }))

    const result = await issueRefundAction(INTAKE_ID)

    expect(result).toEqual({
      error: "Nothing left to refund on this request.",
      success: false,
    })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
  })

  it("returns not found without reserving when the intake lookup fails", async () => {
    mockActor("doctor")
    mockSupabaseSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "not found" },
    })

    const result = await issueRefundAction(INTAKE_ID)

    expect(result).toEqual({ error: "Request not found", success: false })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
  })

  it("falls back to the stored Checkout Session for the PaymentIntent", async () => {
    mockActor("doctor")
    mockIntake(makeIntakeRow({ stripe_payment_intent_id: null }))
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
      payment_intent: "pi_from_session",
    } as never)

    const result = await issueRefundAction(INTAKE_ID)

    expect(result.success).toBe(true)
    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_abc")
    expect(reserveCalls()[0]?.[1]).toEqual(expect.objectContaining({
      p_payment_intent_id: "pi_from_session",
    }))
  })

  it.each([
    { paymentId: null, sessionError: null },
    { paymentId: "cs_test_abc", sessionError: new Error("session unavailable") },
  ])("fails before reservation when no PaymentIntent can be resolved", async ({
    paymentId,
    sessionError,
  }) => {
    mockActor("doctor")
    mockIntake(makeIntakeRow({
      payment_id: paymentId,
      stripe_payment_intent_id: null,
    }))
    if (sessionError) {
      vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(sessionError as never)
    }

    const result = await issueRefundAction(INTAKE_ID)

    expect(result).toEqual({ error: "No payment found for this request", success: false })
    expect(mockSupabaseRpc).not.toHaveBeenCalled()
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it.each([
    {
      expected: "This refund exceeds your support limit. Ask an admin to process it.",
      providerError: "support_refund_amount_limit",
    },
    {
      expected: "You've reached the rolling support refund limit. Ask an admin or try again later.",
      providerError: "support_refund_attempt_limit",
    },
    {
      expected: "Could not reserve this refund safely. Refresh and try again or ask an admin.",
      providerError: "database unavailable: patient@example.com",
    },
  ])("maps only allowlisted support reservation errors", async ({
    expected,
    providerError,
  }) => {
    mockActor("support")
    mockIntake()
    mockReservationError(providerError)

    const result = await issueRefundAction(INTAKE_ID)

    expect(result).toEqual({ error: expected, success: false })
    expect(reserveCalls()).toHaveLength(1)
    expect(stripe.refunds.create).not.toHaveBeenCalled()
    expect(revalidateStaff).not.toHaveBeenCalled()
    expect(result.error).not.toContain("patient@example.com")
  })

  it("treats an ambiguous Stripe response as a successful pending recovery item", async () => {
    mockActor("doctor")
    mockIntake()
    vi.mocked(stripe.refunds.create).mockRejectedValue(
      new Error("connection reset after request write") as never,
    )

    const result = await issueRefundAction(INTAKE_ID)

    expect(mockSupabaseRpc).toHaveBeenCalledWith(
      "complete_stripe_refund_attempt_error",
      expect.objectContaining({
        p_attempt_id: ATTEMPT_ID,
        p_lease_token: LEASE_TOKEN,
        p_outcome: "unknown_outcome",
      }),
    )
    expect(result).toEqual({
      amount: 1_995,
      pending: true,
      success: true,
      totalRefunded: 0,
    })
    expect(chains.every((chain) => chain.update.mock.calls.length === 0)).toBe(true)
    expect(revalidateStaff).toHaveBeenCalled()
  })

  it("does not require patient email data to reserve a refund", async () => {
    mockActor("doctor")
    mockIntake(makeIntakeRow({ patient: null, patient_id: null }))

    const result = await issueRefundAction(INTAKE_ID)

    expect(result.success).toBe(true)
    expect(reserveCalls()).toHaveLength(1)
  })
})
