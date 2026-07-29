import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function createLedgerSearchHarness(
  profileCount: number,
  profileError: { message: string } | null = null,
) {
  const tables: string[] = []
  const intakeCalls: Array<Array<[string, ...unknown[]]>> = []
  const profiles = Array.from({ length: profileCount }, (_, index) => ({
    id: `patient-${index}`,
  }))

  const supabase = {
    from: vi.fn((table: string) => {
      tables.push(table)
      if (table === "profiles") {
        const profileQuery = {
          select: vi.fn(() => profileQuery),
          eq: vi.fn(() => profileQuery),
          or: vi.fn(() => profileQuery),
          limit: vi.fn(async () => ({ data: profiles, error: profileError })),
        }
        return profileQuery
      }

      const calls: Array<[string, ...unknown[]]> = []
      intakeCalls.push(calls)
      const response = intakeCalls.length === 1
        ? { count: 0, error: null }
        : { data: [], error: null }
      const query = {
        select: vi.fn((...args: unknown[]) => {
          calls.push(["select", ...args])
          return query
        }),
        gte: vi.fn((...args: unknown[]) => {
          calls.push(["gte", ...args])
          return query
        }),
        lte: vi.fn((...args: unknown[]) => {
          calls.push(["lte", ...args])
          return query
        }),
        eq: vi.fn((...args: unknown[]) => {
          calls.push(["eq", ...args])
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
        not: vi.fn((...args: unknown[]) => {
          calls.push(["not", ...args])
          return query
        }),
        order: vi.fn((...args: unknown[]) => {
          calls.push(["order", ...args])
          return query
        }),
        range: vi.fn(async (...args: unknown[]) => {
          calls.push(["range", ...args])
          return response
        }),
        then: (resolve: (value: unknown) => unknown) => resolve(response),
      }
      return query
    }),
  }

  return { intakeCalls, supabase, tables }
}

describe("admin ledger patient-search saturation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fails closed at the 250-profile cap before querying intakes", async () => {
    const harness = createLedgerSearchHarness(250)
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const { getAllIntakesForAdmin } = await import("@/lib/data/intakes/queries")

    const result = await getAllIntakesForAdmin({
      viewerRole: "admin",
      q: "Smith",
      page: 4,
      pageSize: 50,
    })

    expect(harness.tables).toEqual(["profiles"])
    expect(result).toMatchObject({
      data: [],
      total: null,
      page: 4,
      pageSize: 50,
      patientSearchSaturated: true,
    })
  })

  it("lets saturation win when the capped profile response also reports an error", async () => {
    const harness = createLedgerSearchHarness(250, { message: "profile search timed out" })
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const { getAllIntakesForAdmin } = await import("@/lib/data/intakes/queries")

    const result = await getAllIntakesForAdmin({
      viewerRole: "admin",
      q: "Smith",
      page: 1,
      pageSize: 50,
    })

    expect(harness.tables).toEqual(["profiles"])
    expect(result).toMatchObject({
      data: [],
      total: null,
      degraded: false,
      patientSearchUnavailable: false,
      patientSearchSaturated: true,
    })
  })

  it("preserves the under-cap profile-error fallback to request reference search", async () => {
    const harness = createLedgerSearchHarness(249, { message: "profile search timed out" })
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const { getAllIntakesForAdmin } = await import("@/lib/data/intakes/queries")

    const result = await getAllIntakesForAdmin({
      viewerRole: "admin",
      q: "IM-20260729",
      page: 1,
      pageSize: 50,
    })

    expect(harness.tables).toEqual(["profiles", "intakes", "intakes"])
    expect(result).toMatchObject({
      data: [],
      total: 0,
      degraded: true,
      patientSearchUnavailable: true,
      patientSearchSaturated: false,
    })
  })

  it("searches all intake history when 249 profile candidates remain unambiguous", async () => {
    const harness = createLedgerSearchHarness(249)
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const { getAllIntakesForAdmin } = await import("@/lib/data/intakes/queries")

    const result = await getAllIntakesForAdmin({
      viewerRole: "admin",
      q: "Smith",
      page: 1,
      pageSize: 50,
    })

    expect(harness.tables).toEqual(["profiles", "intakes", "intakes"])
    expect(harness.intakeCalls.flat().some(([method]) => method === "gte")).toBe(false)
    expect(result).toMatchObject({
      data: [],
      total: 0,
      patientSearchSaturated: false,
    })
  })
})
