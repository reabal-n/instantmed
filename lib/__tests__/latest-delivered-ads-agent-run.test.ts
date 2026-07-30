import { describe, expect, it } from "vitest"

import {
  getLatestDeliveredAdsAgentRun,
  parseDeliveredAdsAgentRun,
} from "@/lib/ads-agent/runs"

const validRow = {
  delivered_at: "2026-07-28T23:30:00.000Z",
  id: "run-1",
  recommendation: [],
  report_date: "2026-07-29",
  snapshot: {
    generatedAt: "2026-07-28T23:20:00.000Z",
    reportDate: "2026-07-29",
    rolling30: [],
    tracking: {
      evidenceAsOf: "2026-07-28T23:00:00.000Z",
      reasonCodes: [],
      scaleAllowed: true,
      state: "GREEN",
    },
  },
}

function stub(result: { data: unknown; error: unknown }) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain = {
    select(...args: unknown[]) { calls.push({ method: "select", args }); return chain },
    eq(...args: unknown[]) { calls.push({ method: "eq", args }); return chain },
    not(...args: unknown[]) { calls.push({ method: "not", args }); return chain },
    order(...args: unknown[]) { calls.push({ method: "order", args }); return chain },
    limit(...args: unknown[]) { calls.push({ method: "limit", args }); return chain },
    maybeSingle() { calls.push({ method: "maybeSingle", args: [] }); return Promise.resolve(result) },
  }
  return { calls, supabase: { from: () => chain } as never }
}

describe("latest delivered Ads Agent evidence", () => {
  it("parses the persisted delivered snapshot and rejects malformed evidence", () => {
    expect(parseDeliveredAdsAgentRun(validRow)?.id).toBe("run-1")
    expect(parseDeliveredAdsAgentRun({ ...validRow, delivered_at: "bad" })).toBeNull()
    expect(parseDeliveredAdsAgentRun({ ...validRow, recommendation: [{}] })).toBeNull()
  })

  it("reads only the newest delivered run without invoking snapshot builders", async () => {
    const { calls, supabase } = stub({ data: validRow, error: null })
    const result = await getLatestDeliveredAdsAgentRun(supabase)

    expect(result.availability).toBe("available")
    expect(calls).toEqual([
      expect.objectContaining({ method: "select" }),
      { method: "eq", args: ["status", "delivered"] },
      { method: "not", args: ["delivered_at", "is", null] },
      { method: "order", args: ["delivered_at", { ascending: false }] },
      { method: "limit", args: [1] },
      { method: "maybeSingle", args: [] },
    ])
  })

  it("distinguishes query failure, absence, and malformed records", async () => {
    const queryFailure = await getLatestDeliveredAdsAgentRun(
      stub({ data: null, error: { message: "boom" } }).supabase,
    )
    const missing = await getLatestDeliveredAdsAgentRun(
      stub({ data: null, error: null }).supabase,
    )
    const malformed = await getLatestDeliveredAdsAgentRun(
      stub({ data: { id: "broken" }, error: null }).supabase,
    )

    expect(queryFailure.reason).toBe("query_failed")
    expect(missing.reason).toBe("not_found")
    expect(malformed.reason).toBe("invalid_record")
  })
})
