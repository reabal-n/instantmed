import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function createDirectoryQueryHarness() {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: vi.fn((...args: unknown[]) => {
      calls.push(["select", ...args])
      return query
    }),
    eq: vi.fn((...args: unknown[]) => {
      calls.push(["eq", ...args])
      return query
    }),
    is: vi.fn((...args: unknown[]) => {
      calls.push(["is", ...args])
      return query
    }),
    in: vi.fn((...args: unknown[]) => {
      calls.push(["in", ...args])
      return query
    }),
    or: vi.fn((...args: unknown[]) => {
      calls.push(["or", ...args])
      return query
    }),
    order: vi.fn((...args: unknown[]) => {
      calls.push(["order", ...args])
      return query
    }),
    range: vi.fn(async (...args: unknown[]) => {
      calls.push(["range", ...args])
      return { data: [], error: null, count: 0 }
    }),
  }
  const supabase = { from: vi.fn(() => query) }
  return { calls, supabase }
}

describe("patient directory database ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ["newest", [
      ["order", "created_at", { ascending: false }],
      ["order", "id", { ascending: false }],
    ]],
    ["name", [
      ["order", "full_name", { ascending: true }],
      ["order", "id", { ascending: true }],
    ]],
  ] as const)("applies %s ordering before database pagination", async (sort, expectedOrders) => {
    const harness = createDirectoryQueryHarness()
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const { getPatientDirectoryPage } = await import("@/lib/data/patient-directory")

    await getPatientDirectoryPage({ page: 1, pageSize: 50, sort })

    expect(harness.calls.filter(([method]) => method === "order")).toEqual(expectedOrders)
    const rangeIndex = harness.calls.findIndex(([method]) => method === "range")
    expect(rangeIndex).toBeGreaterThan(-1)
    expect(harness.calls.slice(0, rangeIndex).filter(([method]) => method === "order")).toHaveLength(2)
  })
})
