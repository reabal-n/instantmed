/**
 * Unit tests for app/actions/decline-intake.ts
 *
 * The canonical decline + refund action. Covers the high-value branches:
 *   1. Actor gate (null profile, wrong role)
 *   2. Intake lookup (not found)
 *   3. Idempotency (already declined)
 *   4. Status validation (can't decline from wrong status)
 *   5. Refund amount math per category:
 *      - medical_certificate → FULL refund (no `amount` in Stripe call)
 *      - prescription       → FULL refund (no `amount` in Stripe call)
 *      - consult            → 50% PARTIAL refund (Math.floor(amount_cents * 0.5))
 *      - other categories   → not_eligible (no Stripe call)
 *   6. Idempotency key distinction:
 *      - Full refund:    `refund_decline_${id}`
 *      - Partial refund: `refund_decline_partial_${id}`
 *   7. E2E short-circuit (PLAYWRIGHT=1 skips Stripe)
 *   8. skipRefund flag (for testing pathways that don't need refund)
 *
 * Tests rely heavily on mocking external deps (auth, email, compliance,
 * event logging) so we can isolate the refund logic.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { stripe } from "@/lib/stripe/client"
import { mockSupabaseSingle, mockSupabaseFrom, resetAllMocks } from "./setup"

// ============================================================================
// MOCKS — must be set up BEFORE importing decline-intake
// ============================================================================

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const mockGetCurrentProfile = vi.fn()
vi.mock("@/lib/data/profiles", () => ({
  getCurrentProfile: () => mockGetCurrentProfile(),
}))

vi.mock("@/lib/posthog-server", () => ({
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

// Import AFTER mocks are registered
import { declineIntake } from "@/app/actions/decline-intake"

/**
 * Loose typing for Stripe refund call inspection. The real Stripe type
 * has many optional/nullable fields — for tests we just want to read
 * back what was passed, so a Record is simpler.
 */
type RefundCallParams = {
  payment_intent?: string
  amount?: number
  reason?: string
  metadata?: Record<string, string>
}
type RefundCallOpts = { idempotencyKey?: string }

function getRefundCall(index = 0): [RefundCallParams, RefundCallOpts] {
  const calls = vi.mocked(stripe.refunds.create).mock.calls
  if (!calls[index]) {
    throw new Error(`Expected stripe.refunds.create to have been called at least ${index + 1} time(s)`)
  }
  return [calls[index][0] as RefundCallParams, (calls[index][1] || {}) as RefundCallOpts]
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a minimal intake row that the declineIntake action will read.
 * The `patient` join is shaped as an array because Supabase returns joins
 * that way by default — the action normalizes with `Array.isArray` check.
 */
function makeIntakeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "intake-123",
    status: "paid",
    category: "medical_certificate",
    subtype: "work",
    payment_status: "paid",
    payment_id: "cs_test_abc",
    stripe_payment_intent_id: "pi_test_xyz",
    amount_cents: 1995,
    patient_id: "patient-1",
    patient: [{
      id: "patient-1",
      full_name: "Test Patient",
      email: "patient@example.com",
      auth_user_id: "test-auth-user-id",
    }],
    ...overrides,
  }
}

function mockDoctorProfile() {
  mockGetCurrentProfile.mockResolvedValue({
    id: "doctor-1",
    role: "doctor",
    email: "doctor@example.com",
  })
}

function mockAdminProfile() {
  mockGetCurrentProfile.mockResolvedValue({
    id: "admin-1",
    role: "admin",
    email: "admin@example.com",
  })
}

/**
 * Wire up the Supabase mock for a complete decline flow:
 *   1. SELECT intake → returns the row
 *   2. UPDATE status → returns { id } (update confirmation)
 * The refund update chain doesn't need a terminal mock since it's
 * awaited without destructuring.
 */
function mockDeclineFlow(intake: ReturnType<typeof makeIntakeRow>) {
  // Supabase fetch intake → Supabase update status → Supabase update refund_status
  mockSupabaseSingle
    .mockResolvedValueOnce({ data: intake, error: null }) // 1. fetch intake
    .mockResolvedValueOnce({ data: { id: intake.id }, error: null }) // 2. status update
}

