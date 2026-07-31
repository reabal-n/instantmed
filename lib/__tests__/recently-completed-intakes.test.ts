import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

type QueryResponse = {
  data: Array<Record<string, unknown>>
  error?: { message: string } | null
  count?: number | null
}

function createHarness(responses: QueryResponse[]) {
  const queries: Array<Array<[string, ...unknown[]]>> = []
  const supabase = {
    from: vi.fn(() => {
      const calls: Array<[string, ...unknown[]]> = []
      const response = responses[queries.length] ?? { data: [], error: null }
      queries.push(calls)

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
        eq: vi.fn((...args: unknown[]) => {
          calls.push(["eq", ...args])
          return chain
        }),
        or: vi.fn((...args: unknown[]) => {
          calls.push(["or", ...args])
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
          data: response.data,
          error: response.error ?? null,
          count: response.count ?? null,
        }),
      }

      return chain
    }),
  }

  return { queries, supabase }
}

function createFilteringHarness(sourceRows: Array<Record<string, unknown>>) {
  const queries: Array<Array<[string, ...unknown[]]>> = []
  const supabase = {
    from: vi.fn(() => {
      const calls: Array<[string, ...unknown[]]> = []
      let data = [...sourceRows]
      let exactCount: number | null = null
      queries.push(calls)

      const chain = {
        select: vi.fn((...args: unknown[]) => {
          calls.push(["select", ...args])
          return chain
        }),
        in: vi.fn((column: string, values: unknown[]) => {
          calls.push(["in", column, values])
          data = data.filter((candidate) => values.includes(candidate[column]))
          return chain
        }),
        gte: vi.fn((column: string, value: string) => {
          calls.push(["gte", column, value])
          data = data.filter((candidate) => (
            typeof candidate[column] === "string" && candidate[column] >= value
          ))
          return chain
        }),
        eq: vi.fn((column: string, value: unknown) => {
          calls.push(["eq", column, value])
          data = data.filter((candidate) => candidate[column] === value)
          return chain
        }),
        or: vi.fn((expression: string) => {
          calls.push(["or", expression])
          if (expression === "ai_approved.is.false,ai_approved.is.null") {
            data = data.filter((candidate) => (
              candidate.ai_approved === false || candidate.ai_approved == null
            ))
          }
          return chain
        }),
        order: vi.fn((column: string, options: { ascending: boolean }) => {
          calls.push(["order", column, options])
          data.sort((left, right) => {
            const leftValue = String(left[column] ?? "")
            const rightValue = String(right[column] ?? "")
            return options.ascending
              ? leftValue.localeCompare(rightValue)
              : rightValue.localeCompare(leftValue)
          })
          return chain
        }),
        limit: vi.fn((value: number) => {
          calls.push(["limit", value])
          if (calls.some(([method, , options]) => (
            method === "select" &&
            typeof options === "object" &&
            options !== null &&
            "count" in options &&
            (options as { count?: string }).count === "exact"
          ))) {
            exactCount = data.length
          }
          data = data.slice(0, value)
          return chain
        }),
        then: (resolve: (value: unknown) => unknown) => resolve({
          data,
          error: null,
          count: exactCount,
        }),
      }

      return chain
    }),
  }

  return { queries, supabase }
}

function normalizeProjection(value: unknown): string {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .trim()
}

function row(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    patient_id: `patient-${id}`,
    status: "approved",
    reviewed_at: "2026-07-29T01:00:00.000Z",
    batch_reviewed_at: null,
    patient: { full_name: `Patient ${id}` },
    service: { name: "Medical certificate", short_name: "Med cert", type: "med_certs" },
    ...overrides,
  }
}

