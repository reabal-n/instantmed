import { beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  readCampaignRepeatValue,
  readFirstOrderCampaignEconomicsEvidence,
} from "@/lib/ads-agent/first-order-economics"
import { readScriptsScaleAuthorizationEvidence } from "@/lib/ads-agent/scripts-scale-authorization-reader"
import type { AdsAgentSnapshot, CampaignEconomics } from "@/lib/ads-agent/types"

vi.mock("@/lib/ads-agent/first-order-economics", () => ({
  readCampaignRepeatValue: vi.fn(async () => new Map()),
  readFirstOrderCampaignEconomicsEvidence: vi.fn(),
}))

/**
 * The authorization reader enriches the stored run with a fresh cash-ledger
 * read. A failed or incomplete fresh financial read must abort the
 * authorization instead of letting the policy size a spending increase on the
 * stored run's older cash; identity or purchase-history gaps only leave the
 * first-order diagnostic null (advisory).
 */

const budgetResourceName = "customers/9205010513/campaignBudgets/15589755119"
const campaignResourceName = "customers/9205010513/campaigns/23870042807"

const campaign: CampaignEconomics = {
  biddingStrategyType: "MAXIMIZE_CONVERSION_VALUE",
  budgetAmountMicros: 120_000_000,
  budgetResourceName,
  campaignId: "23870042807",
  campaignName: "IM | Search | Scripts",
  campaignResourceName,
  campaignStatus: "ENABLED",
  channel: "SEARCH",
  clicks: 400,
  contributionCents: 407_795 - 12_071 - 282_318,
  contributionMargin: 0.28,
  grossRevenueCents: 430_000,
  netRetainedRevenueCents: 407_795,
  orders: 134,
  refundCents: 20_000,
  refundedOrders: 6,
  refundRate: 6 / 134,
  serviceOrders: { scripts: 134 },
  spendCents: 282_318,
  stripeFeeCents: 12_071,
  targetRoas: 1.5,
  unavailableReasonCodes: [],
}

const rolling30Window = {
  endDate: "2026-09-19",
  endUtcExclusive: "2026-09-19T14:00:00.000Z",
  startDate: "2026-08-21",
  startUtc: "2026-08-20T14:00:00.000Z",
}

const snapshot = {
  daily: [campaign],
  generatedAt: "2026-09-19T23:05:00.000Z",
  inputs: {},
  reportDate: "2026-09-19",
  rolling30: [campaign],
  tracking: {
    evidenceAsOf: "2026-09-19T23:05:00.000Z",
    reasonCodes: [],
    scaleAllowed: true,
    state: "GREEN",
  },
  windows: { daily: rolling30Window, rolling30: rolling30Window },
} as unknown as AdsAgentSnapshot

const runRow = { id: "run-1", report_date: "2026-09-19", snapshot, status: "delivered" }

/** Query results in the reader's `.from()` call order: source run, latest run, three proposal reads, run history. */
function supabase(): SupabaseClient {
  const results: unknown[] = [
    { data: runRow, error: null },
    { data: runRow, error: null },
    { data: [], error: null },
    { data: [], error: null },
    { data: [], error: null },
    { data: [runRow], error: null },
  ]
  return { from: vi.fn(() => {
    const result = results.shift()
    const query: Record<string, unknown> = {
      maybeSingle: vi.fn(async () => result),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    for (const key of ["select", "eq", "in", "gte", "lte", "order", "limit"]) query[key] = vi.fn(() => query)
    return query
  }) } as unknown as SupabaseClient
}

function read() {
  return readScriptsScaleAuthorizationEvidence({
    budgetResourceName,
    campaignResourceName,
    liveMaterialChangeAt: null,
    runId: "run-1",
    service: "scripts",
    supabase: supabase(),
  })
}

describe("Scripts scale authorization reader: fresh financial evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("aborts instead of authorizing against the stored run's cash when the fresh financial read failed", async () => {
    vi.mocked(readFirstOrderCampaignEconomicsEvidence).mockResolvedValue({
      campaigns: [{ ...campaign, firstOrder: null }],
      financialFailures: new Map([[campaign.campaignId, "Customer growth revenue evidence is unavailable"]]),
    })
    await expect(read()).rejects.toThrow("scripts_scale_financial_evidence_unavailable")
    expect(readCampaignRepeatValue).not.toHaveBeenCalled()
  })

  it("keeps an identity or purchase-history gap advisory and still returns the evidence", async () => {
    vi.mocked(readFirstOrderCampaignEconomicsEvidence).mockResolvedValue({
      campaigns: [{ ...campaign, firstOrder: null }],
      financialFailures: new Map(),
    })
    const evidence = await read()
    expect(evidence?.snapshot.rolling30[0].firstOrder).toBeNull()
    expect(evidence?.firstOrderEvidence).toMatchObject({ range: rolling30Window, sourceRunId: "run-1" })
  })

  it("does not block the Scripts campaign for a financial failure on another campaign", async () => {
    const firstOrder = { contributionCents: 22_589, netRetainedRevenueCents: 313_470, orders: 97, stripeFeeCents: 8_563 }
    const other = {
      ...campaign,
      budgetResourceName: "customers/9205010513/campaignBudgets/other",
      campaignId: "other",
      campaignResourceName: "customers/9205010513/campaigns/other",
    }
    vi.mocked(readFirstOrderCampaignEconomicsEvidence).mockResolvedValue({
      campaigns: [{ ...campaign, firstOrder }, { ...other, firstOrder: null }],
      financialFailures: new Map([["other", "first_order_fees_unavailable"]]),
    })
    const evidence = await read()
    expect(evidence?.snapshot.rolling30[0].firstOrder).toMatchObject(firstOrder)
    expect(evidence?.snapshot.rolling30[1].firstOrder).toBeNull()
  })
})
