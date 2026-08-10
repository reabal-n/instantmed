import { beforeEach, describe, expect, it, vi } from "vitest"

import { HIGH_STAKES_PAYMENT_LOCK } from "@/lib/stripe/payment-safety-lock"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const ACTOR_ID = "22222222-2222-4222-8222-222222222222"

const mocks = vi.hoisted(() => ({
  checkServerActionRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  logAuditEvent: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  revalidatePatient: vi.fn(),
  revalidateStaff: vi.fn(),
  requireRoleOrNull: vi.fn(),
  sentryCaptureException: vi.fn(),
  sentrySetTag: vi.fn(),
  sentrySetUser: vi.fn(),
  stripeSessionExpire: vi.fn(),
  stripeSessionRetrieve: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.sentryCaptureException,
  setTag: mocks.sentrySetTag,
  setUser: mocks.sentrySetUser,
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: vi.fn(),
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidatePatient: mocks.revalidatePatient,
  revalidateStaff: mocks.revalidateStaff,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
}))

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    checkout: {
      sessions: {
        expire: mocks.stripeSessionExpire,
        retrieve: mocks.stripeSessionRetrieve,
      },
    },
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

type Fixture = {
  checkout_error: string | null
  id: string
  payment_id: string | null
  payment_status: string | null
  status: string
  stripe_payment_intent_id: string | null
}

function createSupabaseMock(
  intake: Fixture,
  closedRows: Array<{ id: string }> = [{ id: intake.id }],
) {
  const updateFilters: Array<{ method: string; column: string; value: unknown }> = []
  const updatePayloads: Array<Record<string, unknown>> = []
  const fetchChain = {
    eq: vi.fn(() => fetchChain),
    single: vi.fn(async () => ({ data: intake, error: null })),
  }
  const updateChain = {
    eq: vi.fn((column: string, value: unknown) => {
      updateFilters.push({ method: "eq", column, value })
      return updateChain
    }),
    is: vi.fn((column: string, value: unknown) => {
      updateFilters.push({ method: "is", column, value })
      return updateChain
    }),
    select: vi.fn(async () => ({ data: closedRows, error: null })),
  }
  const table = {
    select: vi.fn(() => fetchChain),
    update: vi.fn((payload: Record<string, unknown>) => {
      updatePayloads.push(payload)
      return updateChain
    }),
  }
  const supabase = { from: vi.fn(() => table) }
  return { supabase, table, updateFilters, updatePayloads }
}

function failedCheckout(overrides: Partial<Fixture> = {}): Fixture {
  return {
    checkout_error: "stripe_checkout_session_failed",
    id: INTAKE_ID,
    payment_id: "cs_current",
    payment_status: "unpaid",
    status: "checkout_failed",
    stripe_payment_intent_id: null,
    ...overrides,
  }
}

describe("closeFailedCheckoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.requireRoleOrNull.mockResolvedValue({
      profile: { id: ACTOR_ID, role: "support" },
      user: { id: "33333333-3333-4333-8333-333333333333" },
    })
    mocks.logAuditEvent.mockResolvedValue(undefined)
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_current",
      metadata: { intake_id: INTAKE_ID },
      payment_status: "unpaid",
      status: "expired",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_current", status: "expired" })
  })

  it("closes an expired unpaid checkout with exact compare-and-set guards and actor audit", async () => {
    const { supabase, updateFilters, updatePayloads } = createSupabaseMock(failedCheckout())
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result.success).toBe(true)
    expect(updatePayloads[0]).toMatchObject({ status: "cancelled" })
    expect(updateFilters).toEqual(expect.arrayContaining([
      { method: "eq", column: "id", value: INTAKE_ID },
      { method: "eq", column: "status", value: "checkout_failed" },
      { method: "eq", column: "payment_status", value: "unpaid" },
      { method: "eq", column: "checkout_error", value: "stripe_checkout_session_failed" },
      { method: "eq", column: "payment_id", value: "cs_current" },
      { method: "is", column: "stripe_payment_intent_id", value: null },
    ]))
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "admin_action",
      actorId: ACTOR_ID,
      actorType: "support",
      intakeId: INTAKE_ID,
      fromState: "checkout_failed",
      toState: "cancelled",
    }))
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({ intakeId: INTAKE_ID, ops: true })
  })

  it("expires an open matching Stripe session before closing", async () => {
    const { supabase } = createSupabaseMock(failedCheckout())
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_current",
      metadata: { intake_id: INTAKE_ID },
      payment_status: "unpaid",
      status: "open",
    })
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result.success).toBe(true)
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_current")
  })

  it("supports historical rows with nullable payment, error, and session fields", async () => {
    const { supabase, updateFilters } = createSupabaseMock(failedCheckout({
      checkout_error: null,
      payment_id: null,
      payment_status: null,
    }))
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result.success).toBe(true)
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
    expect(updateFilters).toEqual(expect.arrayContaining([
      { method: "is", column: "payment_status", value: null },
      { method: "is", column: "checkout_error", value: null },
      { method: "is", column: "payment_id", value: null },
      { method: "is", column: "stripe_payment_intent_id", value: null },
    ]))
  })

  it("blocks a completed Stripe session without touching the intake", async () => {
    const { supabase, table } = createSupabaseMock(failedCheckout())
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_current",
      metadata: { intake_id: INTAKE_ID },
      payment_status: "paid",
      status: "complete",
    })
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result).toEqual({
      success: false,
      error: "Stripe shows this checkout as completed. Reconcile the payment before closure.",
    })
    expect(table.update).not.toHaveBeenCalled()
  })

  it("blocks payment safety holds without calling Stripe", async () => {
    const { supabase, table } = createSupabaseMock(failedCheckout({
      checkout_error: HIGH_STAKES_PAYMENT_LOCK,
    }))
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result.success).toBe(false)
    expect(table.update).not.toHaveBeenCalled()
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
  })

  it("blocks non-unpaid database payment states without calling Stripe", async () => {
    const { supabase, table } = createSupabaseMock(failedCheckout({ payment_status: "paid" }))
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result.success).toBe(false)
    expect(table.update).not.toHaveBeenCalled()
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
  })

  it("blocks an orphan PaymentIntent when there is no Checkout Session to make terminal", async () => {
    const { supabase, table } = createSupabaseMock(failedCheckout({
      payment_id: null,
      stripe_payment_intent_id: "pi_unresolved",
    }))
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result).toEqual({
      success: false,
      error: "This request has an unresolved PaymentIntent. Reconcile it before closure.",
    })
    expect(table.update).not.toHaveBeenCalled()
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
  })

  it("fails safely when a concurrent state change makes the guarded update match no rows", async () => {
    const { supabase } = createSupabaseMock(failedCheckout(), [])
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result).toEqual({
      success: false,
      error: "The payment state changed before closure. Refresh and reconcile the latest status.",
    })
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
  })

  it("returns committed success when only the companion actor audit must queue", async () => {
    const { supabase } = createSupabaseMock(failedCheckout())
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.logAuditEvent.mockRejectedValueOnce(new Error("audit queue full"))
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction(INTAKE_ID)

    expect(result.success).toBe(true)
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Close failed checkout: staff attribution audit queued",
      expect.objectContaining({ intakeId: INTAKE_ID }),
    )
  })

  it("rejects malformed IDs before authentication", async () => {
    const { closeFailedCheckoutAction } = await import("@/app/admin/intakes/close-failed-checkout-action")

    const result = await closeFailedCheckoutAction("not-an-id")

    expect(result).toEqual({ success: false, error: "Invalid request ID" })
    expect(mocks.requireRoleOrNull).not.toHaveBeenCalled()
  })
})
