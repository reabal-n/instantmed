import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import type { SupabaseClient } from "@supabase/supabase-js"

import { readCampaignRepeatValue } from "@/lib/ads-agent/first-order-economics"
import { aggregateCampaignRepeatValue } from "@/lib/ads-agent/first-order-economics-core"
import type { AdsSnapshotWindow, CampaignEconomics } from "@/lib/ads-agent/types"
import { type CustomerGrowthRevenueEvidence, readCustomerGrowthRevenueEvidence } from "@/lib/data/customer-growth-revenue-read"

/**
 * Cohort repeat value (owner decision 2026-09-19, "count the repeat revenue").
 * Click-attributed repeats inside the window miss the repeats that come back
 * direct, which the cohorts show are most of them. The matured cohort answers
 * "what does one first order bring back within 60 days, on any channel".
 */

const until = new Date("2026-09-08T23:59:59.999Z")
const cohortEnd = new Date("2026-07-10T23:59:59.999Z")
const cohortStart = new Date("2026-05-01T00:00:00Z")

const row = (id: string, patient_id: string, paid_at: string, campaignid: string | null = "123", amount_cents = 3000) => ({
  id, patient_id, paid_at, campaignid, utm_id: null, amount_cents,
  stripe_fee_cents: 100, stripe_balance_transaction_id: "txn_test", stripe_fee_synced_at: "2026-09-09T00:00:00Z",
})
const paidRow = <T extends object>(r: T) => ({ ...r, category: "prescription", subtype: null, status: "approved", payment_status: "paid" })

// patient-a: matured first order in the campaign, one repeat inside 60 days, one outside.
const aFirst = row("a-first", "patient-a", "2026-06-01T00:00:00Z")
const aRepeatIn = row("a-repeat-in", "patient-a", "2026-06-15T00:00:00Z", null)
const aRepeatLate = row("a-repeat-late", "patient-a", "2026-09-01T00:00:00Z", null)
// patient-b: matured first order, no repeat.
const bFirst = row("b-first", "patient-b", "2026-06-05T00:00:00Z")
// patient-c: first order was in another campaign; the campaign-123 order is a repeat, not a first.
const cOlder = row("c-older", "patient-c", "2026-05-20T00:00:00Z", "456")
const cLater = row("c-later", "patient-c", "2026-06-10T00:00:00Z")
// patient-d: campaign first order too recent to have matured.
const dFirst = row("d-first", "patient-d", "2026-08-01T00:00:00Z")

const cohortRows = [aFirst, bFirst, cLater, dFirst]
const history = [aFirst, aRepeatIn, aRepeatLate, bFirst, cOlder, cLater, dFirst]
const evidence: CustomerGrowthRevenueEvidence = { paidRows: history.map(paidRow), refundRows: [], disputeRows: [] }

