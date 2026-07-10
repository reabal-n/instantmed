import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserWithProfile: vi.fn(),
  createServiceRoleClient: vi.fn(),
  createClient: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
  globalSignOut: vi.fn(),
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

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}))

function createClosureSupabaseMock(options?: {
  result?: { success: boolean; error_code: string | null; closed_at: string | null }
  avatarNames?: string[]
}) {
  const rpc = vi.fn(async () => ({
    data: [options?.result ?? {
      success: true,
      error_code: null,
      closed_at: "2026-07-10T06:30:00.000Z",
    }],
    error: null,
  }))

  const listAvatars = vi.fn(async () => ({
    data: (options?.avatarNames ?? []).map((name) => ({ name })),
    error: null,
  }))
  const removeAvatars = vi.fn(async () => ({ error: null }))
  const avatarBucket = {
    list: listAvatars,
    remove: removeAvatars,
  }
  const storageFrom = vi.fn(() => avatarBucket)

  return {
    listAvatars,
    removeAvatars,
    rpc,
    supabase: { rpc, storage: { from: storageFrom } },
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
    mocks.globalSignOut.mockResolvedValue({ error: null })
    mocks.createClient.mockResolvedValue({
      auth: { signOut: mocks.globalSignOut },
    })
  })

  it("closes the patient through the atomic database boundary and revokes all refresh sessions", async () => {
    const { listAvatars, removeAvatars, rpc, supabase } = createClosureSupabaseMock({
      avatarNames: ["avatar-old.webp"],
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { deleteAccount } = await import("@/app/actions/account")

    const result = await deleteAccount()

    expect(result).toEqual({ success: true, error: null })
    expect(mocks.checkServerActionRateLimit).toHaveBeenCalledWith("profile-id", "sensitive")
    expect(rpc).toHaveBeenCalledWith("close_patient_account", {
      p_profile_id: "profile-id",
      p_auth_user_id: "auth-user-id",
      p_reason: "self_service",
    })
    expect(mocks.logAuditEvent).toHaveBeenCalledWith({
      action: "account_closed",
      actorId: "profile-id",
      actorType: "patient",
      metadata: expect.objectContaining({
        account_closed_at: "2026-07-10T06:30:00.000Z",
        closure_type: "self_service",
        retained_records: true,
      }),
    })
    expect(mocks.globalSignOut).toHaveBeenCalledWith({ scope: "global" })
    expect(listAvatars).toHaveBeenCalledWith("auth-user-id", { limit: 1000 })
    expect(removeAvatars).toHaveBeenCalledWith(["auth-user-id/avatar-old.webp"])
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/")
  })

  it("keeps a durable auth tombstone and signs the browser out after closure", () => {
    const postSignInSource = readFileSync(
      join(process.cwd(), "app/auth/post-signin/page.tsx"),
      "utf8",
    )
    const settingsSource = readFileSync(
      join(process.cwd(), "app/patient/settings/settings-client.tsx"),
      "utf8",
    )

    expect(postSignInSource).toContain("hasClosedAuthAccountTombstone")
    expect(postSignInSource).toContain('redirect("/auth/account-closed")')
    expect(settingsSource).toContain("supabase.auth.signOut")
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
    const { supabase } = createClosureSupabaseMock({
      result: { success: false, error_code: "active_intake", closed_at: null },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { deleteAccount } = await import("@/app/actions/account")

    const result = await deleteAccount()

    expect(result).toEqual({
      success: false,
      error: "You have an active request. Contact support before closing your account.",
    })
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
    expect(mocks.globalSignOut).not.toHaveBeenCalled()
  })
})
