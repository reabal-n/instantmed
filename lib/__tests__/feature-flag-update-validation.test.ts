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

import {
  DEFAULT_AUTO_APPROVE_DELAY_MINUTES,
  DEFAULT_FLAGS,
  MIN_AUTO_APPROVE_DELAY_MINUTES,
  normalizeAutoApproveDelayMinutes,
  resolveMaintenanceMode,
  updateFeatureFlag,
} from "@/lib/feature-flags"

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

  it("rejects immediate and sub-floor auto-approval delays before touching the database", async () => {
    const immediate = await updateFeatureFlag("auto_approve_delay_minutes", 0, "admin-id")
    const underFloor = await updateFeatureFlag("auto_approve_delay_minutes", MIN_AUTO_APPROVE_DELAY_MINUTES - 1, "admin-id")

    expect(immediate).toEqual({ success: false, error: "Invalid feature flag value" })
    expect(underFloor).toEqual({ success: false, error: "Invalid feature flag value" })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it("normalizes persisted auto-approval delays to the production floor and default", () => {
    expect(DEFAULT_FLAGS.auto_approve_delay_minutes).toBe(DEFAULT_AUTO_APPROVE_DELAY_MINUTES)
    expect(normalizeAutoApproveDelayMinutes(0)).toBe(MIN_AUTO_APPROVE_DELAY_MINUTES)
    expect(normalizeAutoApproveDelayMinutes(null)).toBe(DEFAULT_AUTO_APPROVE_DELAY_MINUTES)
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
