import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  buildRecoveryUrl: vi.fn(() => "https://instantmed.com.au/resume/signed"),
  inspectCheckoutSession: vi.fn(),
  maybeSingle: vi.fn(),
  requireRoleOrNull: vi.fn(),
  resolvePaymentRecoveryCanonicality: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/config/env", () => ({
  getAppUrl: () => "https://instantmed.com.au",
}))

vi.mock("@/lib/email/recovery-links", () => ({
  buildCheckoutPaymentRecoveryUrl: mocks.buildRecoveryUrl,
}))

vi.mock("@/lib/stripe/checkout/checkout-session-safety", () => ({
  HIGH_STAKES_PAYMENT_LOCK: "high_stakes_payment_state_unresolved",
  inspectCheckoutSession: mocks.inspectCheckoutSession,
}))

vi.mock("@/lib/stripe/canonical-payment-recovery", () => ({
  resolvePaymentRecoveryCanonicality: mocks.resolvePaymentRecoveryCanonicality,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => {
    const chain = {
      eq: vi.fn(() => chain),
      maybeSingle: mocks.maybeSingle,
      select: vi.fn(() => chain),
    }
    return { from: vi.fn(() => chain) }
  },
}))

import { buildPaymentRescueAction } from "@/app/admin/intakes/payment-rescue-action"

const INTAKE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"

describe("staff payment rescue action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleOrNull.mockResolvedValue({
      profile: { id: "support-1", role: "support" },
      user: { id: "auth-1" },
    })
    mocks.resolvePaymentRecoveryCanonicality.mockResolvedValue({ kind: "canonical" })
    mocks.maybeSingle.mockResolvedValue({
      data: {
        category: "prescription",
        created_at: "2026-07-14T21:30:00.000Z",
        guest_email: "patient@example.com",
        id: INTAKE_ID,
        patient_id: "patient-1",
        payment_id: null,
        payment_status: "pending",
        status: "pending_payment",
        subtype: "repeat",
      },
      error: null,
    })
  })

  it("rechecks live state and returns a short copy-ready recovery message", async () => {
    const result = await buildPaymentRescueAction(INTAKE_ID)

    expect(mocks.requireRoleOrNull).toHaveBeenCalledWith(["admin", "support"])
    expect(mocks.buildRecoveryUrl).toHaveBeenCalledWith({
      appUrl: "https://instantmed.com.au",
      campaign: "support_payment_recovery",
      intakeId: INTAKE_ID,
      isGuest: true,
    })
    expect(result).toEqual({
      success: true,
      data: {
        clipboardText:
          "We can't see a completed payment yet, but your request is saved. Use this link to finish payment: https://instantmed.com.au/resume/signed\n\nIf it still doesn't work, reply here and we'll sort it out.",
        recoveryUrl: "https://instantmed.com.au/resume/signed",
      },
    })
  })

  it("fails closed when Stripe says payment is complete or processing", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        guest_email: null,
        id: INTAKE_ID,
        payment_id: "cs_test_live",
        payment_status: "pending",
        status: "pending_payment",
      },
      error: null,
    })
    mocks.inspectCheckoutSession.mockResolvedValue({
      session: { id: "cs_test_live" },
      state: "payment_in_flight",
    })

    const result = await buildPaymentRescueAction(INTAKE_ID)

    expect(result).toEqual({
      success: false,
      error: "Payment is already complete or processing. Refresh the ledger before sending anything.",
    })
    expect(mocks.buildRecoveryUrl).not.toHaveBeenCalled()
  })

  it("does not produce a rescue link for an older duplicate", async () => {
    mocks.resolvePaymentRecoveryCanonicality.mockResolvedValueOnce({
      canonicalIntakeId: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
      kind: "superseded",
    })

    const result = await buildPaymentRescueAction(INTAKE_ID)

    expect(result).toEqual({
      success: false,
      error: "This is an older duplicate. Use the newest request in this service lane.",
    })
    expect(mocks.buildRecoveryUrl).not.toHaveBeenCalled()
  })

  it("does not expose a recovery link to unauthorised users", async () => {
    mocks.requireRoleOrNull.mockResolvedValue(null)

    const result = await buildPaymentRescueAction(INTAKE_ID)

    expect(result).toEqual({ success: false, error: "Unauthorized" })
    expect(mocks.maybeSingle).not.toHaveBeenCalled()
  })
})
