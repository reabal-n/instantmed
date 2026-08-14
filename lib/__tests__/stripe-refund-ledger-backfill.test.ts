import { describe, expect, it } from "vitest"

import {
  parseStripeRefundBackfillArgs,
  summarizeStripeRefundBackfill,
} from "@/lib/stripe/refund-ledger-backfill"

describe("Stripe refund ledger backfill safety", () => {
  it("is dry-run by default and requires a bounded explicit mode and window", () => {
    expect(parseStripeRefundBackfillArgs([
      "--mode=live",
      "--from=2026-05-01T00:00:00.000Z",
      "--to=2026-06-01T00:00:00.000Z",
    ])).toEqual({
      apply: false,
      fromEpochSeconds: 1777593600,
      fromIso: "2026-05-01T00:00:00.000Z",
      livemode: true,
      mode: "live",
      toEpochSeconds: 1780272000,
      toIso: "2026-06-01T00:00:00.000Z",
    })
  })

  it("rejects ambiguous, unknown, or over-broad reads", () => {
    expect(() => parseStripeRefundBackfillArgs([
      "--mode=live",
      "--from=2025-01-01T00:00:00.000Z",
      "--to=2026-06-01T00:00:00.000Z",
    ])).toThrow("366 days")
    expect(() => parseStripeRefundBackfillArgs([
      "--mode=live",
      "--from=2026-05-01",
      "--to=2026-06-01T00:00:00.000Z",
    ])).toThrow("timezone")
    expect(() => parseStripeRefundBackfillArgs([
      "--mode=live",
      "--from=2026-05-01T00:00:00.000Z",
      "--to=2026-06-01T00:00:00.000Z",
      "--refund-id=re_forbidden",
    ])).toThrow("Unknown argument")
  })

  it("emits aggregate-only evidence totals without durable identifiers", () => {
    const summary = summarizeStripeRefundBackfill({
      apply: false,
      fromIso: "2026-05-01T00:00:00.000Z",
      mode: "live",
      rows: [
        {
          amountCents: 995,
          cashAt: "2026-05-20T07:01:00.000Z",
          createdAt: "2026-05-20T06:58:52.000Z",
          currency: "aud",
          linkage: "linked",
          reversedAt: null,
          status: "succeeded",
        },
        {
          amountCents: 4000,
          cashAt: "2026-05-20T08:07:00.000Z",
          createdAt: "2026-05-20T08:06:26.000Z",
          currency: "aud",
          linkage: "ambiguous",
          reversedAt: null,
          status: "succeeded",
        },
        {
          amountCents: 500,
          cashAt: "2026-05-21T08:07:00.000Z",
          createdAt: "2026-05-21T08:06:26.000Z",
          currency: "nzd",
          linkage: "unlinked",
          reversedAt: "2026-05-25T09:10:11.000Z",
          status: "failed",
        },
      ],
      toIso: "2026-06-01T00:00:00.000Z",
    })

    expect(summary).toEqual({
      apply: false,
      cashMovementCount: 3,
      earliestRefundCashAt: "2026-05-20T07:01:00.000Z",
      earliestRefundCreatedAt: "2026-05-20T06:58:52.000Z",
      earliestRefundReversedAt: "2026-05-25T09:10:11.000Z",
      evidenceRowsAttempted: 3,
      from: "2026-05-01T00:00:00.000Z",
      latestRefundCashAt: "2026-05-21T08:07:00.000Z",
      latestRefundCreatedAt: "2026-05-21T08:06:26.000Z",
      latestRefundReversedAt: "2026-05-25T09:10:11.000Z",
      linkageCounts: { ambiguous: 1, linked: 1, unlinked: 1 },
      mode: "live",
      refundCount: 3,
      reversalCount: 1,
      statusCounts: { failed: 1, succeeded: 2 },
      succeededAmountCentsByCurrency: { aud: 4995 },
      succeededRefundCount: 2,
      to: "2026-06-01T00:00:00.000Z",
    })
    expect(JSON.stringify(summary)).not.toMatch(/(?:re_|pi_|ch_|intake)/)
  })
})
