import { describe, expect, it } from "vitest"

import { getHeardAboutUsBreakdown } from "@/lib/admin/heard-about-us-breakdown"
import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"

// Minimal supabase stub: from().select().in().gte() resolves to { data, error }.
function stub(result: { data: unknown; error: unknown }) {
  const chain = {
    select: () => chain,
    in: () => chain,
    gte: () => Promise.resolve(result),
  }
  return { from: () => chain } as never
}

describe("getHeardAboutUsBreakdown", () => {
  it("returns zeros on a query error", async () => {
    const out = await getHeardAboutUsBreakdown(stub({ data: null, error: { message: "boom" } }))
    expect(out.answered).toBe(0)
    expect(out.paidTotal).toBe(0)
    expect(out.rows.every((r) => r.count === 0)).toBe(true)
  })

  it("counts answers, computes the paid denominator, and orders by count desc", async () => {
    const out = await getHeardAboutUsBreakdown(
      stub({
        data: [
          { heard_about_us: "ai", patient_id: "p1", exclude_from_reporting: false },
          { heard_about_us: "ai", patient_id: "p2", exclude_from_reporting: false },
          { heard_about_us: "friend", patient_id: "p3", exclude_from_reporting: false },
          { heard_about_us: null, patient_id: "p4", exclude_from_reporting: false },
        ],
        error: null,
      }),
    )
    expect(out.paidTotal).toBe(4) // all 4 are live paid orders
    expect(out.answered).toBe(3) // 3 carry an answer
    expect(out.rows[0]).toEqual({ value: "ai", label: "ChatGPT or other AI", count: 2 })
    expect(out.rows.find((r) => r.value === "friend")?.count).toBe(1)
  })

  it("excludes seeded E2E and excluded-from-reporting rows from both numerator and denominator", async () => {
    const out = await getHeardAboutUsBreakdown(
      stub({
        data: [
          { heard_about_us: "ai", patient_id: "real", exclude_from_reporting: false },
          { heard_about_us: "ai", patient_id: SEEDED_E2E_PATIENT_PROFILE_ID, exclude_from_reporting: false },
          { heard_about_us: "search", patient_id: "real2", exclude_from_reporting: true },
        ],
        error: null,
      }),
    )
    expect(out.paidTotal).toBe(1) // only the one real, non-excluded row
    expect(out.answered).toBe(1)
    expect(out.rows.find((r) => r.value === "ai")?.count).toBe(1)
    expect(out.rows.find((r) => r.value === "search")?.count).toBe(0)
  })
})
