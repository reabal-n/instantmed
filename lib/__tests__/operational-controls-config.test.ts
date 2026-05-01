import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  getFeatureFlags: vi.fn(),
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlags: mocks.getFeatureFlags,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { isAtCapacity } from "@/lib/operational-controls/config"

describe("operational control capacity checks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getFeatureFlags.mockResolvedValue({
      business_hours_enabled: true,
      business_hours_open: 8,
      business_hours_close: 22,
      business_hours_timezone: "Australia/Sydney",
      capacity_limit_enabled: true,
      capacity_limit_max: 10,
      urgent_notice_enabled: false,
      urgent_notice_message: "",
      maintenance_scheduled_start: null,
      maintenance_scheduled_end: null,
    })
  })

  it("fails closed when capacity is enabled but the daily count cannot be read", async () => {
    mocks.createServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "missing function" },
      }),
    })

    await expect(isAtCapacity()).resolves.toBe(true)
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Daily intake capacity count failed",
      {},
      expect.any(Error),
    )
  })

  it("does not call the capacity counter when the limit is disabled", async () => {
    mocks.getFeatureFlags.mockResolvedValue({
      business_hours_enabled: true,
      business_hours_open: 8,
      business_hours_close: 22,
      business_hours_timezone: "Australia/Sydney",
      capacity_limit_enabled: false,
      capacity_limit_max: 10,
      urgent_notice_enabled: false,
      urgent_notice_message: "",
      maintenance_scheduled_start: null,
      maintenance_scheduled_end: null,
    })

    await expect(isAtCapacity()).resolves.toBe(false)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })
})
