/**
 * Unit tests for `issueRefundAction` (and, through it, the module-private
 * `reserveSupportRefundAttempt`) in app/doctor/queue/actions.ts.
 *
 * This is the manual/standalone refund path — separate from the decline flow
 * (covered in decline-intake.test.ts) — and was the only untested live-money
 * mutation path (flagged P1 in docs/audits/2026-06-11-hygiene-business-review.md).
 *
 * Coverage:
 *   1. Input + actor gate: invalid UUID short-circuits before auth; the
 *      requireRole allowlist is exactly ["doctor", "admin", "support"];
 *      null profile → Unauthorized. (The real `requireRole` redirects wrong
 *      roles before the action body runs, so "patient rejected" is enforced
 *      by the allowlist contract, which we pin here.)
 *   2. Support per-refund cap: support blocked above SUPPORT_REFUND_CAP_CENTS
 *      ($100); exactly $100 allowed; doctor/admin uncapped (they never hit the
 *      quota RPC — pinned by asserting no reservation runs for them).
 *      `lib/auth/staff-capabilities` is intentionally NOT mocked so the real
 *      hasSupportAccess/hasAdminAccess logic decides who gets capped.
 *   3. Support rolling 24h limit: 4th distinct attempt in 24h is blocked
 *      (SUPPORT_REFUND_MAX_PER_24H = 3); parallel actions cannot exceed the
 *      durable RPC reservation result; RPC failure FAILS CLOSED.
 *   4. Full refund from payment_status='paid': explicit `amount` equal to the
 *      full remaining balance, idempotency key `standalone_refund_${intakeId}`,
 *      but local cash state remains pending until exact webhook evidence.
 *   5. Top-up from payment_status='partially_refunded': refunds ONLY
 *      amount_cents - refund_amount_cents, idempotency key
 *      `standalone_refund_topup_${intakeId}_${alreadyRefundedCents}` (stable
 *      across retries of the same top-up), without guessing a new cumulative
 *      cash total from the create response.
 *   6. Refuses non-refundable payment states (refunded / unpaid / failed),
 *      missing intakes, and zero-remaining balances.
 *   7. Stripe failure surfaces as an error and writes NO refund state to the
 *      intake (no false-success).
 *   8. Payment-intent resolution fallback via the stored Checkout Session, and
 *      a hard error when no payment intent can be found.
 *   9. The cash-confirmed webhook owns the patient refund email; this action
 *      does not require a patient email address.
 *
 * Mocking notes:
 * - app/doctor/queue/actions.ts is a large "use server" module; every heavy
 *   import in its graph is mocked below so importing it stays cheap. The
 *   Supabase service-role client, Stripe client, Sentry, and logger are
 *   already mocked globally in ./setup.
 * - The action's optimistic intake writes use `.maybeSingle()`, so this file
 *   overrides the setup chain to return controllable mutation receipts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { stripe } from "@/lib/stripe/client"

import {
  mockSupabaseFrom,
  mockSupabaseRpc,
  mockSupabaseSingle,
  resetAllMocks,
} from "./setup"

// ============================================================================
// MOCKS - must be registered BEFORE importing the actions module
// ============================================================================

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const mockRequireRole = vi.fn()
vi.mock("@/lib/auth/helpers", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}))

// NOTE: @/lib/auth/staff-capabilities is deliberately NOT mocked — the
// support-cap branch (`hasSupportAccess(profile) && !hasAdminAccess(profile)`)
// must run against the real role-capability mapping.

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
  revalidateStaff: vi.fn(),
  revalidatePatient: vi.fn(),
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

// Import AFTER mocks are registered
import { issueRefundAction } from "@/app/doctor/queue/actions"

// ============================================================================
// SUPABASE CHAIN
// ============================================================================

const TRIGGER_REWRITTEN_RESERVATION_AT = "2026-08-14T00:00:00.777Z"

let mutationResults: Array<{
  data: { id: string; updated_at?: string } | null
  error: { message: string } | null
}>

function installThenableChain() {
  mockSupabaseFrom.mockImplementation(() => {
    const chain: Record<string, unknown> = {}
    const chainMethods = [
      "select", "insert", "update", "delete",
      "eq", "neq", "gte", "lte", "order", "limit", "range", "is", "in",
    ]
    for (const method of chainMethods) {
      chain[method] = vi.fn(() => chain)
    }
    chain.single = mockSupabaseSingle
    chain.maybeSingle = vi.fn(async () => {
      const explicitResult = mutationResults.shift()
      if (explicitResult) return explicitResult
      const selected = (chain.select as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]
      return selected === "id, updated_at"
        ? {
            data: { id: INTAKE_ID, updated_at: TRIGGER_REWRITTEN_RESERVATION_AT },
            error: null,
          }
        : { data: { id: INTAKE_ID }, error: null }
    })
    return chain
  })
}

type MockChain = Record<string, ReturnType<typeof vi.fn>>

function getChains(): MockChain[] {
  return mockSupabaseFrom.mock.results.map((result) => result.value as MockChain)
}

function getUpdatePayloads(): Array<Record<string, unknown>> {
  return getChains().flatMap(
    (chain) => chain.update?.mock?.calls.map((call) => call[0] as Record<string, unknown>) ?? [],
  )
}

// ============================================================================
// HELPERS
// ============================================================================

// issueRefundAction validates UUID format before anything else.
const INTAKE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"

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

function makeIntakeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: INTAKE_ID,
    status: "approved",
    category: "medical_certificate",
    payment_status: "paid",
    payment_id: "cs_test_abc",
    stripe_payment_intent_id: "pi_test_xyz",
    amount_cents: 1995,
    refund_amount_cents: null,
    refund_status: "not_applicable",
    refund_stripe_id: null,
    updated_at: "2026-08-14T00:00:00.000Z",
    patient_id: "patient-1",
    patient: [{
      id: "patient-1",
      full_name: "Test Patient",
      email: "patient@example.com",
    }],
    ...overrides,
  }
}

function mockActor(role: "doctor" | "admin" | "support", id = `${role}-1`) {
  mockRequireRole.mockResolvedValue({
    user: { id: `auth-${id}` },
    profile: { id, role, email: `${role}@example.com` },
  })
  return id
}

function mockIntakeFetch(intake: ReturnType<typeof makeIntakeRow>) {
  mockSupabaseSingle.mockResolvedValueOnce({ data: intake, error: null })
}

function mockStripeRefundSuccess(id = "re_1", amount = 1995) {
  vi.mocked(stripe.refunds.create).mockResolvedValue({ id, amount } as never)
}

type SupportQuotaRow = {
  allowed: boolean
  denial_reason: "amount_limit" | "attempt_limit" | null
  attempt_id: string | null
  recent_attempt_count: number
  reused: boolean
}

function mockSupportQuota(overrides: Partial<SupportQuotaRow> = {}) {
  mockSupabaseRpc.mockResolvedValue({
    data: [{
      allowed: true,
      denial_reason: null,
      attempt_id: "ffffffff-eeee-4ddd-8ccc-bbbbbbbbbbbb",
      recent_attempt_count: 1,
      reused: false,
      ...overrides,
    }],
    error: null,
  })
}

// ============================================================================
// TESTS
// ============================================================================

describe("issueRefundAction", () => {
  beforeEach(() => {
    resetAllMocks()
    installThenableChain()
    mutationResults = []
    mockSupportQuota()
    mockRequireRole.mockReset()
    mockSupabaseSingle.mockReset()
    vi.mocked(stripe.refunds.create).mockReset()
    vi.mocked(stripe.checkout.sessions.retrieve).mockReset()
  })

  // --------------------------------------------------------------------------
  // 1. Input validation + actor gate
  // --------------------------------------------------------------------------

  describe("input validation + actor gate", () => {
    it("rejects a non-UUID intake id before touching auth or the DB", async () => {
      const result = await issueRefundAction("intake-123")

      expect(result).toEqual({ success: false, error: "Invalid intake ID" })
      expect(mockRequireRole).not.toHaveBeenCalled()
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it("gates on exactly the [doctor, admin, support] allowlist", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow())
      mockStripeRefundSuccess()

      await issueRefundAction(INTAKE_ID)

      // The real requireRole redirects any role outside this list before the
      // action body runs — this assertion pins the allowlist contract.
      expect(mockRequireRole).toHaveBeenCalledWith(["doctor", "admin", "support"])
    })

    it("rejects when no profile is present (null auth)", async () => {
      mockRequireRole.mockResolvedValue({ profile: null })

      const result = await issueRefundAction(INTAKE_ID)

      expect(result).toEqual({ success: false, error: "Unauthorized" })
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("allows doctor", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow())
      mockStripeRefundSuccess()

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
    })

    it("allows admin", async () => {
      mockActor("admin")
      mockIntakeFetch(makeIntakeRow())
      mockStripeRefundSuccess()

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
    })

    it("allows support (within limits)", async () => {
      mockActor("support")
      mockIntakeFetch(makeIntakeRow())
      mockStripeRefundSuccess()

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // 2. Support per-refund cap ($100)
  // --------------------------------------------------------------------------

  describe("support per-refund cap", () => {
    it("blocks support when the refund exceeds $100 (no Stripe call)", async () => {
      mockActor("support")
      // $199.95 weight-loss-tier price > 10_000-cent cap
      mockIntakeFetch(makeIntakeRow({ amount_cents: 19995 }))
      mockSupportQuota({
        allowed: false,
        denial_reason: "amount_limit",
        attempt_id: null,
        recent_attempt_count: 0,
      })

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain("capped at $100.00")
      expect(result.error).toContain("$199.95")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        "reserve_support_refund_attempt",
        expect.objectContaining({ p_amount_cents: 19995 }),
      )
    })

    it("allows support at exactly $100 (cap is exclusive)", async () => {
      mockActor("support")
      mockIntakeFetch(makeIntakeRow({ amount_cents: 10000 }))
      mockStripeRefundSuccess("re_cap", 10000)

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
      const [params] = getRefundCall()
      expect(params.amount).toBe(10000)
    })

    it("caps against the REMAINING amount, not the original price", async () => {
      mockActor("support")
      // $150 paid, $60 already refunded → $90 remaining → under the cap.
      mockIntakeFetch(makeIntakeRow({
        payment_status: "partially_refunded",
        amount_cents: 15000,
        refund_amount_cents: 6000,
      }))
      mockStripeRefundSuccess("re_remaining", 9000)

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
      const [params] = getRefundCall()
      expect(params.amount).toBe(9000)
    })

    it("doctor is uncapped (no limit checks at all)", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({ amount_cents: 19995 }))
      mockStripeRefundSuccess("re_doc", 19995)

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
      const [params] = getRefundCall()
      expect(params.amount).toBe(19995)
      expect(mockSupabaseRpc).not.toHaveBeenCalled()
    })

    it("admin is uncapped (no limit checks at all)", async () => {
      mockActor("admin")
      mockIntakeFetch(makeIntakeRow({ amount_cents: 19995 }))
      mockStripeRefundSuccess("re_adm", 19995)

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
      expect(mockSupabaseRpc).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // 3. Support rolling 24h limit (3 per 24h)
  // --------------------------------------------------------------------------

  describe("support rolling 24h limit", () => {
    it("blocks the 4th distinct attempt in 24h", async () => {
      mockActor("support")
      mockIntakeFetch(makeIntakeRow())
      mockSupportQuota({
        allowed: false,
        denial_reason: "attempt_limit",
        attempt_id: null,
        recent_attempt_count: 3,
      })

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain("attempted 3 refunds in the last 24h (limit 3)")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("allows the 3rd attempt in 24h", async () => {
      mockActor("support")
      mockIntakeFetch(makeIntakeRow())
      mockStripeRefundSuccess()
      mockSupportQuota({ recent_attempt_count: 3 })

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
    })

    it("reserves the exact actor, intake, amount, and Stripe idempotency generation", async () => {
      const supportId = mockActor("support")
      mockIntakeFetch(makeIntakeRow())
      mockStripeRefundSuccess()

      await issueRefundAction(INTAKE_ID)

      expect(mockSupabaseRpc).toHaveBeenCalledWith("reserve_support_refund_attempt", {
        p_actor_profile_id: supportId,
        p_intake_id: INTAKE_ID,
        p_attempt_key: `standalone_refund_${INTAKE_ID}`,
        p_amount_cents: 1995,
      })
    })

    it("fails CLOSED when the reservation RPC errors", async () => {
      mockActor("support")
      mockIntakeFetch(makeIntakeRow())
      mockSupabaseRpc.mockResolvedValue({ data: null, error: { message: "db unavailable" } })

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(false)
      expect(result.error).toContain("Could not verify your refund quota")
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("lets only three of four parallel distinct support attempts pass the quota gate", async () => {
      const intakeIds = [
        "10000000-0000-4000-8000-000000000001",
        "10000000-0000-4000-8000-000000000002",
        "10000000-0000-4000-8000-000000000003",
        "10000000-0000-4000-8000-000000000004",
      ]
      mockActor("support")
      for (const intakeId of intakeIds) {
        mockIntakeFetch(makeIntakeRow({ id: intakeId }))
      }
      // Stop accepted calls at the following intake reservation so this test
      // isolates the quota gate and never reaches the external Stripe mock.
      mutationResults = [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ]

      let acceptedAttempts = 0
      mockSupabaseRpc.mockImplementation(async () => {
        await Promise.resolve()
        if (acceptedAttempts >= 3) {
          return {
            data: [{
              allowed: false,
              denial_reason: "attempt_limit",
              attempt_id: null,
              recent_attempt_count: 3,
              reused: false,
            }],
            error: null,
          }
        }
        acceptedAttempts += 1
        return {
          data: [{
            allowed: true,
            denial_reason: null,
            attempt_id: `20000000-0000-4000-8000-00000000000${acceptedAttempts}`,
            recent_attempt_count: acceptedAttempts,
            reused: false,
          }],
          error: null,
        }
      })

      const results = await Promise.all(intakeIds.map((id) => issueRefundAction(id)))

      expect(results.filter((result) =>
        result.error?.includes("changed while the refund was being prepared"),
      )).toHaveLength(3)
      expect(results.filter((result) =>
        result.error?.includes("attempted 3 refunds in the last 24h"),
      )).toHaveLength(1)
      expect(getUpdatePayloads().filter((payload) =>
        payload.refund_status === "pending",
      )).toHaveLength(3)
      expect(stripe.refunds.create).not.toHaveBeenCalled()
      expect(mockSupabaseRpc).toHaveBeenCalledTimes(4)
    })
  })

  // --------------------------------------------------------------------------
  // 4. Full refund from payment_status = 'paid'
  // --------------------------------------------------------------------------

  describe("full refund (payment_status = paid)", () => {
    it("refunds the full amount against the stored payment intent", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({ amount_cents: 1995 }))
      mockStripeRefundSuccess("re_full", 1995)

      const result = await issueRefundAction(INTAKE_ID)

      expect(stripe.refunds.create).toHaveBeenCalledOnce()
      const [params, opts] = getRefundCall()
      expect(params.payment_intent).toBe("pi_test_xyz")
      // Explicit amount — the action never relies on Stripe's full-refund default.
      expect(params.amount).toBe(1995)
      expect(params.reason).toBe("requested_by_customer")
      expect(params.metadata).toMatchObject({
        intake_id: INTAKE_ID,
        category: "medical_certificate",
        refunded_by: "doctor-1",
        refunded_by_role: "doctor",
        refund_type: "standalone",
        already_refunded_cents: "0",
      })
      expect(opts).toEqual({ idempotencyKey: `standalone_refund_${INTAKE_ID}` })

      expect(result).toEqual({
        success: true,
        refundId: "re_full",
        amount: 1995,
        pending: true,
        totalRefunded: 0,
      })
    })

    it("records only a pending refund request before exact cash evidence", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({ amount_cents: 1995 }))
      mockStripeRefundSuccess("re_full", 1995)

      await issueRefundAction(INTAKE_ID)

      expect(getUpdatePayloads()).toContainEqual(expect.objectContaining({
        refund_status: "pending",
        refund_stripe_id: "re_full",
        refunded_by: "doctor-1",
      }))
      const pendingUpdate = getUpdatePayloads().find((payload) => payload.refund_stripe_id === "re_full")
      expect(pendingUpdate).not.toHaveProperty("payment_status")
      expect(pendingUpdate).not.toHaveProperty("refund_amount_cents")
      expect(pendingUpdate).not.toHaveProperty("refunded_at")
      const pendingChain = getChains().find((chain) =>
        chain.update?.mock.calls.some((call) =>
          (call[0] as Record<string, unknown>).refund_stripe_id === "re_full"
        )
      )
      expect(pendingChain?.eq).toHaveBeenCalledWith(
        "updated_at",
        TRIGGER_REWRITTEN_RESERVATION_AT,
      )
    })

    it("revalidates caches but lets the exact webhook own the patient refund email", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow())
      mockStripeRefundSuccess()

      await issueRefundAction(INTAKE_ID)

      expect(revalidateStaff).toHaveBeenCalledWith({ intakeId: INTAKE_ID, content: true })
      expect(revalidatePatient).toHaveBeenCalledWith({ intakeId: INTAKE_ID })
    })
  })

  // --------------------------------------------------------------------------
  // 5. Top-up from payment_status = 'partially_refunded'
  // --------------------------------------------------------------------------

  describe("top-up refund (payment_status = partially_refunded)", () => {
    it("refunds ONLY the remaining amount_cents - refund_amount_cents", async () => {
      mockActor("admin")
      mockIntakeFetch(makeIntakeRow({
        payment_status: "partially_refunded",
        category: "consult",
        amount_cents: 4995,
        refund_amount_cents: 2000,
      }))
      mockStripeRefundSuccess("re_topup", 2995)

      const result = await issueRefundAction(INTAKE_ID)

      const [params, opts] = getRefundCall()
      expect(params.amount).toBe(2995)
      expect(params.metadata).toMatchObject({
        refund_type: "standalone_topup",
        already_refunded_cents: "2000",
      })
      // Distinct, deterministic key so a retry of the same top-up cannot
      // double-fire and the original full-refund key cannot block it.
      expect(opts).toEqual({
        idempotencyKey: `standalone_refund_topup_${INTAKE_ID}_2000`,
      })
      expect(result).toEqual({
        success: true,
        refundId: "re_topup",
        amount: 2995,
        pending: true,
        totalRefunded: 2000,
      })
    })

    it("keeps the prior cash total until the top-up webhook proves settlement", async () => {
      mockActor("admin")
      mockIntakeFetch(makeIntakeRow({
        payment_status: "partially_refunded",
        amount_cents: 4995,
        refund_amount_cents: 2000,
      }))
      mockStripeRefundSuccess("re_topup", 2995)

      await issueRefundAction(INTAKE_ID)

      expect(getUpdatePayloads()).toContainEqual(expect.objectContaining({
        refund_status: "pending",
        refund_stripe_id: "re_topup",
      }))
      const pendingUpdate = getUpdatePayloads().find((payload) => payload.refund_stripe_id === "re_topup")
      expect(pendingUpdate).not.toHaveProperty("payment_status")
      expect(pendingUpdate).not.toHaveProperty("refund_amount_cents")
    })

    it("does not treat a short create response as durable cash", async () => {
      mockActor("admin")
      mockIntakeFetch(makeIntakeRow({
        payment_status: "partially_refunded",
        amount_cents: 4995,
        refund_amount_cents: 2000,
      }))
      // Defensive branch: Stripe returns a smaller settled amount than requested.
      mockStripeRefundSuccess("re_short", 1000)

      const result = await issueRefundAction(INTAKE_ID)

      expect(result).toEqual({
        success: true,
        refundId: "re_short",
        amount: 1000,
        pending: true,
        totalRefunded: 2000,
      })
      expect(getUpdatePayloads()).toContainEqual(expect.objectContaining({
        refund_status: "pending",
        refund_stripe_id: "re_short",
      }))
    })

    it("uses a stable idempotency key across retries of the same top-up", async () => {
      mockActor("admin")
      mockStripeRefundSuccess("re_topup", 2995)
      const intakeState = {
        payment_status: "partially_refunded",
        amount_cents: 4995,
        refund_amount_cents: 2000,
      }

      mockIntakeFetch(makeIntakeRow(intakeState))
      await issueRefundAction(INTAKE_ID)
      mockIntakeFetch(makeIntakeRow(intakeState)) // retry against unchanged state
      await issueRefundAction(INTAKE_ID)

      const [, firstOpts] = getRefundCall(0)
      const [, secondOpts] = getRefundCall(1)
      expect(firstOpts.idempotencyKey).toBe(`standalone_refund_topup_${INTAKE_ID}_2000`)
      expect(secondOpts.idempotencyKey).toBe(firstOpts.idempotencyKey)
    })

    it("refuses a top-up when nothing is left to refund", async () => {
      mockActor("admin")
      mockIntakeFetch(makeIntakeRow({
        payment_status: "partially_refunded",
        amount_cents: 4995,
        refund_amount_cents: 4995,
      }))

      const result = await issueRefundAction(INTAKE_ID)

      expect(result).toEqual({ success: false, error: "Nothing left to refund on this request." })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // 6. Non-refundable states
  // --------------------------------------------------------------------------

  describe("non-refundable states", () => {
    it("returns 'Request not found' when the intake is missing", async () => {
      mockActor("doctor")
      mockSupabaseSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } })

      const result = await issueRefundAction(INTAKE_ID)

      expect(result).toEqual({ success: false, error: "Request not found" })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("refuses when already fully refunded", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({ payment_status: "refunded", refund_amount_cents: 1995 }))

      const result = await issueRefundAction(INTAKE_ID)

      expect(result).toEqual({
        success: false,
        error: "This request has already been fully refunded.",
      })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it.each(["unpaid", "failed", "pending_payment"])(
      "refuses payment_status '%s'",
      async (paymentStatus) => {
        mockActor("doctor")
        mockIntakeFetch(makeIntakeRow({ payment_status: paymentStatus }))

        const result = await issueRefundAction(INTAKE_ID)

        expect(result.success).toBe(false)
        expect(result.error).toBe(`Refund is not available for payment status '${paymentStatus}'.`)
        expect(stripe.refunds.create).not.toHaveBeenCalled()
      },
    )
  })

  // --------------------------------------------------------------------------
  // 7. Stripe failure path
  // --------------------------------------------------------------------------

  describe("Stripe failure path", () => {
    it("surfaces the Stripe error and rolls back only its own reserved state", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow())
      vi.mocked(stripe.refunds.create).mockRejectedValue(
        new Error("charge_already_refunded") as never,
      )

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to process refund: charge_already_refunded")
      expect(getUpdatePayloads()).toEqual([
        expect.objectContaining({ refund_status: "pending" }),
        expect.objectContaining({ refund_status: "failed" }),
      ])
      expect(revalidateStaff).not.toHaveBeenCalled()
      expect(revalidatePatient).not.toHaveBeenCalled()
    })
  })

  describe("fast webhook ordering", () => {
    it.each(["succeeded", "failed"])(
      "does not overwrite exact %s evidence that lands before Refund.create returns",
      async () => {
        mockActor("doctor")
        mockIntakeFetch(makeIntakeRow())
        mockStripeRefundSuccess("re_fast", 1995)
        mutationResults = [
          {
            data: { id: INTAKE_ID, updated_at: TRIGGER_REWRITTEN_RESERVATION_AT },
            error: null,
          },
          { data: null, error: null },
        ]

        const result = await issueRefundAction(INTAKE_ID)

        expect(result.success).toBe(true)
        const updateChains = getChains().filter((chain) => chain.update?.mock.calls.length)
        const finalChain = updateChains.at(-1)
        expect(finalChain?.eq).toHaveBeenCalledWith("refund_status", "pending")
        expect(finalChain?.eq).toHaveBeenCalledWith(
          "updated_at",
          TRIGGER_REWRITTEN_RESERVATION_AT,
        )
      },
    )

    it("advances the Stripe idempotency generation after exact failed evidence", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({
        refund_status: "failed",
        refund_stripe_id: "re_failed",
      }))
      mockStripeRefundSuccess("re_retry", 1995)

      await issueRefundAction(INTAKE_ID)

      const [, options] = getRefundCall()
      expect(options.idempotencyKey).toBe(
        `standalone_refund_${INTAKE_ID}_after_re_failed`,
      )
    })
  })

  // --------------------------------------------------------------------------
  // 8. Payment-intent resolution
  // --------------------------------------------------------------------------

  describe("payment-intent resolution", () => {
    it("falls back to the Checkout Session when stripe_payment_intent_id is missing", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({ stripe_payment_intent_id: null, payment_id: "cs_test_abc" }))
      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue(
        { payment_intent: "pi_from_session" } as never,
      )
      mockStripeRefundSuccess()

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
      expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_abc")
      const [params] = getRefundCall()
      expect(params.payment_intent).toBe("pi_from_session")
    })

    it("errors when no payment intent can be resolved", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({ stripe_payment_intent_id: null, payment_id: null }))

      const result = await issueRefundAction(INTAKE_ID)

      expect(result).toEqual({ success: false, error: "No payment found for this request" })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it("errors (not crashes) when the session lookup itself fails", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({ stripe_payment_intent_id: null, payment_id: "cs_test_abc" }))
      vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(
        new Error("No such checkout session") as never,
      )

      const result = await issueRefundAction(INTAKE_ID)

      expect(result).toEqual({ success: false, error: "No payment found for this request" })
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // 9. Patient email is owned by the cash-confirmed webhook
  // --------------------------------------------------------------------------

  describe("webhook-owned patient email", () => {
    it("does not require a patient email address", async () => {
      mockActor("doctor")
      mockIntakeFetch(makeIntakeRow({
        patient: [{ id: "patient-1", full_name: "Test Patient", email: null }],
      }))
      mockStripeRefundSuccess()

      const result = await issueRefundAction(INTAKE_ID)

      expect(result.success).toBe(true)
    })
  })
})
