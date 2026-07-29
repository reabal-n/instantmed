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
      { data: [] },
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
      degraded: false,
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
      ["limit", 50],
    ]))
  })

  it("excludes protocol issuance until the signed-in clinician has a durable governance receipt", async () => {
    const harness = createHarness([
      { data: [] },
      { data: [] },
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    await expect(getRecentlyCompletedIntakes({ limit: 8, reviewerId: "doctor-1" })).resolves.toEqual({
      data: [],
      degraded: false,
    })

    expect(harness.queries[0]).toEqual(expect.arrayContaining([
      ["or", "ai_approved.is.false,ai_approved.is.null"],
    ]))
    expect(harness.queries[1]).toEqual(expect.arrayContaining([
      ["eq", "ai_approved", true],
      ["eq", "category", "medical_certificate"],
      ["eq", "batch_reviewed_by", "doctor-1"],
      ["gte", "batch_reviewed_at", expect.any(String)],
      ["order", "batch_reviewed_at", { ascending: false }],
      ["limit", 8],
    ]))
  })

  it("uses the governance receipt timestamp for the signed-in reviewer", async () => {
    const governance = row("governance", {
      reviewed_at: "2026-07-28T22:00:00.000Z",
      batch_reviewed_at: "2026-07-29T01:45:00.000Z",
      ai_approved: true,
    })
    const harness = createHarness([
      { data: [] },
      { data: [governance] },
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    const result = await getRecentlyCompletedIntakes({ limit: 8, reviewerId: "doctor-1" })

    expect(result).toEqual({
      data: [{
        id: "governance",
        patient_id: "patient-governance",
        status: "approved",
        activity_at: "2026-07-29T01:45:00.000Z",
        activity_provenance: "governance_review",
        patient: { full_name: "Patient governance" },
        service: { name: "Medical certificate", short_name: "Med cert", type: "med_certs" },
      }],
      degraded: false,
    })
  })

  it("applies the AEST day boundary to both decision streams", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T15:00:00.000Z"))
    const harness = createHarness([
      { data: [] },
      { data: [] },
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    await getRecentlyCompletedIntakes({ limit: 8, reviewerId: "doctor-1" })

    expect(harness.queries[0]).toContainEqual(["gte", "reviewed_at", "2026-07-29T14:00:00.000Z"])
    expect(harness.queries[1]).toContainEqual(["gte", "batch_reviewed_at", "2026-07-29T14:00:00.000Z"])
  })

  it("interleaves both streams before applying the cap with a stable id tie-break", async () => {
    const harness = createHarness([
      {
        data: [
          row("manual-z", { reviewed_at: "2026-07-29T02:00:00.000Z" }),
          row("manual-a", { reviewed_at: "2026-07-29T01:00:00.000Z" }),
        ],
      },
      {
        data: [
          row("governance-b", { batch_reviewed_at: "2026-07-29T02:00:00.000Z" }),
          row("governance-newest", { batch_reviewed_at: "2026-07-29T03:00:00.000Z" }),
        ],
      },
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getRecentlyCompletedIntakes } = await import("@/lib/data/intakes/queries")
    const result = await getRecentlyCompletedIntakes({ limit: 3, reviewerId: "doctor-1" })

    expect(result.data.map((intake) => intake.id)).toEqual([
      "governance-newest",
      "governance-b",
      "manual-z",
    ])
  })

  it.each([
    {
      name: "ordinary decision query",
      responses: [
        { data: [], error: { message: "ordinary failed" } },
        { data: [row("governance", { batch_reviewed_at: "2026-07-29T03:00:00.000Z" })] },
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
      degraded: true,
    })
  })
})
