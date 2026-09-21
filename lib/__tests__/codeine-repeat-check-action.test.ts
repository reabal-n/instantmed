import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { sydneyCalendarDateDaysAgo } from "@/lib/clinical/codeine-repeat-window"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserWithProfile: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  getAuthenticatedUserWithProfile: mocks.getAuthenticatedUserWithProfile,
}))
vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { checkCodeineRepeatWindowAction } from "@/app/actions/codeine-repeat-check"

const PATIENT_ID = "11111111-1111-4111-8111-111111111111"

/**
 * The gate measures in Australia/Sydney calendar days. The clock is pinned to
 * 15:00 UTC on 19 September, which is already 01:00 on 20 September in Sydney:
 * the hour band in which UTC day arithmetic disagrees with the gate by a day.
 * Dates are then built with the gate's own Sydney-day helper, so the test
 * proves the arithmetic at every wall-clock hour and on UTC CI runners.
 */
const NOW = new Date("2026-09-19T15:00:00.000Z")

/** In-memory prescriptions query, same shape as the gate's own unit test. */
function mockSupabase(rows: Array<Record<string, unknown>>, error: { message: string } | null = null) {
  const from = vi.fn(() => {
    let data = [...rows]
    const query = {
      select: vi.fn(() => query),
      in: vi.fn((column: string, values: unknown[]) => { data = data.filter((row) => values.includes(row[column])); return query }),
      gte: vi.fn((column: string, value: string) => { data = data.filter((row) => String(row[column]) >= value); return query }),
      order: vi.fn(() => query),
      limit: vi.fn(async (count: number) => ({ data: data.slice(0, count), error })),
    }
    return query
  })
  return { from }
}

describe("checkCodeineRepeatWindowAction", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(NOW)
    vi.clearAllMocks()
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue({
      user: { id: "auth-1" },
      profile: { id: PATIENT_ID, role: "patient" },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns unknown for a guest, without touching the database", async () => {
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue(null)
    const supabase = mockSupabase([])
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte" })).toEqual({ success: true, data: { status: "unknown" } })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("returns unknown for malformed input", async () => {
    expect(await checkCodeineRepeatWindowAction({ medicationName: "" })).toEqual({ success: true, data: { status: "unknown" } })
    expect(await checkCodeineRepeatWindowAction(null)).toEqual({ success: true, data: { status: "unknown" } })
    expect(await checkCodeineRepeatWindowAction({ medicationName: "x".repeat(201) })).toEqual({ success: true, data: { status: "unknown" } })
  })

  it("returns clear for a non-codeine medicine without querying", async () => {
    const supabase = mockSupabase([])
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Sertraline", strength: "100 mg" })).toEqual({ success: true, data: { status: "clear" } })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("returns blocked with patient-facing dates when a codeine script was issued inside 7 days", async () => {
    const issued = sydneyCalendarDateDaysAgo(NOW, 2)
    expect(issued).toBe("2026-09-18") // two Sydney days before 20 Sep, not two UTC days before 19 Sep
    mocks.createServiceRoleClient.mockReturnValue(mockSupabase([
      {
        patient_id: PATIENT_ID,
        medication_name: "Paracetamol + Codeine 500/30",
        status: "active",
        issued_date: issued,
        created_at: `${issued}T00:00:00.000Z`, // webhook sync at 10:00 Sydney on the issue day
      },
    ]))
    const result = await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte", strength: "500 mg/30 mg" })
    expect(result.data.status).toBe("blocked")
    if (result.data.status !== "blocked") return
    expect(result.data.latestIssuedDate).toBe("2026-09-18")
    expect(result.data.daysSince).toBe(2)
    expect(result.data.requestAgainOn).toBe("2026-09-25")
    expect(result.data.latestIssuedLabel).toBe("18 September 2026")
    expect(result.data.requestAgainLabel).toBe("25 September 2026")
  })

  it("returns clear once the window has passed", async () => {
    mocks.createServiceRoleClient.mockReturnValue(mockSupabase([
      { patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "active", issued_date: "2020-01-01" },
    ]))
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte" })).toEqual({ success: true, data: { status: "clear" } })
  })

  it("fails open to clear on a lookup error, matching the checkout gate", async () => {
    mocks.createServiceRoleClient.mockReturnValue(mockSupabase([], { message: "boom" }))
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte" })).toEqual({ success: true, data: { status: "clear" } })
  })

  it("returns unknown when rate limited", async () => {
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: false, error: "slow down" })
    const supabase = mockSupabase([])
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte" })).toEqual({ success: true, data: { status: "unknown" } })
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
