import { beforeEach, describe, expect, it, vi } from "vitest"

import { getReviewPrescriptionHistory } from "@/lib/data/review-prescription-history"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), from: vi.fn() }))
vi.mock("@/lib/auth/helpers", () => ({ requireRoleOrNull: mocks.auth }))
vi.mock("@/lib/doctor/patient-access", () => ({ doctorCanAccessPatient: mocks.access }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => ({ from: mocks.from }) }))
const patientId = "11111111-1111-4111-8111-111111111111"
let rows: Record<string, unknown>[]
let error: unknown
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ profile: { id: "doctor", role: "admin" } })
  mocks.access.mockResolvedValue(false)
  rows = []
  error = null
  mocks.from.mockImplementation((table: string) => {
    expect(table).toBe("prescriptions")
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { expect([key, value]).toEqual(["patient_id", patientId]); return query },
      order: () => query,
      limit: async () => ({ data: rows, error }),
    }
    return query
  })
})
describe("review prescription history", () => {
  it.each([null, { profile: { id: "support", role: "support" } }])("rejects non-clinical readers", async (auth) => {
    mocks.auth.mockResolvedValue(auth)
    expect((await getReviewPrescriptionHistory(patientId)).error).toBeTruthy()
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it("denies an unrelated doctor before reading prescriptions", async () => {
    mocks.auth.mockResolvedValue({ profile: { id: "doctor", role: "doctor" } })
    expect((await getReviewPrescriptionHistory(patientId)).error).toContain("patient access")
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it("returns recorded directions unchanged for an authorized doctor", async () => {
    mocks.auth.mockResolvedValue({ profile: { id: "doctor", role: "doctor" } })
    mocks.access.mockResolvedValue(true)
    rows = [{ id: "rx", medication_name: "Synthetic medicine", dosage_instructions: "One daily\nOnly as directed.", status: "cancelled", issued_date: "2026-09-01", intake_id: "request" }]
    const result = await getReviewPrescriptionHistory(patientId)
    expect(result.error).toBeNull()
    expect(result.prescriptions[0]).toMatchObject({ dosage_instructions: "One daily\nOnly as directed.", status: "cancelled", request_id: "request" })
  })
  it("distinguishes query failure from no recorded prescriptions", async () => {
    error = { message: "private database detail" }
    const result = await getReviewPrescriptionHistory(patientId)
    expect(result.error).toBe("Could not load prescription history. Try refreshing.")
    expect(result.prescriptions).toEqual([])
  })
  it("reports a capped result without losing the cap warning", async () => {
    rows = Array.from({ length: 21 }, (_, i) => ({ id: `rx-${i}`, medication_name: "Synthetic", status: "active", issued_date: "2026-09-01" }))
    const result = await getReviewPrescriptionHistory(patientId)
    expect(result.prescriptions).toHaveLength(20)
    expect(result.hasMore).toBe(true)
  })
})
