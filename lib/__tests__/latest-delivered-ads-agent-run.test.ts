import { describe, expect, it } from "vitest"

import {
  getLatestDeliveredAdsAgentRun,
  getRecentDeliveredAdsAgentRunDailySpend,
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

function listStub(result: { data: unknown; error: unknown }) {
  const chain = {
    select() { return chain },
    eq() { return chain },
    not() { return chain },
    order() { return chain },
    limit() { return chain },
    then(
      resolve: (value: typeof result) => unknown,
      reject: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(resolve, reject)
    },
  }
  return { from: () => chain } as never
}

function ledgerRow(args: {
  clicks?: number | null
  dateKey: string
  endDate?: string
  spend?: [number | null, number | null, number | null]
}) {
  const [enabled, paused, other] = args.spend ?? [3_000, 1_000, 0]
  const portfolio = (spendCents: number | null) => ({
    spendCents,
    ...(args.clicks === undefined ? {} : { clicks: args.clicks }),
  })
  return {
    daily_totals: {
      enabled: portfolio(enabled),
      other: portfolio(other),
      paused: portfolio(paused),
    },
    daily_window: { endDate: args.endDate ?? args.dateKey, startDate: args.dateKey },
    delivered_at: `${args.dateKey}T23:30:00.000Z`,
    report_date: args.dateKey,
  }
}

describe("delivered-run daily ads spend ledger", () => {
  it("sums the three status portfolios per closed Sydney day and carries clicks when present", async () => {
    const read = await getRecentDeliveredAdsAgentRunDailySpend(listStub({
      data: [
        ledgerRow({ dateKey: "2026-08-04", clicks: 10 }),
        ledgerRow({ dateKey: "2026-08-03" }),
      ],
      error: null,
    }))

    expect(read.availability).toBe("available")
    expect(read.days).toEqual([
      {
        clicks: 30,
        dateKey: "2026-08-04",
        deliveredAt: "2026-08-04T23:30:00.000Z",
        reportDate: "2026-08-04",
        spendCents: 4_000,
      },
      {
        clicks: null,
        dateKey: "2026-08-03",
        deliveredAt: "2026-08-03T23:30:00.000Z",
        reportDate: "2026-08-03",
        spendCents: 4_000,
      },
    ])
  })

  it("omits unknown-spend days and non-single-day windows instead of writing zeros", async () => {
    const read = await getRecentDeliveredAdsAgentRunDailySpend(listStub({
      data: [
        ledgerRow({ dateKey: "2026-08-04" }),
        // Spend fetch failed that day — every portfolio null.
        ledgerRow({ dateKey: "2026-08-03", spend: [null, null, null] }),
        // A widened window cannot be attributed to one day.
        ledgerRow({ dateKey: "2026-08-01", endDate: "2026-08-02" }),
        { report_date: "2026-07-31", delivered_at: "x", daily_totals: null, daily_window: null },
      ],
      error: null,
    }))

    expect(read.availability).toBe("available")
    expect(read.days.map((day) => day.dateKey)).toEqual(["2026-08-04"])
  })

  it("keeps the newest evidence when two rows describe the same day and fails soft on query errors", async () => {
    const duplicated = await getRecentDeliveredAdsAgentRunDailySpend(listStub({
      data: [
        ledgerRow({ dateKey: "2026-08-04", spend: [5_000, 0, 0] }),
        ledgerRow({ dateKey: "2026-08-04", spend: [9_000, 0, 0] }),
      ],
      error: null,
    }))
    expect(duplicated.days).toHaveLength(1)
    expect(duplicated.days[0].spendCents).toBe(5_000)

    const failed = await getRecentDeliveredAdsAgentRunDailySpend(listStub({
      data: null,
      error: { message: "boom" },
    }))
    expect(failed).toEqual({ availability: "unavailable", days: [], reason: "query_failed" })
  })
})
