import { describe, expect, it } from "vitest"

import {
  getOpenFraudFlagReviewQueue,
  resolveFraudFlagReview,
} from "@/lib/admin/fraud-flag-review"

function readStub(result: { data: unknown[] | null; count: number | null; error: unknown }) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (...args: unknown[]) => {
      calls.push(["select", ...args])
      return query
    },
    eq: (...args: unknown[]) => {
      calls.push(["eq", ...args])
      return query
    },
    order: (...args: unknown[]) => {
      calls.push(["order", ...args])
      return query
    },
    limit: (...args: unknown[]) => {
      calls.push(["limit", ...args])
      return Promise.resolve(result)
    },
  }

  return {
    calls,
    supabase: { from: () => query },
  }
}

describe("fraud flag review ownership", () => {
  it("returns an exact admin queue without selecting free-form details or patient identifiers", async () => {
    const stub = readStub({
      count: 2,
      data: [{
        id: "11111111-1111-4111-8111-111111111111",
        intake_id: "22222222-2222-4222-8222-222222222222",
        flag_type: "suspicious_medicare",
        severity: "high",
        created_at: "2026-09-01T00:00:00Z",
      }],
      error: null,
    })

    const queue = await getOpenFraudFlagReviewQueue(stub.supabase as never, { limit: 1 })

    expect(queue).toMatchObject({ openCount: 2, queryFailed: false, coverageCapped: true })
    expect(queue.items).toHaveLength(1)
    const select = stub.calls.find(([method]) => method === "select")
    expect(select?.[1]).toBe("id, intake_id, flag_type, severity, created_at")
    expect(String(select?.[1])).not.toMatch(/details|patient_id/i)
    expect(stub.calls).toContainEqual(["eq", "status", "open"])
    expect(stub.calls).toContainEqual(["order", "created_at", { ascending: true }])
  })

  it.each(["reviewed", "dismissed"] as const)(
    "atomically marks one still-open flag as %s",
    async (outcome) => {
      const calls: Array<[string, ...unknown[]]> = []
      const result = {
        data: { id: "11111111-1111-4111-8111-111111111111" },
        error: null,
      }
      const query = {
        update: (value: unknown) => {
          calls.push(["update", value])
          return query
        },
        eq: (...args: unknown[]) => {
          calls.push(["eq", ...args])
          return query
        },
        select: (...args: unknown[]) => {
          calls.push(["select", ...args])
          return query
        },
        maybeSingle: () => Promise.resolve(result),
      }
      const supabase = { from: () => query }

      const resolution = await resolveFraudFlagReview(
        supabase as never,
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333",
        outcome,
      )

      expect(resolution).toEqual({ outcome: "resolved", queryFailed: false })
      expect(calls).toContainEqual(["eq", "id", "11111111-1111-4111-8111-111111111111"])
      expect(calls).toContainEqual(["eq", "status", "open"])
      expect(calls[0]?.[1]).toMatchObject({
        status: outcome,
        reviewed_by: "33333333-3333-4333-8333-333333333333",
      })
      expect(calls[0]?.[1]).toHaveProperty("reviewed_at")
    },
  )
})
