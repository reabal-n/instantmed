import { beforeEach, describe, expect, it, vi } from "vitest"

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
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("recovers embedded prescribing within the same request after a dropped connection", async () => {
    const select = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: "TypeError: fetch failed", code: "" } })
      .mockResolvedValueOnce({
        data: [{ key: "parchment_embedded_prescribing", value: true }],
        error: null,
      })
    mocks.createClient.mockReturnValue({ from: vi.fn(() => ({ select })) })

    const { getFeatureFlags } = await import("@/lib/feature-flags")

    expect((await getFeatureFlags()).parchment_embedded_prescribing).toBe(true)
    expect(select).toHaveBeenCalledTimes(2)
    expect((await getFeatureFlags()).parchment_embedded_prescribing).toBe(true)
    expect(select).toHaveBeenCalledTimes(2)
  })

  it("does not cache fallback defaults after a transient database read failure", async () => {
    const select = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: "TypeError: fetch failed" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "TypeError: fetch failed" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "TypeError: strict read failed" },
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

    const { getFeatureFlags, isMaintenanceModeStrict } = await import("@/lib/feature-flags")

    const fallback = await getFeatureFlags()
    await expect(isMaintenanceModeStrict()).rejects.toThrow("TypeError: strict read failed")
    const recovered = await getFeatureFlags()
    const strictRecovered = await isMaintenanceModeStrict()

    expect(fallback.ai_auto_approve_enabled).toBe(false)
    expect(recovered.ai_auto_approve_enabled).toBe(true)
    expect(strictRecovered.enabled).toBe(false)
    expect(select).toHaveBeenCalledTimes(4)
  })

  it.each([
    { message: "permission denied", code: "42501" },
    { message: "relation does not exist", code: "42P01" },
    { message: "AbortError: This operation was aborted", code: "" },
    { message: "TypeError: fetch failed", code: "PGRST301" },
  ])("does not retry configuration, authorization, or cancelled reads: $code $message", async (error) => {
    const select = vi.fn().mockResolvedValue({ data: null, error })
    mocks.createClient.mockReturnValue({ from: vi.fn(() => ({ select })) })
    const { isMaintenanceModeStrict } = await import("@/lib/feature-flags")

    await expect(isMaintenanceModeStrict()).rejects.toThrow(error.message)
    expect(select).toHaveBeenCalledTimes(1)
  })

  it("keeps strict mutation gates closed when both transport reads fail", async () => {
    const select = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "TypeError: fetch failed", code: "" },
    })
    mocks.createClient.mockReturnValue({ from: vi.fn(() => ({ select })) })
    const { isMaintenanceModeStrict } = await import("@/lib/feature-flags")

    await expect(isMaintenanceModeStrict()).rejects.toThrow("TypeError: fetch failed")
    expect(select).toHaveBeenCalledTimes(2)
  })

  it("does not replace cached values with a failed explicit refresh", async () => {
    const select = vi.fn()
      .mockResolvedValueOnce({ data: [{ key: "disable_repeat_scripts", value: true }], error: null })
      .mockResolvedValue({ data: null, error: { message: "TypeError: fetch failed", code: "" } })
    mocks.createClient.mockReturnValue({ from: vi.fn(() => ({ select })) })
    const { getFeatureFlags, refreshFeatureFlags } = await import("@/lib/feature-flags")

    expect((await getFeatureFlags()).disable_repeat_scripts).toBe(true)
    await refreshFeatureFlags()
    expect((await getFeatureFlags()).disable_repeat_scripts).toBe(true)
    expect(select).toHaveBeenCalledTimes(3)
  })
})