describe("getRecentlyCompletedIntakes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it("returns ordinary manual decisions with explicit activity provenance", async () => {
    const manual = row("manual", {
      reviewed_at: "2026-07-29T01:15:00.000Z",
      ai_approved: null,
    })
    const harness = createHarness([
      { data: [manual] },
      { data: [], count: 0 },
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")

    await expect(getRecentlyCompletedIntakes({ limit: 50, reviewerId: "doctor-1" })).resolves.toEqual({
      data: [{
        id: "manual",
        patient_id: "patient-manual",
        status: "approved",
        activity_at: "2026-07-29T01:15:00.000Z",
        activity_provenance: "clinician_decision",
        patient: { full_name: "Patient manual" },
        service: { name: "Medical certificate", short_name: "Med cert", type: "med_certs" },
      }],
      governanceReceipt: null,
      degraded: false,
      truncated: false,
    })

    const ordinary = harness.queries[0]!
    expect(normalizeProjection(ordinary.find(([method]) => method === "select")?.[1])).toBe(
      "id,patient_id,status,reviewed_at,patient:profiles!patient_id(full_name),service:services!service_id(name,type,short_name)",
    )
    expect(ordinary).toEqual(expect.arrayContaining([
      ["in", "status", ["approved", "declined", "completed"]],
      ["gte", "reviewed_at", expect.any(String)],
      ["eq", "reviewed_by", "doctor-1"],
      ["or", "ai_approved.is.false,ai_approved.is.null"],
      ["order", "reviewed_at", { ascending: false }],
      ["limit", 51],
    ]))
  })

  it("applies actor, time, and protocol-governance predicates to returned history", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T02:00:00.000Z"))
    const harness = createFilteringHarness([
      row("manual-null", {
        ai_approved: null,
        reviewed_by: "doctor-1",
        reviewed_at: "2026-07-29T01:00:00.000Z",
      }),
      row("manual-false", {
        ai_approved: false,
        reviewed_by: "doctor-1",
        reviewed_at: "2026-07-29T01:05:00.000Z",
      }),
      row("auto-without-receipt", {
        ai_approved: true,
        category: "medical_certificate",
        reviewed_by: "doctor-1",
        reviewed_at: "2026-07-29T01:10:00.000Z",
        batch_reviewed_by: null,
        batch_reviewed_at: null,
      }),
      row("governance-receipt", {
        ai_approved: true,
        category: "medical_certificate",
        reviewed_by: "system",
        reviewed_at: "2026-07-29T00:30:00.000Z",
        batch_reviewed_by: "doctor-1",
        batch_reviewed_at: "2026-07-29T01:15:00.000Z",
      }),
      row("other-actor", {
        ai_approved: false,
        reviewed_by: "doctor-2",
        reviewed_at: "2026-07-29T01:20:00.000Z",
      }),
      row("old-manual", {
        ai_approved: false,
        reviewed_by: "doctor-1",
        reviewed_at: "2026-07-28T13:59:59.000Z",
      }),
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    const result = await getRecentlyCompletedIntakes({ limit: 8, reviewerId: "doctor-1" })

    expect(result.data.map((review) => review.id)).toEqual(["manual-false", "manual-null"])
    expect(result.governanceReceipt).toEqual({
      certificateCount: 1,
      latestActivityAt: "2026-07-29T01:15:00.000Z",
    })
    expect(result.degraded).toBe(false)
    expect(result.truncated).toBe(false)
  })

  it("uses the governance receipt timestamp for the signed-in reviewer", async () => {
    const governance = {
      batch_reviewed_at: "2026-07-29T01:45:00.000Z",
      patient: { full_name: "Must not be selected" },
    }
    const harness = createHarness([
      { data: [] },
      { data: [governance], count: 6 },
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    const result = await getRecentlyCompletedIntakes({ limit: 8, reviewerId: "doctor-1" })

    expect(result).toEqual({
      data: [],
      governanceReceipt: {
        certificateCount: 6,
        latestActivityAt: "2026-07-29T01:45:00.000Z",
      },
      degraded: false,
      truncated: false,
    })

    const governanceQuery = harness.queries[1]!
    const governanceSelect = governanceQuery.find(([method]) => method === "select")
    expect(normalizeProjection(governanceSelect?.[1])).toBe("batch_reviewed_at")
    expect(governanceSelect?.[2]).toEqual({ count: "exact" })
    expect(governanceQuery).toContainEqual(["limit", 1])
    expect(JSON.stringify(governanceQuery)).not.toContain("patient")
  })

  it.each([
    {
      season: "winter AEST",
      now: "2026-07-29T15:00:00.000Z",
      expectedStart: "2026-07-29T14:00:00.000Z",
    },
    {
      season: "summer AEDT",
      now: "2026-01-15T15:00:00.000Z",
      expectedStart: "2026-01-15T13:00:00.000Z",
    },
  ])("applies the Australia/Sydney day boundary in $season", async ({ now, expectedStart }) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(now))
    const harness = createHarness([
      { data: [] },
      { data: [], count: 0 },
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    await getRecentlyCompletedIntakes({ limit: 8, reviewerId: "doctor-1" })

    expect(harness.queries[0]).toContainEqual(["gte", "reviewed_at", expectedStart])
    expect(harness.queries[1]).toContainEqual(["gte", "batch_reviewed_at", expectedStart])
  })

  it("caps clinician decisions independently while preserving the exact governance count", async () => {
    const harness = createHarness([
      {
        data: [
          row("manual-newest", { reviewed_at: "2026-07-29T03:00:00.000Z" }),
          row("manual-z", { reviewed_at: "2026-07-29T02:00:00.000Z" }),
          row("manual-a", { reviewed_at: "2026-07-29T01:00:00.000Z" }),
          row("manual-oldest", { reviewed_at: "2026-07-29T00:30:00.000Z" }),
        ],
      },
      {
        data: [{ batch_reviewed_at: "2026-07-29T03:00:00.000Z" }],
        count: 7,
      },
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    const result = await getRecentlyCompletedIntakes({ limit: 3, reviewerId: "doctor-1" })

    expect(result.data.map((intake) => intake.id)).toEqual([
      "manual-newest",
      "manual-z",
      "manual-a",
    ])
    expect(result.governanceReceipt).toEqual({
      certificateCount: 7,
      latestActivityAt: "2026-07-29T03:00:00.000Z",
    })
    expect(result.truncated).toBe(true)
    expect(harness.queries[0]).toContainEqual(["limit", 4])
    expect(harness.queries[1]).toContainEqual(["limit", 1])
  })

  it.each([
    {
      name: "ordinary decision query",
      responses: [
        { data: [], error: { message: "ordinary failed" } },
        { data: [{ batch_reviewed_at: "2026-07-29T03:00:00.000Z" }], count: 1 },
      ],
    },
    {
      name: "governance query",
      responses: [
        { data: [row("manual")] },
        { data: [], error: { message: "governance failed" } },
      ],
    },
  ])("returns no partial history when the $name fails", async ({ responses }) => {
    const harness = createHarness(responses)
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    await expect(getRecentlyCompletedIntakes({ limit: 8, reviewerId: "doctor-1" })).resolves.toEqual({
      data: [],
      governanceReceipt: null,
      degraded: true,
      truncated: false,
    })
  })
})
