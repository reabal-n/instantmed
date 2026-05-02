import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserWithProfile: vi.fn(),
  createServiceRoleClient: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
  logAuditEvent: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/auth/helpers", () => ({
  getAuthenticatedUserWithProfile: mocks.getAuthenticatedUserWithProfile,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function createClosureSupabaseMock(options?: {
  activeIntakes?: Array<Record<string, unknown>>
}) {
  const updatePayloads: Record<string, unknown>[] = []
  const filters: Array<{ method: string; column: string; value: unknown }> = []
  const tableCalls: string[] = []
  const activeIntakes = options?.activeIntakes ?? []

  const intakeQueryBuilder = {
    eq: vi.fn(() => intakeQueryBuilder),
    in: vi.fn(() => intakeQueryBuilder),
    limit: vi.fn(async () => ({
      data: activeIntakes,
      error: null,
    })),
  }

  const profileUpdateBuilder = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ method: "eq", column, value })
      return profileUpdateBuilder
    }),
    is: vi.fn((column: string, value: unknown) => {
      filters.push({ method: "is", column, value })
      return profileUpdateBuilder
    }),
    select: vi.fn(() => profileUpdateBuilder),
    maybeSingle: vi.fn(async () => ({
      data: { id: "profile-id" },
      error: null,
    })),
  }

  const profiles = {
    update: vi.fn((payload: Record<string, unknown>) => {
      updatePayloads.push(payload)
      return profileUpdateBuilder
    }),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      tableCalls.push(table)
      if (table === "intakes") {
        return {
          select: vi.fn(() => intakeQueryBuilder),
        }
      }
      if (table !== "profiles") throw new Error(`Unexpected table ${table}`)
      return profiles
    }),
  }

  return {
    filters,
    profiles,
    supabase,
    tableCalls,
    updatePayloads,
  }
}

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue({
      user: { id: "auth-user-id", email: "patient@example.test" },
      profile: {
        id: "profile-id",
        role: "patient",
        email: "patient@example.test",
        full_name: "Test Patient",
      },
    })
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.logAuditEvent.mockResolvedValue(undefined)
  })

  it("closes patient sign-in access, minimises profile PHI, and retains clinical tables", async () => {
    const { filters, supabase, tableCalls, updatePayloads } = createClosureSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { deleteAccount } = await import("@/app/actions/account")

    const result = await deleteAccount()

    expect(result).toEqual({ success: true, error: null })
    expect(mocks.checkServerActionRateLimit).toHaveBeenCalledWith("profile-id", "sensitive")
    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0]).toMatchObject({
      auth_user_id: null,
      account_closure_reason: "self_service",
      email: null,
      full_name: "Closed Account",
      first_name: null,
      last_name: null,
      date_of_birth: null,
      date_of_birth_encrypted: null,
      phone: null,
      phone_encrypted: null,
      medicare_number: null,
      medicare_number_encrypted: null,
      medicare_irn: null,
      medicare_expiry: null,
      stripe_customer_id: null,
      parchment_patient_id: null,
      certificate_identity_complete: false,
    })
    expect(updatePayloads[0]?.account_closed_at).toEqual(expect.any(String))
    expect(filters).toEqual([
      { method: "eq", column: "id", value: "profile-id" },
      { method: "eq", column: "auth_user_id", value: "auth-user-id" },
      { method: "is", column: "account_closed_at", value: null },
    ])
    expect(tableCalls).toEqual(["intakes", "profiles"])
    expect(mocks.logAuditEvent).toHaveBeenCalledWith({
      action: "account_closed",
      actorId: "profile-id",
      actorType: "patient",
      metadata: expect.objectContaining({
        account_closed_at: updatePayloads[0]?.account_closed_at,
        closure_type: "self_service",
        retained_records: true,
      }),
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/")
  })

  it("rejects non-patient profiles", async () => {
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue({
      user: { id: "auth-user-id" },
      profile: { id: "doctor-id", role: "doctor" },
    })
    const { deleteAccount } = await import("@/app/actions/account")

    const result = await deleteAccount()

    expect(result).toEqual({ success: false, error: "Account closure is only available for patient accounts" })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("does not close accounts with active clinical work", async () => {
    const { supabase, updatePayloads } = createClosureSupabaseMock({
      activeIntakes: [{ id: "intake-id", status: "paid" }],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { deleteAccount } = await import("@/app/actions/account")

    const result = await deleteAccount()

    expect(result).toEqual({
      success: false,
      error: "You have an active request. Contact support before closing your account.",
    })
    expect(updatePayloads).toHaveLength(0)
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
  })
})
