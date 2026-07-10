import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  logger: {
    error: vi.fn(),
  },
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function mockTombstoneQuery(result: {
  data: { auth_user_id: string } | null
  error: { code: string; message: string } | null
}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  }
  mocks.createServiceRoleClient.mockReturnValue({
    from: vi.fn(() => query),
  })
}

describe("hasClosedAuthAccountTombstone", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns true for a durable closure tombstone", async () => {
    mockTombstoneQuery({
      data: { auth_user_id: "auth-user-id" },
      error: null,
    })
    const { hasClosedAuthAccountTombstone } = await import("@/lib/auth/account-closure")

    await expect(hasClosedAuthAccountTombstone("auth-user-id")).resolves.toBe(true)
  })

  it("returns false when the auth identity has never been closed", async () => {
    mockTombstoneQuery({ data: null, error: null })
    const { hasClosedAuthAccountTombstone } = await import("@/lib/auth/account-closure")

    await expect(hasClosedAuthAccountTombstone("auth-user-id")).resolves.toBe(false)
  })

  it("fails closed when closure state cannot be read", async () => {
    mockTombstoneQuery({
      data: null,
      error: { code: "PGRST500", message: "unavailable" },
    })
    const { hasClosedAuthAccountTombstone } = await import("@/lib/auth/account-closure")

    await expect(hasClosedAuthAccountTombstone("auth-user-id")).rejects.toThrow(
      "Unable to verify account closure state",
    )
  })
})
