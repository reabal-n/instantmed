import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  cookies: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function createSupabaseWithProfile(profile: Record<string, unknown> | null) {
  return {
    from: vi.fn((table: string) => {
      if (table !== "profiles") throw new Error(`Unexpected table ${table}`)
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: profile, error: null })),
          })),
        })),
      }
    }),
  }
}

describe("account closure auth boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PLAYWRIGHT", "0")
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => undefined) })
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: "auth-user-id", email: "patient@example.test" } },
        })),
      },
    })
  })

  it("treats closed profiles as unauthenticated for API auth", async () => {
    mocks.createServiceRoleClient.mockReturnValue(createSupabaseWithProfile({
      id: "profile-id",
      auth_user_id: "auth-user-id",
      role: "patient",
      email: "patient@example.test",
      full_name: "Closed Account",
      account_closed_at: "2026-05-02T00:00:00.000Z",
    }))
    const { getApiAuth } = await import("@/lib/auth/helpers")

    await expect(getApiAuth()).resolves.toBeNull()
  })
})
