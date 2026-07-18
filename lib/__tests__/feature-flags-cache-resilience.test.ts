import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}))

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (
    fn: (...args: unknown[]) => Promise<unknown>,
  ) => {
    let hasCachedValue = false
    let cachedValue: unknown

    return async (...args: unknown[]) => {
      if (hasCachedValue) return cachedValue

      const result = await fn(...args)
      cachedValue = result
      hasCachedValue = true
      return result
    }
  },
}))

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: vi.fn(),
}))

describe("feature flag cache resilience", () => {
  it("does not cache fallback defaults after a transient database read failure", async () => {
    const select = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: "TypeError: fetch failed" },
      })
      .mockResolvedValueOnce({
        data: [
          { key: "ai_auto_approve_enabled", value: true },
          { key: "telegram_notifications_enabled", value: true },
        ],
        error: null,
      })

    mocks.createClient.mockReturnValue({
      from: vi.fn(() => ({ select })),
    })

    const { getFeatureFlags } = await import("@/lib/feature-flags")

    const fallback = await getFeatureFlags()
    const recovered = await getFeatureFlags()

    expect(fallback.ai_auto_approve_enabled).toBe(false)
    expect(recovered.ai_auto_approve_enabled).toBe(true)
    expect(select).toHaveBeenCalledTimes(2)
  })
})