// ============================================================================
// TESTS
// ============================================================================

describe("declineIntake", () => {
  beforeEach(() => {
    resetAllMocks()
    delete process.env.E2E_MODE
    delete process.env.PLAYWRIGHT
    mockGetCurrentProfile.mockReset()
    vi.mocked(stripe.refunds.create).mockReset()
  })

  // --------------------------------------------------------------------------
  // Actor gate
  // --------------------------------------------------------------------------

  describe("actor gate", () => {
    it("rejects when no profile is present", async () => {
      mockGetCurrentProfile.mockResolvedValue(null)

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result).toEqual({
        success: false,
        error: "You must be logged in to decline requests",
      })
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it("rejects patient role", async () => {
      mockGetCurrentProfile.mockResolvedValue({ id: "p-1", role: "patient" })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result).toEqual({
        success: false,
        error: "Only doctors and admins can decline requests",
      })
    })

    it("accepts doctor role", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow())
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_1", amount: 1995 } as never)

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result.success).toBe(true)
    })

    it("accepts admin role", async () => {
      mockAdminProfile()
      mockDeclineFlow(makeIntakeRow())
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_1", amount: 1995 } as never)

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result.success).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // Intake lookup + idempotency
  // --------------------------------------------------------------------------

  describe("intake lookup", () => {
    it("returns error when intake not found", async () => {
      mockDoctorProfile()
      mockSupabaseSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } })

      const result = await declineIntake({ intakeId: "missing" })

      expect(result).toEqual({ success: false, error: "Request not found" })
    })

    it("returns alreadyDeclined: true when intake is already declined (idempotent)", async () => {
      mockDoctorProfile()
      mockSupabaseSingle.mockResolvedValueOnce({
        data: makeIntakeRow({ status: "declined" }),
        error: null,
      })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result).toEqual({ success: true, alreadyDeclined: true })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("rejects declining from a non-declinable status (e.g. approved)", async () => {
      mockDoctorProfile()
      mockSupabaseSingle.mockResolvedValueOnce({
        data: makeIntakeRow({ status: "approved" }),
        error: null,
      })

      const result = await declineIntake({ intakeId: "intake-123" })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Cannot decline request in 'approved' status")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // Refund amount math per category (the core of this test file)
  // --------------------------------------------------------------------------

  describe("refund amount calculation", () => {
    it("medical_certificate → FULL refund (no amount in Stripe call)", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow({ category: "medical_certificate", amount_cents: 1995 }))
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_full", amount: 1995 } as never)

      await declineIntake({ intakeId: "intake-123" })

      expect(stripe.refunds.create).toHaveBeenCalledOnce()
      const [refundParams, refundOpts] = getRefundCall()
      // Full refund → no `amount` field (Stripe defaults to full charge)
      expect(refundParams).not.toHaveProperty("amount")
      // Full refund metadata
      expect(refundParams.metadata).toMatchObject({
        refund_type: "decline",
        category: "medical_certificate",
      })
      expect(refundParams.metadata).not.toHaveProperty("partial_refund_percent")
      // Full refund idempotency key
      expect(refundOpts).toEqual({ idempotencyKey: "refund_decline_intake-123" })
    })

    it("prescription → FULL refund (no amount in Stripe call)", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow({ category: "prescription", amount_cents: 2995 }))
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_full", amount: 2995 } as never)

      await declineIntake({ intakeId: "intake-rx" })

      const [refundParams, refundOpts] = getRefundCall()
      expect(refundParams).not.toHaveProperty("amount")
      expect(refundOpts).toEqual({ idempotencyKey: "refund_decline_intake-rx" })
    })

    it("consult → 50% PARTIAL refund (Math.floor(amount_cents * 0.5))", async () => {
      mockDoctorProfile()
      // $49.95 consult → 2498 cents (Math.floor(4995 * 0.5))
      mockDeclineFlow(makeIntakeRow({ category: "consult", amount_cents: 4995 }))
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_partial", amount: 2497 } as never)

      await declineIntake({ intakeId: "intake-consult" })

      expect(stripe.refunds.create).toHaveBeenCalledOnce()
      const [refundParams, refundOpts] = getRefundCall()
      expect(refundParams.amount).toBe(2497) // Math.floor(4995 * 0.5)
      expect(refundParams.metadata).toMatchObject({
        refund_type: "decline_partial",
        partial_refund_percent: "0.5",
        category: "consult",
      })
      // Partial refund uses a distinct idempotency key so a future full-refund
      // retry isn't blocked by the partial-refund key.
      expect(refundOpts).toEqual({ idempotencyKey: "refund_decline_partial_intake-consult" })
    })

    it("consult with $89.95 (weight loss) → 4497 cents partial refund", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow({ category: "consult", amount_cents: 8995 }))
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_w", amount: 4497 } as never)

      await declineIntake({ intakeId: "intake-weight" })

      const [refundParams] = getRefundCall()
      expect(refundParams.amount).toBe(4497) // Math.floor(8995 / 2) — rounds down
    })

    it("consult with odd cent count → Math.floor rounds DOWN (never overpays)", async () => {
      mockDoctorProfile()
      // 1001 cents × 0.5 = 500.5 → Math.floor → 500 cents
      // (Floor ensures we never refund more than the fair half.)
      mockDeclineFlow(makeIntakeRow({ category: "consult", amount_cents: 1001 }))
      vi.mocked(stripe.refunds.create).mockResolvedValue({ id: "re_odd", amount: 500 } as never)

      await declineIntake({ intakeId: "intake-odd" })

      const [refundParams] = getRefundCall()
      expect(refundParams.amount).toBe(500)
    })
  })

  // --------------------------------------------------------------------------
  // Non-eligible categories
  // --------------------------------------------------------------------------

  describe("non-eligible categories", () => {
    it("referral_letter → no refund, status recorded as not_eligible", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow({ category: "referral_letter" }))

      const result = await declineIntake({ intakeId: "intake-referral" })

      expect(result.success).toBe(true)
      expect(result.refund?.status).toBe("not_eligible")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("pathology → no refund, status recorded as not_eligible", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow({ category: "pathology" }))

      const result = await declineIntake({ intakeId: "intake-path" })

      expect(result.refund?.status).toBe("not_eligible")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("null category → no refund attempted", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow({ category: null }))

      const result = await declineIntake({ intakeId: "intake-nullcat" })

      expect(stripe.refunds.create).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // Payment status gate
  // --------------------------------------------------------------------------

  describe("payment status gate", () => {
    it("does NOT refund when payment_status is not 'paid' (e.g. pending_payment)", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow({ payment_status: "pending_payment" }))

      const result = await declineIntake({ intakeId: "intake-unpaid" })

      expect(result.success).toBe(true)
      expect(result.refund?.status).toBe("not_applicable")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // E2E short-circuit
  // --------------------------------------------------------------------------

  describe("E2E short-circuit", () => {
    it("PLAYWRIGHT=1 → refund skipped, status=skipped_e2e", async () => {
      process.env.PLAYWRIGHT = "1"
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow({ category: "consult" }))

      const result = await declineIntake({ intakeId: "intake-e2e" })

      expect(result.refund?.status).toBe("skipped_e2e")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("E2E_MODE=true → refund skipped", async () => {
      process.env.E2E_MODE = "true"
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow())

      const result = await declineIntake({ intakeId: "intake-e2e" })

      expect(result.refund?.status).toBe("skipped_e2e")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // skipRefund flag
  // --------------------------------------------------------------------------

  describe("skipRefund flag", () => {
    it("skipRefund=true bypasses the refund entirely", async () => {
      mockDoctorProfile()
      mockDeclineFlow(makeIntakeRow())

      const result = await declineIntake({ intakeId: "intake-skip", skipRefund: true })

      expect(result.success).toBe(true)
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })
  })
})
