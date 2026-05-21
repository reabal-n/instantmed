import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

type DeclineRow = {
  decline_reason_code?: string | null
  decline_reason?: string | null
}

interface QueryResult {
  data: DeclineRow[] | null
  error: { message: string } | null
}

function createSupabaseMock(result: QueryResult) {
  const gte = vi.fn(async () => result)
  const eq = vi.fn(() => ({ gte }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  return { from, select, eq, gte }
}

describe("getDeclineReasonBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an empty breakdown when no declines exist", async () => {
    const supabase = createSupabaseMock({ data: [], error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getDeclineReasonBreakdown } = await import(
      "@/lib/data/dashboard-decline-trends"
    )
    const result = await getDeclineReasonBreakdown()

    expect(result.totalDeclines).toBe(0)
    expect(result.topReasons).toEqual([])
    expect(result.windowDays).toBe(30)
  })

  it("returns an empty breakdown on Supabase error", async () => {
    const supabase = createSupabaseMock({
      data: null,
      error: { message: "boom" },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getDeclineReasonBreakdown } = await import(
      "@/lib/data/dashboard-decline-trends"
    )
    const result = await getDeclineReasonBreakdown()

    expect(result.totalDeclines).toBe(0)
    expect(result.topReasons).toEqual([])
  })

  it("groups by decline_reason_code and sorts descending", async () => {
    const rows: DeclineRow[] = [
      { decline_reason_code: "requires_examination" },
      { decline_reason_code: "requires_examination" },
      { decline_reason_code: "requires_examination" },
      { decline_reason_code: "controlled_substance" },
      { decline_reason_code: "controlled_substance" },
      { decline_reason_code: "insufficient_info" },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getDeclineReasonBreakdown } = await import(
      "@/lib/data/dashboard-decline-trends"
    )
    const result = await getDeclineReasonBreakdown()

    expect(result.totalDeclines).toBe(6)
    expect(result.topReasons).toEqual([
      { code: "requires_examination", label: "Requires in-person examination", count: 3 },
      { code: "controlled_substance", label: "Controlled substance request", count: 2 },
      { code: "insufficient_info", label: "Insufficient information", count: 1 },
    ])
  })

  it("falls back to decline_reason free text when code is null", async () => {
    const rows: DeclineRow[] = [
      { decline_reason_code: null, decline_reason: "patient_unreachable" },
      { decline_reason_code: null, decline_reason: "patient_unreachable" },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getDeclineReasonBreakdown } = await import(
      "@/lib/data/dashboard-decline-trends"
    )
    const result = await getDeclineReasonBreakdown()

    expect(result.totalDeclines).toBe(2)
    expect(result.topReasons[0]?.code).toBe("patient_unreachable")
    expect(result.topReasons[0]?.label).toBe("Patient Unreachable")
  })

  it("treats both null code and null reason as 'other'", async () => {
    const rows: DeclineRow[] = [
      { decline_reason_code: null, decline_reason: null },
      { decline_reason_code: "", decline_reason: "" },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getDeclineReasonBreakdown } = await import(
      "@/lib/data/dashboard-decline-trends"
    )
    const result = await getDeclineReasonBreakdown()

    expect(result.totalDeclines).toBe(2)
    expect(result.topReasons[0]?.code).toBe("other")
    expect(result.topReasons[0]?.count).toBe(2)
  })

  it("caps the top-N list at 5 entries", async () => {
    const rows: DeclineRow[] = [
      "requires_examination",
      "not_telehealth_suitable",
      "prescribing_guidelines",
      "controlled_substance",
      "insufficient_info",
      "patient_not_eligible",
      "outside_scope",
    ].map((code) => ({ decline_reason_code: code }))
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getDeclineReasonBreakdown } = await import(
      "@/lib/data/dashboard-decline-trends"
    )
    const result = await getDeclineReasonBreakdown()

    expect(result.totalDeclines).toBe(rows.length)
    expect(result.topReasons.length).toBe(5)
  })

  it("queries the intakes table with the right filters", async () => {
    const supabase = createSupabaseMock({ data: [], error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getDeclineReasonBreakdown } = await import(
      "@/lib/data/dashboard-decline-trends"
    )
    await getDeclineReasonBreakdown()

    expect(supabase.from).toHaveBeenCalledWith("intakes")
    expect(supabase.select).toHaveBeenCalledWith(
      "decline_reason_code, decline_reason",
    )
    expect(supabase.eq).toHaveBeenCalledWith("status", "declined")
    expect(supabase.gte).toHaveBeenCalledWith("declined_at", expect.any(String))
  })
})
