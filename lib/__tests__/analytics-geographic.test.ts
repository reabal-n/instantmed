import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: mocks.loggerError,
    debug: vi.fn(),
  }),
}))

type ProfileRel = { state?: string | null } | { state?: string | null }[] | null
interface IntakeRow {
  patient_id: string | null
  profiles: ProfileRel
}

interface QueryResult {
  data: IntakeRow[] | null
  error: { message: string } | null
}

function createSupabaseMock(result: QueryResult) {
  // Thenable terminal that mimics the awaited Supabase query builder
  // result. The data layer chains .not(...) at the end via
  // filterSeededE2EIntakes so the terminal node must be awaitable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const terminal: any = {}
  terminal.not = vi.fn(() => terminal)
  terminal.then = Promise.resolve(result).then.bind(Promise.resolve(result))

  const notPatient = vi.fn(() => terminal)
  const notPaid = vi.fn(() => ({ not: notPatient }))
  const gte = vi.fn(() => ({ not: notPaid }))
  const select = vi.fn(() => ({ gte }))
  const from = vi.fn(() => ({ select }))

  return { from, select, gte, notPaid, notPatient, terminal }
}

describe("getGeographicBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an empty breakdown when there are no paid intakes", async () => {
    const supabase = createSupabaseMock({ data: [], error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    const result = await getGeographicBreakdown()

    expect(result.totalPatients).toBe(0)
    expect(result.topStates).toEqual([])
    expect(result.unknownCount).toBe(0)
    expect(result.windowDays).toBe(30)
  })

  it("returns an empty breakdown and logs on Supabase error", async () => {
    const supabase = createSupabaseMock({ data: null, error: { message: "boom" } })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    const result = await getGeographicBreakdown()

    expect(result.totalPatients).toBe(0)
    expect(result.topStates).toEqual([])
    expect(mocks.loggerError).toHaveBeenCalled()
  })

  it("deduplicates by patient_id so a patient with 3 requests counts once", async () => {
    const rows: IntakeRow[] = [
      { patient_id: "p1", profiles: { state: "NSW" } },
      { patient_id: "p1", profiles: { state: "NSW" } },
      { patient_id: "p1", profiles: { state: "NSW" } },
      { patient_id: "p2", profiles: { state: "VIC" } },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    const result = await getGeographicBreakdown()

    expect(result.totalPatients).toBe(2)
    expect(result.topStates).toEqual([
      expect.objectContaining({ state: "NSW", count: 1 }),
      expect.objectContaining({ state: "VIC", count: 1 }),
    ])
    expect(result.unknownCount).toBe(0)
  })

  it("counts patients with no state or invalid state as unknown", async () => {
    const rows: IntakeRow[] = [
      { patient_id: "p1", profiles: { state: "NSW" } },
      { patient_id: "p2", profiles: { state: null } },
      { patient_id: "p3", profiles: null },
      { patient_id: "p4", profiles: { state: "ZZ" } },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    const result = await getGeographicBreakdown()

    expect(result.totalPatients).toBe(4)
    expect(result.topStates).toEqual([
      expect.objectContaining({ state: "NSW", count: 1 }),
    ])
    expect(result.unknownCount).toBe(3)
  })

  it("sorts states descending by count", async () => {
    const rows: IntakeRow[] = [
      { patient_id: "p1", profiles: { state: "NSW" } },
      { patient_id: "p2", profiles: { state: "VIC" } },
      { patient_id: "p3", profiles: { state: "VIC" } },
      { patient_id: "p4", profiles: { state: "QLD" } },
      { patient_id: "p5", profiles: { state: "QLD" } },
      { patient_id: "p6", profiles: { state: "QLD" } },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    const result = await getGeographicBreakdown()

    expect(result.topStates.map((s) => s.state)).toEqual(["QLD", "VIC", "NSW"])
    for (let i = 1; i < result.topStates.length; i++) {
      expect(result.topStates[i - 1]!.count).toBeGreaterThanOrEqual(
        result.topStates[i]!.count,
      )
    }
  })

  it("caps topStates at TOP_N = 5", async () => {
    const rows: IntakeRow[] = [
      { patient_id: "p1", profiles: { state: "NSW" } },
      { patient_id: "p2", profiles: { state: "VIC" } },
      { patient_id: "p3", profiles: { state: "QLD" } },
      { patient_id: "p4", profiles: { state: "WA" } },
      { patient_id: "p5", profiles: { state: "SA" } },
      { patient_id: "p6", profiles: { state: "TAS" } },
      { patient_id: "p7", profiles: { state: "ACT" } },
      { patient_id: "p8", profiles: { state: "NT" } },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    const result = await getGeographicBreakdown()

    expect(result.totalPatients).toBe(8)
    expect(result.topStates.length).toBe(5)
  })

  it("handles a join that returns the profile as a single-element array", async () => {
    const rows: IntakeRow[] = [
      { patient_id: "p1", profiles: [{ state: "NSW" }] },
      { patient_id: "p2", profiles: [{ state: "VIC" }] },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    const result = await getGeographicBreakdown()

    expect(result.totalPatients).toBe(2)
    expect(result.topStates).toEqual([
      expect.objectContaining({ state: "NSW", count: 1 }),
      expect.objectContaining({ state: "VIC", count: 1 }),
    ])
  })

  it("normalizes state casing to uppercase", async () => {
    const rows: IntakeRow[] = [
      { patient_id: "p1", profiles: { state: "nsw" } },
      { patient_id: "p2", profiles: { state: "NSW" } },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    const result = await getGeographicBreakdown()

    expect(result.totalPatients).toBe(2)
    expect(result.topStates).toEqual([
      expect.objectContaining({ state: "NSW", count: 2 }),
    ])
    expect(result.unknownCount).toBe(0)
  })

  it("queries the intakes table with the right filters", async () => {
    const supabase = createSupabaseMock({ data: [], error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getGeographicBreakdown } = await import("@/lib/data/analytics-geographic")
    await getGeographicBreakdown()

    expect(supabase.from).toHaveBeenCalledWith("intakes")
    expect(supabase.select).toHaveBeenCalled()
    expect(supabase.gte).toHaveBeenCalledWith("paid_at", expect.any(String))
    expect(supabase.notPaid).toHaveBeenCalledWith("paid_at", "is", null)
    expect(supabase.notPatient).toHaveBeenCalledWith("patient_id", "is", null)
  })
})