describe("matured-cohort repeat value", () => {
  it("counts only 60-day repeats of matured campaign first orders, on any channel", () => {
    const result = aggregateCampaignRepeatValue({ campaignId: "123", cohortRows, history, evidence, cohortStart, cohortEnd, until })
    expect(result).toEqual({
      cohortWindowDays: 60,
      cohortStartUtc: cohortStart.toISOString(),
      cohortEndUtc: cohortEnd.toISOString(),
      maturedFirstOrders: 2,
      repeatOrders: 1,
      repeatNetRetainedRevenueCents: 3000,
      repeatStripeFeeCents: 100,
      estimatedFeeOrders: 0,
      repeatContributionPerFirstOrderCents: 1450,
    })
  })

  it("deducts exact refund cash from the repeat and estimates a fee that was never synced", () => {
    const unsynced = { ...aRepeatIn, stripe_fee_cents: null, stripe_balance_transaction_id: null, stripe_fee_synced_at: null }
    const cash: CustomerGrowthRevenueEvidence = {
      ...evidence,
      paidRows: [aFirst, unsynced, aRepeatLate, bFirst, cOlder, cLater, dFirst].map(paidRow),
      refundRows: [{ id: "a-repeat-in", amount_cents: 3000, refund_amount_cents: 500, refunded_at: "2026-06-20T00:00:00Z", refund_status: "succeeded", stripe_refund_id: "re_one" }],
    }
    const result = aggregateCampaignRepeatValue({ campaignId: "123", cohortRows, history: [aFirst, unsynced, aRepeatLate, bFirst, cOlder, cLater, dFirst], evidence: cash, cohortStart, cohortEnd, until })
    expect(result.repeatNetRetainedRevenueCents).toBe(2500)
    expect(result.estimatedFeeOrders).toBe(1)
    expect(result.repeatStripeFeeCents).toBeGreaterThan(0)
    expect(result.repeatContributionPerFirstOrderCents).toBe(Math.floor((2500 - result.repeatStripeFeeCents) / 2))
  })

  it("reports zero matured first orders for a campaign with no cohort rather than guessing", () => {
    const result = aggregateCampaignRepeatValue({ campaignId: "999", cohortRows, history, evidence, cohortStart, cohortEnd, until })
    expect(result.maturedFirstOrders).toBe(0)
    expect(result.repeatContributionPerFirstOrderCents).toBe(0)
  })

  it("fails closed on unknown identity instead of counting", () => {
    expect(() => aggregateCampaignRepeatValue({ campaignId: "123", cohortRows: [{ ...aFirst, patient_id: null }], history, evidence, cohortStart, cohortEnd, until })).toThrow()
  })
})

vi.mock("@/lib/data/customer-growth-revenue-read", async (original) => ({
  ...await original<typeof import("@/lib/data/customer-growth-revenue-read")>(),
  readCustomerGrowthRevenueEvidence: vi.fn(),
}))

describe("cohort repeat-value reader boundary", () => {
  const range = { startUtc: "2026-08-10T00:00:00Z", endUtcExclusive: "2026-09-09T00:00:00Z" } as AdsSnapshotWindow
  const campaigns = [{ campaignId: "123", spendCents: 1000 }] as CampaignEconomics[]
  function database(results: Array<{ data: unknown[]; count: number | null; error: null | { message: string } }>) {
    const queue = [...results]
    return { from: vi.fn(() => {
      const result = queue.shift()
      const query = { then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) } as Record<string, unknown>
      for (const key of ["select", "in", "not", "lte", "gte", "limit", "or", "neq"]) query[key] = vi.fn(() => query)
      return query
    }) } as unknown as SupabaseClient
  }

  it("reads the cohort horizon and returns matured-cohort evidence per campaign", async () => {
    vi.mocked(readCustomerGrowthRevenueEvidence).mockResolvedValue(evidence as never)
    const supabase = database([
      { data: [aFirst, bFirst, cLater, dFirst, aRepeatIn, aRepeatLate, cOlder], count: 7, error: null },
      { data: history, count: history.length, error: null },
    ])
    const result = await readCampaignRepeatValue({ campaigns, range, supabase })
    expect(result.get("123")).toMatchObject({ maturedFirstOrders: 2, repeatOrders: 1, repeatContributionPerFirstOrderCents: 1450 })
    const [, since, untilRead] = vi.mocked(readCustomerGrowthRevenueEvidence).mock.calls[0]!
    // Cohort horizon: 60 days of maturity plus 90 days of first orders before the window end.
    expect(untilRead.toISOString()).toBe("2026-09-08T23:59:59.999Z")
    expect(since.getTime()).toBe(Date.parse("2026-09-08T23:59:59.999Z") - 150 * 24 * 60 * 60 * 1000)
  })

  it("returns null for every campaign when the cash ledger or history is unavailable", async () => {
    vi.mocked(readCustomerGrowthRevenueEvidence).mockRejectedValue(new Error("ledger_unavailable"))
    const result = await readCampaignRepeatValue({ campaigns, range, supabase: database([]) })
    expect(result.get("123")).toBeNull()
  })
})
