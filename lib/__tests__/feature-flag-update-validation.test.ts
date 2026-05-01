import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}))

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
  unstable_cache: (fn: unknown) => fn,
}))

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: vi.fn(),
}))

import { updateFeatureFlag } from "@/lib/feature-flags"

describe("feature flag update validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects unknown flag keys before touching the database", async () => {
    const result = await updateFeatureFlag("unknown_flag" as never, true, "admin-id")

    expect(result).toEqual({ success: false, error: "Unknown feature flag" })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it("rejects invalid operational limit values before touching the database", async () => {
    const result = await updateFeatureFlag("capacity_limit_max", 0, "admin-id")

    expect(result).toEqual({ success: false, error: "Invalid feature flag value" })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
