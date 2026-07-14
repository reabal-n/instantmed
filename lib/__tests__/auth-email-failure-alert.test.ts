import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { getAuthEmailFailureCount } from "@/lib/data/auth-email-events"
import { buildAuthEmailFailureAlert } from "@/lib/monitoring/auth-email-failure"

describe("auth email failure monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.gte.mockResolvedValue({ count: 0, error: null })
    mocks.eq.mockReturnValue({ gte: mocks.gte })
    mocks.select.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockReturnValue({ select: mocks.select })
    mocks.createServiceRoleClient.mockReturnValue({ from: mocks.from })
  })

  it("reads only the aggregate failed-event count for the requested window", async () => {
    mocks.gte.mockResolvedValue({ count: 2, error: null })
    const since = new Date("2026-07-14T00:00:00.000Z")

    await expect(getAuthEmailFailureCount(since)).resolves.toBe(2)
    expect(mocks.from).toHaveBeenCalledWith("auth_email_events")
    expect(mocks.select).toHaveBeenCalledWith("id", { count: "exact", head: true })
    expect(mocks.eq).toHaveBeenCalledWith("status", "failed")
    expect(mocks.gte).toHaveBeenCalledWith("created_at", since.toISOString())
  })

  it("throws when the aggregate count is unavailable", async () => {
    mocks.gte.mockResolvedValue({ count: null, error: { message: "relation unavailable" } })

    await expect(getAuthEmailFailureCount(new Date())).rejects.toThrow(
      "Auth email failure count failed: relation unavailable",
    )
  })

  it("builds a critical PHI-free alert for any auth email failure", () => {
    expect(buildAuthEmailFailureAlert(0)).toBeNull()
    expect(buildAuthEmailFailureAlert(1)).toEqual({
      metric: "auth_email_delivery_failed",
      severity: "critical",
      count: 1,
      detail: "1 auth email delivery failure in the last hour; sign-in or password recovery may be blocked",
    })
    expect(buildAuthEmailFailureAlert(3)?.detail).toBe(
      "3 auth email delivery failures in the last hour; sign-in or password recovery may be blocked",
    )
  })
})
