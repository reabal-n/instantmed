import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import type { SupabaseClient } from "@supabase/supabase-js"

import { aggregateFirstOrderCampaignEconomics, readFirstOrderCampaignEconomics } from "@/lib/ads-agent/first-order-economics"
import type { AdsSnapshotWindow,CampaignEconomics } from "@/lib/ads-agent/types"
import { readCustomerGrowthRevenueEvidence } from "@/lib/data/customer-growth-revenue-read"

const since = new Date("2026-08-10T00:00:00Z")
const until = new Date("2026-09-08T23:59:59.999Z")
const row = (id: string, patient_id: string, paid_at: string, campaignid = "123") => ({
  id, patient_id, paid_at, campaignid, utm_id: null,
  stripe_fee_cents: 100, stripe_balance_transaction_id: "txn_test", stripe_fee_synced_at: "2026-09-09T00:00:00Z",
})
const first = row("first", "patient-a", "2026-08-11T00:00:00Z")
const repeat = row("repeat", "patient-a", "2026-08-12T00:00:00Z")
const evidence = { paidRows: [first, repeat].map((r) => ({ ...r, amount_cents: 3000, category: "prescription", subtype: null, status: "approved", payment_status: "paid" })), refundRows: [], disputeRows: [] }

describe("first-order campaign cash", () => {
  it("charges all campaign spend to first orders and excludes repeat revenue", () => {
    const result = aggregateFirstOrderCampaignEconomics({ evidence, rows: [first, repeat], history: [first, repeat], since, until, campaignId: "123", spendCents: 3500 })
    expect(result).toEqual({ contributionCents: -600, netRetainedRevenueCents: 3000, stripeFeeCents: 100, orders: 1 })
  })
  it("recognizes an earlier order in another campaign or service as the customer's first order", () => {
    const older = row("older", "patient-a", "2026-07-01T00:00:00Z", "456")
    expect(aggregateFirstOrderCampaignEconomics({ evidence, rows: [first, repeat], history: [older, first, repeat], since, until, campaignId: "123", spendCents: 1000 })).toMatchObject({ orders: 0, contributionCents: -1000 })
  })
  it("deducts exact refund and dispute cash, including first-order losses from before the window", () => {
    const older = row("older", "patient-b", "2026-07-01T00:00:00Z")
    const cash = { ...evidence,
      refundRows: [{ id: "first", amount_cents: 3000, refund_amount_cents: 500, refunded_at: "2026-08-15T00:00:00Z", refund_status: "succeeded", stripe_refund_id: "re_one" }],
      disputeRows: [{ intake_id: "older", order_amount_cents: 3000, funds_withdrawn_cents: 3000, funds_withdrawn_at: "2026-08-16T00:00:00Z", funds_reinstated_at: null, funds_reinstated_cents: null }],
    }
    expect(aggregateFirstOrderCampaignEconomics({ evidence: cash, rows: [first, repeat, older], history: [first, repeat, older], since, until, campaignId: "123", spendCents: 1000 })).toMatchObject({ contributionCents: -1600, netRetainedRevenueCents: -500 })
  })
  it("fails closed for unknown identity or actual fees instead of guessing zero", () => {
    expect(() => aggregateFirstOrderCampaignEconomics({ evidence, rows: [{ ...first, patient_id: null }, repeat], history: [first, repeat], since, until, campaignId: "123", spendCents: 1000 })).toThrow()
    expect(() => aggregateFirstOrderCampaignEconomics({ evidence, rows: [{ ...first, stripe_fee_cents: null }, repeat], history: [first, repeat], since, until, campaignId: "123", spendCents: 1000 })).toThrow()
  })
})

vi.mock("@/lib/data/customer-growth-revenue-read", async (original) => ({
  ...await original<typeof import("@/lib/data/customer-growth-revenue-read")>(),
  readCustomerGrowthRevenueEvidence: vi.fn(),
}))

describe("fresh first-order reader boundary", () => {
  const range = { startUtc: since.toISOString(), endUtcExclusive: "2026-09-09T00:00:00Z" } as AdsSnapshotWindow
  const campaigns = [{ campaignId: "123", spendCents: 1000 }] as CampaignEconomics[]
  function database(historyComplete = true) {
    const results = [
      { data: [first, repeat], count: 2, error: null },
      { data: [first, repeat], count: historyComplete ? 2 : 3, error: null },
    ]
    return { from: vi.fn(() => {
      const result = results.shift()
      const query = { then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) } as Record<string, unknown>
      for (const key of ["select", "in", "not", "lte", "limit", "or", "neq"]) query[key] = vi.fn(() => query)
      return query
    }) } as unknown as SupabaseClient
  }
  it("enriches aggregate evidence without changing the source campaign", async () => {
    vi.mocked(readCustomerGrowthRevenueEvidence).mockResolvedValue(evidence)
    const result = await readFirstOrderCampaignEconomics({ campaigns, range, supabase: database() })
    expect(result[0].firstOrder).toEqual({ orders: 1, stripeFeeCents: 100, netRetainedRevenueCents: 3000, contributionCents: 1900 })
    expect(campaigns[0].firstOrder).toBeUndefined()
    expect(JSON.stringify(result)).not.toContain("patient-a")
    expect(vi.mocked(readCustomerGrowthRevenueEvidence).mock.lastCall?.slice(1)).toEqual([since, until])
  })
  it("fails closed on truncated history or unavailable cash ledgers", async () => {
    vi.mocked(readCustomerGrowthRevenueEvidence).mockResolvedValue(evidence)
    expect((await readFirstOrderCampaignEconomics({ campaigns, range, supabase: database(false) }))[0].firstOrder).toBeNull()
    vi.mocked(readCustomerGrowthRevenueEvidence).mockRejectedValue(new Error("cash_unavailable"))
    expect((await readFirstOrderCampaignEconomics({ campaigns, range, supabase: database() }))[0].firstOrder).toBeNull()
  })
})
