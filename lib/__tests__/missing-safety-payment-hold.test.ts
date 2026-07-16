import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  stripeSessionExpire: vi.fn(),
  stripeSessionRetrieve: vi.fn(),
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
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

import {
  attachCheckoutSession,
  confirmCheckoutSessionStillCurrent,
} from "@/lib/stripe/checkout/checkout-session-safety"
import { holdCheckoutForMissingSafetyInformation } from "@/lib/stripe/checkout/missing-safety-payment-hold"
import { reconcileChangedCheckoutSessionForReturn } from "@/lib/stripe/checkout/return-payment-reconciliation"

interface PaymentState {
  checkout_error: string | null
  id: string
  payment_id: string | null
  payment_status: string | null
  status: string | null
}

function createHoldSupabaseMock({
  holdError = null,
  heldRows,
  refetchError = null,
  refetchedRows = [],
}: {
  holdError?: { message: string } | null
  heldRows: PaymentState[] | null
  refetchError?: { message: string } | null
  refetchedRows?: Array<PaymentState | null>
}) {
  const filters: Array<{ column?: string; method: string; value: unknown }> = []
  const updatePayloads: Array<Record<string, unknown>> = []
  const updateChain = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, method: "eq", value })
      return updateChain
    }),
    in: vi.fn((column: string, value: unknown) => {
      filters.push({ column, method: "in", value })
      return updateChain
    }),
    is: vi.fn((column: string, value: unknown) => {
      filters.push({ column, method: "is", value })
      return updateChain
    }),
    not: vi.fn((column: string, operator: string, value: unknown) => {
      filters.push({ column, method: `not:${operator}`, value })
      return updateChain
    }),
    or: vi.fn((value: string) => {
      filters.push({ method: "or", value })
      return updateChain
    }),
    select: vi.fn(async () => ({ data: heldRows, error: holdError })),
  }
  let refetchIndex = 0
  const selectChain = {
    eq: vi.fn(() => selectChain),
    maybeSingle: vi.fn(async () => ({
      data: refetchedRows[Math.min(refetchIndex++, refetchedRows.length - 1)] ?? null,
      error: refetchError,
    })),
  }
  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      update: vi.fn((payload: Record<string, unknown>) => {
        updatePayloads.push(payload)
        return updateChain
      }),
    })),
  }
  return { filters, supabase, updatePayloads }
}

