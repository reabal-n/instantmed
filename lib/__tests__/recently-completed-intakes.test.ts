import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function createHarness(data: Array<Record<string, unknown>>) {
  const calls: Array<[string, ...unknown[]]> = []
  const chain = {
    select: vi.fn((...args: unknown[]) => {
      calls.push(["select", ...args])
      return chain
    }),
    in: vi.fn((...args: unknown[]) => {
      calls.push(["in", ...args])
      return chain
    }),
    gte: vi.fn((...args: unknown[]) => {
      calls.push(["gte", ...args])
      return chain
    }),
    order: vi.fn((...args: unknown[]) => {
      calls.push(["order", ...args])
      return chain
    }),
    limit: vi.fn((...args: unknown[]) => {
      calls.push(["limit", ...args])
      return chain
    }),
    then: (resolve: (value: unknown) => unknown) => resolve({
      data,
      error: null,
    }),
  }

  return {
    calls,
    supabase: { from: vi.fn(() => chain) },
  }
}

function normalizeProjection(value: unknown): string {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .trim()
}

describe("getRecentlyCompletedIntakes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the dashboard read model using only fields consumed by the queue", async () => {
    const row = {
      id: "intake-1",
      patient_id: "patient-1",
      status: "approved",
      reviewed_at: "2026-07-14T01:00:00.000Z",
      completed_at: null,
      patient: { full_name: "Test Patient" },
      service: { name: "Medical certificate", short_name: "Med cert", type: "med_certs" },
    }
    const harness = createHarness([row])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")

    await expect(getRecentlyCompletedIntakes({ limit: 50 })).resolves.toEqual([row])

    const selectCall = harness.calls.find(([method]) => method === "select")
    expect(normalizeProjection(selectCall?.[1])).toBe(
      "id,patient_id,status,reviewed_at,completed_at,patient:profiles!patient_id(full_name),service:services!service_id(name,type,short_name)",
    )
    expect(harness.calls).toEqual(expect.arrayContaining([
      ["in", "status", ["approved", "declined", "completed"]],
      ["gte", "reviewed_at", expect.any(String)],
      ["order", "reviewed_at", { ascending: false }],
      ["limit", 50],
    ]))
  })

  it("scopes 'today' to AEST midnight, not UTC or server-local midnight", async () => {
    // 2026-07-21T15:00:00Z = 1am AEST on July 22. A UTC-midnight boundary
    // (the bug fixed here — see startOfDayAEST) would compute
    // 2026-07-21T00:00:00Z: 14 hours too early, silently dropping every
    // intake reviewed in the first 14 hours of the AEST day from this
    // dashboard widget, permanently — the window never revisits that gap.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-21T15:00:00.000Z"))

    const harness = createHarness([])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    await getRecentlyCompletedIntakes({ limit: 8 })

    const gteCall = harness.calls.find(([method]) => method === "gte")
    expect(gteCall?.[2]).toBe("2026-07-21T14:00:00.000Z")

    vi.useRealTimers()
  })
})
