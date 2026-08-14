import { beforeEach, describe, expect, it, vi } from "vitest"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const ADMIN_ID = "22222222-2222-4222-8222-222222222222"

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  createServiceRoleClient: vi.fn(),
  doctorHasCapability: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  revalidateStaff: vi.fn(),
  requireRoleOrNull: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
  setTag: mocks.setTag,
  setUser: mocks.setUser,
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: vi.fn(),
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/auth/staff-capabilities", () => ({
  doctorHasCapability: mocks.doctorHasCapability,
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidateStaff: mocks.revalidateStaff,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { recordHistoricalAutoIssuedNoCorrectionAction } from "@/app/actions/historical-auto-issued-review"

function stubRpc(outcome: string | null, error: unknown = null) {
  const rpc = vi.fn(async () => ({ data: outcome, error }))
  mocks.createServiceRoleClient.mockReturnValue({ rpc })
  return rpc
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireRoleOrNull.mockResolvedValue({
    profile: { id: ADMIN_ID, role: "admin" },
    user: { id: "33333333-3333-4333-8333-333333333333" },
  })
  mocks.doctorHasCapability.mockReturnValue(true)
})

describe("recordHistoricalAutoIssuedNoCorrectionAction", () => {
  it("rejects ordinary doctor/support callers before creating a service-role client", async () => {
    mocks.requireRoleOrNull.mockResolvedValueOnce(null)

    await expect(recordHistoricalAutoIssuedNoCorrectionAction({ intakeId: INTAKE_ID }))
      .resolves.toEqual({ success: false, error: "Unauthorized" })
    expect(mocks.requireRoleOrNull).toHaveBeenCalledWith(["admin"])
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("uses the authenticated admin profile as the immutable actor", async () => {
    const rpc = stubRpc("recorded")

    await expect(recordHistoricalAutoIssuedNoCorrectionAction({ intakeId: INTAKE_ID }))
      .resolves.toEqual({ success: true, data: { outcome: "recorded" } })
    expect(rpc).toHaveBeenCalledWith("record_historical_auto_issued_no_correction", {
      p_actor_id: ADMIN_ID,
      p_intake_id: INTAKE_ID,
    })
    expect(mocks.revalidateStaff).toHaveBeenCalledWith({ intakeId: INTAKE_ID, ops: true })
  })

  it("treats a repeated exact-version receipt as idempotent success", async () => {
    stubRpc("already_recorded")

    await expect(recordHistoricalAutoIssuedNoCorrectionAction({ intakeId: INTAKE_ID }))
      .resolves.toEqual({ success: true, data: { outcome: "already_recorded" } })
  })

  it.each([
    ["case_not_opened", "Reload this review"],
    ["case_state_changed", "certificate changed"],
    ["correction_started", "returned for correction"],
    ["case_not_found", "fixed historical review cohort"],
    ["actor_not_authorized", "not authorised"],
    ["cohort_mismatch", "paused because its fixed cohort changed"],
  ])("fails closed for %s", async (outcome, message) => {
    stubRpc(outcome)

    const result = await recordHistoricalAutoIssuedNoCorrectionAction({ intakeId: INTAKE_ID })
    expect(result.success).toBe(false)
    expect(result.error).toContain(message)
    expect(mocks.revalidateStaff).not.toHaveBeenCalled()
  })

  it("does not expose database errors or claim a mutation on infrastructure failure", async () => {
    stubRpc(null, { message: "sensitive database detail" })

    await expect(recordHistoricalAutoIssuedNoCorrectionAction({ intakeId: INTAKE_ID }))
      .resolves.toEqual({
        success: false,
        error: "The review receipt could not be recorded. Nothing was changed; reload and try again.",
      })
    expect(mocks.revalidateStaff).not.toHaveBeenCalled()
  })
})