describe("missing safety information payment hold", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("holds a retryable intake without a Session while preserving financial ownership", async () => {
    const updatePayloads: Array<Record<string, unknown>> = []
    const filters: Array<{ column: string; method: string; value: unknown }> = []
    const capturedRow = {
      checkout_error: "safety_missing_required_information",
      id: "intake-1",
      payment_id: null,
      payment_status: "unpaid",
      status: "checkout_failed",
    }
    const updateChain = {
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, method: "eq", value })
        return updateChain
      }),
      in: vi.fn((column: string, value: unknown) => {
        filters.push({ column, method: "in", value })
        return updateChain
      }),
      or: vi.fn((value: string) => {
        filters.push({ column: "checkout_error", method: "or", value })
        return updateChain
      }),
      select: vi.fn(async () => ({ data: [capturedRow], error: null })),
    }
    const supabase = {
      from: vi.fn(() => ({
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload)
          return updateChain
        }),
      })),
    }

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      patientId: "patient-1",
      source: "retry_payment",
      supabase: supabase as never,
    })

    expect(result).toBe("held")
    expect(updatePayloads).toEqual([
      expect.objectContaining({
        checkout_error: "safety_missing_required_information",
        live_consult_reason: "Required medical information is missing.",
        requires_live_consult: false,
        status: "checkout_failed",
        triage_reasons: ["missing_safety_fields"],
        triage_result: "request_more_info",
      }),
    ])
    expect(updatePayloads[0]).not.toHaveProperty("payment_id")
    expect(updatePayloads[0]).not.toHaveProperty("payment_status")
    expect(updatePayloads[0]).not.toHaveProperty("cancelled_at")
    expect(updatePayloads[0]).not.toHaveProperty("declined_at")
    expect(filters).toEqual(expect.arrayContaining([
      { column: "id", method: "eq", value: "intake-1" },
      { column: "patient_id", method: "eq", value: "patient-1" },
      {
        column: "status",
        method: "in",
        value: ["pending_payment", "checkout_failed"],
      },
      {
        column: "payment_status",
        method: "in",
        value: ["pending", "unpaid", "failed"],
      },
      {
        column: "checkout_error",
        method: "or",
        value:
          "checkout_error.is.null,checkout_error.neq.safety_blocked_high_stakes",
      },
    ]))
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
  })

  it("withholds an inspected open Session when a safety lock is visible on the final row read", async () => {
    const selectChain = {
      eq: vi.fn(() => selectChain),
      maybeSingle: vi.fn(async () => ({
        data: {
          checkout_error: "safety_missing_required_information",
          payment_id: "cs_current",
          payment_status: "pending",
          status: "checkout_failed",
        },
        error: null,
      })),
    }
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => selectChain),
      })),
    }

    const result = await confirmCheckoutSessionStillCurrent({
      intakeId: "intake-1",
      patientId: "patient-1",
      sessionId: "cs_current",
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toEqual({
      currentState: {
        checkout_error: "safety_missing_required_information",
        payment_id: "cs_current",
        payment_status: "pending",
        status: "checkout_failed",
      },
      outcome: "state_changed",
    })
  })

  it("captures and invalidates a Session attached immediately before the hold", async () => {
    const heldState: PaymentState = {
      checkout_error: "safety_missing_required_information",
      id: "intake-1",
      payment_id: "cs_new_current",
      payment_status: "pending",
      status: "checkout_failed",
    }
    const { supabase, updatePayloads } = createHoldSupabaseMock({
      heldRows: [heldState],
    })
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_new_current",
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "open",
      url: "https://checkout.stripe.test/pay/cs_new_current",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_new_current" })

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toBe("held")
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_new_current")
    expect(updatePayloads[0]).not.toHaveProperty("payment_id")
    expect(updatePayloads[0]).not.toHaveProperty("payment_status")
  })

  it.each([
    ["already expired", "expired", "unpaid", "pending"],
    ["persisted failed", "complete", "unpaid", "failed"],
  ])("treats an exact-current %s Session as safely invalidated", async (
    _case,
    sessionStatus,
    sessionPaymentStatus,
    persistedPaymentStatus,
  ) => {
    const heldState: PaymentState = {
      checkout_error: "safety_missing_required_information",
      id: "intake-1",
      payment_id: "cs_current",
      payment_status: persistedPaymentStatus,
      status: "checkout_failed",
    }
    const { supabase } = createHoldSupabaseMock({ heldRows: [heldState] })
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_current",
      metadata: { intake_id: "intake-1" },
      payment_status: sessionPaymentStatus,
      status: sessionStatus,
      url: null,
    })

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toBe("held")
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
  })

  it.each([
    ["paid", "open", "paid"],
    ["payment in flight", "complete", "unpaid"],
  ])("retains the hold without expiring an exact-current %s Session", async (
    _case,
    sessionStatus,
    sessionPaymentStatus,
  ) => {
    const heldState: PaymentState = {
      checkout_error: "safety_missing_required_information",
      id: "intake-1",
      payment_id: "cs_current",
      payment_status: "pending",
      status: "checkout_failed",
    }
    const { supabase } = createHoldSupabaseMock({ heldRows: [heldState] })
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_current",
      metadata: { intake_id: "intake-1" },
      payment_status: sessionPaymentStatus,
      status: sessionStatus,
      url: null,
    })

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toBe("payment_in_flight")
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
  })

  it("distinguishes a persisted hold whose exact Session invalidation is unresolved", async () => {
    const heldState: PaymentState = {
      checkout_error: "safety_missing_required_information",
      id: "intake-1",
      payment_id: "cs_current",
      payment_status: "pending",
      status: "checkout_failed",
    }
    const { supabase, updatePayloads } = createHoldSupabaseMock({
      heldRows: [heldState],
    })
    mocks.stripeSessionRetrieve.mockRejectedValue(new Error("Stripe unavailable"))

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toBe("held_invalidation_unresolved")
    expect(updatePayloads[0]).toMatchObject({
      checkout_error: "safety_missing_required_information",
      status: "checkout_failed",
    })
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
  })

  it("keeps an unknown hold reconciliation failure unresolved", async () => {
    const { supabase } = createHoldSupabaseMock({
      heldRows: null,
      holdError: { message: "hold write unavailable" },
      refetchError: { message: "hold read unavailable" },
    })

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      source: "retry_payment",
      supabase: supabase as never,
    })

    expect(result).toBe("unresolved")
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
  })

  it("reconciles an existing missing-information marker idempotently", async () => {
    const heldState: PaymentState = {
      checkout_error: "safety_missing_required_information",
      id: "intake-1",
      payment_id: "cs_current",
      payment_status: "pending",
      status: "checkout_failed",
    }
    const { supabase } = createHoldSupabaseMock({
      heldRows: [],
      refetchedRows: [heldState],
    })
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_current",
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "open",
      url: "https://checkout.stripe.test/pay/cs_current",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_current" })

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: [],
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toBe("held")
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_current")
  })

  it("does not overwrite a concurrent high-stakes lock", async () => {
    const highStakesState: PaymentState = {
      checkout_error: "safety_blocked_high_stakes",
      id: "intake-1",
      payment_id: "cs_current",
      payment_status: "pending",
      status: "pending_payment",
    }
    const { filters, supabase } = createHoldSupabaseMock({
      heldRows: [],
      refetchedRows: [highStakesState],
    })

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toBe("state_changed")
    expect(filters).toContainEqual({
      method: "or",
      value: "checkout_error.is.null,checkout_error.neq.safety_blocked_high_stakes",
    })
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
  })

  it("invalidates a new orphan when the missing-information hold wins the attach race", async () => {
    const currentState: PaymentState = {
      checkout_error: "safety_missing_required_information",
      id: "intake-1",
      payment_id: "cs_previous",
      payment_status: "pending",
      status: "checkout_failed",
    }
    const { supabase } = createHoldSupabaseMock({
      heldRows: [],
      refetchedRows: [currentState],
    })
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_new_orphan",
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "open",
      url: "https://checkout.stripe.test/pay/cs_new_orphan",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_new_orphan" })

    const result = await attachCheckoutSession({
      expectedPaymentId: "cs_previous",
      intakeId: "intake-1",
      sessionId: "cs_new_orphan",
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toMatchObject({ outcome: "state_changed" })
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_new_orphan")
  })

  it("overwrites a replacement claim, invalidates its old current Session, and rejects the eventual orphan", async () => {
    const replacementState: PaymentState = {
      checkout_error: "payment_session_replacement_in_progress",
      id: "intake-1",
      payment_id: "cs_previous",
      payment_status: "pending",
      status: "checkout_failed",
    }
    const heldState: PaymentState = {
      ...replacementState,
      checkout_error: "safety_missing_required_information",
    }
    const holdMock = createHoldSupabaseMock({ heldRows: [heldState] })
    mocks.stripeSessionRetrieve.mockImplementation(async (sessionId: string) => ({
      id: sessionId,
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "open",
      url: `https://checkout.stripe.test/pay/${sessionId}`,
    }))
    mocks.stripeSessionExpire.mockImplementation(async (sessionId: string) => ({
      id: sessionId,
    }))

    const hold = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      source: "guest_resume",
      supabase: holdMock.supabase as never,
    })

    expect(hold).toBe("held")
    expect(holdMock.updatePayloads[0]).toMatchObject({
      checkout_error: "safety_missing_required_information",
      status: "checkout_failed",
    })
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_previous")

    const attachMock = createHoldSupabaseMock({
      heldRows: [],
      refetchedRows: [heldState],
    })
    const attach = await attachCheckoutSession({
      expectedPaymentId: "cs_previous",
      intakeId: "intake-1",
      sessionId: "cs_replacement_orphan",
      source: "guest_resume",
      supabase: attachMock.supabase as never,
    })

    expect(attach).toMatchObject({ outcome: "state_changed" })
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith(
      "cs_replacement_orphan",
    )
  })

  it("fails closed when the exact Session metadata belongs to another intake", async () => {
    const heldState: PaymentState = {
      checkout_error: "safety_missing_required_information",
      id: "intake-1",
      payment_id: "cs_stale",
      payment_status: "pending",
      status: "checkout_failed",
    }
    const { supabase } = createHoldSupabaseMock({ heldRows: [heldState] })
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_stale",
      metadata: { intake_id: "other-intake" },
      payment_status: "unpaid",
      status: "open",
      url: "https://checkout.stripe.test/pay/cs_stale",
    })

    const result = await holdCheckoutForMissingSafetyInformation({
      intakeId: "intake-1",
      missingFields: ["hasSideEffects"],
      source: "guest_resume",
      supabase: supabase as never,
    })

    expect(result).toBe("held_invalidation_unresolved")
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
  })

  it("preserves guest duplicate completion when the final row is already paid", async () => {
    const result = await reconcileChangedCheckoutSessionForReturn({
      intakeId: "intake-1",
      state: {
        checkout_error: null,
        payment_id: "cs_new_current",
        payment_status: "paid",
        status: "paid",
      },
    })

    expect(result).toEqual({
      outcome: "payment_in_flight",
      sessionId: "cs_new_current",
    })
    expect(mocks.stripeSessionRetrieve).not.toHaveBeenCalled()
  })

  it("preserves guest duplicate processing for a freshly inspected exact-current Session", async () => {
    mocks.stripeSessionRetrieve.mockResolvedValue({
      id: "cs_new_current",
      metadata: { intake_id: "intake-1" },
      payment_status: "unpaid",
      status: "complete",
      url: null,
    })

    const result = await reconcileChangedCheckoutSessionForReturn({
      intakeId: "intake-1",
      state: {
        checkout_error: null,
        payment_id: "cs_new_current",
        payment_status: "pending",
        status: "pending_payment",
      },
    })

    expect(result).toEqual({
      outcome: "payment_in_flight",
      sessionId: "cs_new_current",
    })
    expect(mocks.stripeSessionRetrieve).toHaveBeenCalledWith("cs_new_current")
  })
})
