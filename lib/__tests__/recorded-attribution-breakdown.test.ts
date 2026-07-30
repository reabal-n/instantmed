import { describe, expect, it } from "vitest"

import {
  buildRecordedAttributionBreakdown,
  getRecordedAttributionBreakdown,
} from "@/lib/admin/recorded-attribution-breakdown"

function stub(result: { data: unknown; error: unknown }) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain = {
    select(...args: unknown[]) {
      calls.push({ method: "select", args })
      return chain
    },
    in(...args: unknown[]) {
      calls.push({ method: "in", args })
      return chain
    },
    not(...args: unknown[]) {
      calls.push({ method: "not", args })
      return chain
    },
    gte(...args: unknown[]) {
      calls.push({ method: "gte", args })
      return chain
    },
    lte(...args: unknown[]) {
      calls.push({ method: "lte", args })
      return chain
    },
    or(...args: unknown[]) {
      calls.push({ method: "or", args })
      return chain
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(result).then(resolve)
    },
  }
  return { calls, supabase: { from: () => chain } as never }
}

describe("recorded attribution breakdown", () => {
  it("keeps Direct and Unknown explicit instead of blending them into known acquisition", () => {
    const result = buildRecordedAttributionBreakdown({
      now: new Date("2026-07-29T00:00:00.000Z"),
      rows: [
        { gclid: "click-1", landing_page: "/medical-certificate" },
        { referrer: "https://chatgpt.com/", landing_page: "/medical-certificate" },
        { landing_page: "/prescriptions" },
        {},
      ],
    })

    expect(result.paidTotal).toBe(4)
    expect(result.knownCount).toBe(2)
    expect(result.coveragePercent).toBe(50)
    expect(result.rows.find(({ group }) => group === "google_ads")?.count).toBe(1)
    expect(result.rows.find(({ group }) => group === "ai_referral")?.count).toBe(1)
    expect(result.rows.find(({ group }) => group === "direct")?.count).toBe(1)
    expect(result.rows.find(({ group }) => group === "unknown")?.count).toBe(1)
  })

  it("queries the paid-at window and fails query errors as unavailable, not zero", async () => {
    const { calls, supabase } = stub({ data: null, error: { message: "boom" } })
    const result = await getRecordedAttributionBreakdown(supabase, {
      now: new Date("2026-07-29T00:00:00.000Z"),
    })

    expect(result.availability).toBe("unavailable")
    expect(result.paidTotal).toBeNull()
    expect(calls).toEqual(expect.arrayContaining([
      { method: "not", args: ["paid_at", "is", null] },
      { method: "gte", args: ["paid_at", "2026-06-29T00:00:00.000Z"] },
      { method: "lte", args: ["paid_at", "2026-07-29T00:00:00.000Z"] },
    ]))
  })
})
