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

import { DEFAULT_FLAGS, resolveMaintenanceMode, updateFeatureFlag } from "@/lib/feature-flags"

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

  it("rejects retired placeholder flags instead of exposing no-op admin toggles", async () => {
    const result = await updateFeatureFlag("batch_approve_enabled" as never, true, "admin-id")

    expect(result).toEqual({ success: false, error: "Unknown feature flag" })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it("rejects the retired stale-queue doctor alert threshold", async () => {
    const result = await updateFeatureFlag("doctor_alert_threshold_hours" as never, 1, "admin-id")

    expect(result).toEqual({ success: false, error: "Unknown feature flag" })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it("computes scheduled maintenance without needing a background cron to flip the manual flag", () => {
    const now = Date.now()
    const maintenance = resolveMaintenanceMode({
      ...DEFAULT_FLAGS,
      maintenance_mode: false,
      maintenance_scheduled_start: new Date(now - 60_000).toISOString(),
      maintenance_scheduled_end: new Date(now + 60_000).toISOString(),
      maintenance_message: "Back soon",
    })

    expect(maintenance).toEqual({ enabled: true, message: "Back soon" })
  })
})
