import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  MISSING_SAFETY_INFORMATION_PAYMENT_LOCK,
  PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER,
} from "@/lib/stripe/payment-safety-lock"

const mocks = vi.hoisted(() => ({
  checkServerActionRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getApiAuth: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  revalidatePatient: vi.fn(),
  revalidateStaff: vi.fn(),
  sentryCaptureException: vi.fn(),
  sentrySetTag: vi.fn(),
  sentrySetUser: vi.fn(),
  stripeSessionExpire: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.sentryCaptureException,
  setTag: mocks.sentrySetTag,
  setUser: mocks.sentrySetUser,
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: mocks.getApiAuth,
  requireRoleOrNull: vi.fn(),
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

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    checkout: {
      sessions: { expire: mocks.stripeSessionExpire },
    },
  },
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

interface CancelFixture {
  checkout_error: string | null
  id: string
  patient_id: string
  payment_id: string | null
  payment_status: string | null
  status: string
}

function createCancelSupabaseMock(
  intake: CancelFixture,
  cancelledRows: Array<{ id: string }> = [{ id: intake.id }],
) {
  const updateFilters: Array<{ method: string; value: unknown }> = []
  const updatePayloads: Array<Record<string, unknown>> = []
  const fetchChain = {
    eq: vi.fn(() => fetchChain),
    single: vi.fn(async () => ({ data: intake, error: null })),
  }
  const updateChain = {
    eq: vi.fn((column: string, value: unknown) => {
      updateFilters.push({ method: `eq:${column}`, value })
      return updateChain
    }),
    in: vi.fn((column: string, value: unknown) => {
      updateFilters.push({ method: `in:${column}`, value })
      return updateChain
    }),
    or: vi.fn((value: string) => {
      updateFilters.push({ method: "or", value })
      return updateChain
    }),
    select: vi.fn(async () => ({ data: cancelledRows, error: null })),
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

describe("cancelIntake", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.getApiAuth.mockResolvedValue({
      profile: { id: "patient-1", role: "patient" },
      userId: "auth-user-1",
    })
    mocks.stripeSessionExpire.mockResolvedValue({ id: "cs_current" })
  })

  it("rejects an exact missing-information hold without cancelling or touching Stripe", async () => {
    const { supabase, table } = createCancelSupabaseMock({
      checkout_error: MISSING_SAFETY_INFORMATION_PAYMENT_LOCK,
      id: "intake-1",
      patient_id: "patient-1",
      payment_id: "cs_current",
      payment_status: "unpaid",
      status: "checkout_failed",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { cancelIntake } = await import("@/app/actions/cancel-intake")

    const result = await cancelIntake("intake-1")

    expect(result).toEqual({
      error: "This request cannot be cancelled while more information is required.",
      success: false,
    })
    expect(table.update).not.toHaveBeenCalled()
    expect(mocks.stripeSessionExpire).not.toHaveBeenCalled()
  })

  it("preserves cancellation for an ordinary unpaid checkout failure", async () => {
    const { supabase, updateFilters, updatePayloads } = createCancelSupabaseMock({
      checkout_error: "stripe_checkout_session_failed",
      id: "intake-1",
      patient_id: "patient-1",
      payment_id: "cs_current",
      payment_status: "unpaid",
      status: "checkout_failed",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { cancelIntake } = await import("@/app/actions/cancel-intake")

    const result = await cancelIntake("intake-1")

    expect(result).toEqual({ success: true })
    expect(updatePayloads).toHaveLength(1)
    expect(updateFilters).toContainEqual({
      method: "or",
      value:
        "payment_status.is.null,payment_status.not.in.(paid,refunded,partially_refunded,disputed)",
    })
    expect(updateFilters).toContainEqual({
      method: "or",
      value: PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER,
    })
    expect(mocks.stripeSessionExpire).toHaveBeenCalledWith("cs_current")
  })
})
