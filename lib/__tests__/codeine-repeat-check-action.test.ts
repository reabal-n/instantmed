import { beforeEach, describe, expect, it, vi } from "vitest"

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

function twoDaysAgo(): string {
  return new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

describe("checkCodeineRepeatWindowAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue({
      user: { id: "auth-1" },
      profile: { id: PATIENT_ID, role: "patient" },
    })
  })

  it("returns unknown for a guest, without touching the database", async () => {
    mocks.getAuthenticatedUserWithProfile.mockResolvedValue(null)
    const supabase = mockSupabase([])
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte" })).toEqual({ status: "unknown" })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("returns unknown for malformed input", async () => {
    expect(await checkCodeineRepeatWindowAction({ medicationName: "" })).toEqual({ status: "unknown" })
    expect(await checkCodeineRepeatWindowAction(null)).toEqual({ status: "unknown" })
    expect(await checkCodeineRepeatWindowAction({ medicationName: "x".repeat(201) })).toEqual({ status: "unknown" })
  })

  it("returns clear for a non-codeine medicine without querying", async () => {
    const supabase = mockSupabase([])
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Sertraline", strength: "100 mg" })).toEqual({ status: "clear" })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("returns blocked with patient-facing dates when a codeine script was issued inside 7 days", async () => {
    const issued = twoDaysAgo()
    mocks.createServiceRoleClient.mockReturnValue(mockSupabase([
      { patient_id: PATIENT_ID, medication_name: "Paracetamol + Codeine 500/30", status: "active", issued_date: issued },
    ]))
    const result = await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte", strength: "500 mg/30 mg" })
    expect(result.status).toBe("blocked")
    if (result.status !== "blocked") return
    expect(result.latestIssuedDate).toBe(issued)
    expect(result.daysSince).toBe(2)
    expect(result.requestAgainOn > issued).toBe(true)
    expect(result.latestIssuedLabel).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/)
    expect(result.requestAgainLabel).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/)
  })

  it("returns clear once the window has passed", async () => {
    mocks.createServiceRoleClient.mockReturnValue(mockSupabase([
      { patient_id: PATIENT_ID, medication_name: "Panadeine Forte", status: "active", issued_date: "2020-01-01" },
    ]))
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte" })).toEqual({ status: "clear" })
  })

  it("fails open to clear on a lookup error, matching the checkout gate", async () => {
    mocks.createServiceRoleClient.mockReturnValue(mockSupabase([], { message: "boom" }))
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte" })).toEqual({ status: "clear" })
  })

  it("returns unknown when rate limited", async () => {
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: false, error: "slow down" })
    const supabase = mockSupabase([])
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    expect(await checkCodeineRepeatWindowAction({ medicationName: "Panadeine Forte" })).toEqual({ status: "unknown" })
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
