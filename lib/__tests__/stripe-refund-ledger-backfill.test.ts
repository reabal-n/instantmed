import { spawnSync } from "node:child_process"

import { describe, expect, it, vi } from "vitest"

import {
  assertStripeRefundBackfillApplySafe,
  parseStripeRefundBackfillArgs,
  reconcileStripeRefundBackfill,
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
      createdFromEpochSeconds: 1777593600,
      createdFromExplicit: false,
      createdFromIso: "2026-05-01T00:00:00.000Z",
      fromEpochSeconds: 1777593600,
      fromIso: "2026-05-01T00:00:00.000Z",
      livemode: true,
      mode: "live",
      toEpochSeconds: 1780272000,
      toIso: "2026-06-01T00:00:00.000Z",
    })
  })

  it("requires explicit creation coverage and stable unique linkage before apply", () => {
    expect(() => parseStripeRefundBackfillArgs([
      "--apply",
      "--mode=live",
      "--from=2026-05-01T00:00:00.000Z",
      "--to=2026-06-01T00:00:00.000Z",
    ])).toThrow("explicit --created-from")

    expect(parseStripeRefundBackfillArgs([
      "--apply",
      "--mode=live",
      "--created-from=2026-04-01T00:00:00.000Z",
      "--from=2026-05-01T00:00:00.000Z",
      "--to=2026-06-01T00:00:00.000Z",
    ])).toMatchObject({
      apply: true,
      createdFromExplicit: true,
      createdFromIso: "2026-04-01T00:00:00.000Z",
    })

    expect(() => assertStripeRefundBackfillApplySafe({
      apply: true,
      rows: [{
        amountCents: 995,
        cashAt: "2026-05-20T07:01:00.000Z",
        createdAt: "2026-05-20T06:58:52.000Z",
        currency: "aud",
        linkage: "unlinked",
        reversedAt: null,
        status: "succeeded",
      }],
    })).toThrow("link uniquely")
    expect(() => assertStripeRefundBackfillApplySafe({
      apply: true,
      rows: [{
        amountCents: 995,
        cashAt: "2026-05-20T07:01:00.000Z",
        createdAt: "2026-05-20T06:58:52.000Z",
        currency: "aud",
        linkage: "linked",
        reversedAt: null,
        status: "pending",
      }],
    })).toThrow("pending or unstable")
    expect(() => assertStripeRefundBackfillApplySafe({
      apply: true,
      rows: [{
        amountCents: 995,
        cashAt: "2026-05-20T07:01:00.000Z",
        createdAt: "2026-05-20T06:58:52.000Z",
        currency: "nzd",
        linkage: "linked",
        reversedAt: null,
        status: "succeeded",
      }],
    })).toThrow("non-AUD")
  })

  it("reconciles a complete succeeded-to-failed history once per linked intake", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { applied: true, intake_id: "intake-1" },
      error: null,
    })
    const shared = {
      amount_cents: 995,
      balance_transaction_id: "txn-refund",
      charge_id: "charge-1",
      currency: "aud",
      evidence_source: "refund.list.backfill" as const,
      failure_balance_transaction_id: null,
      intake_id: "intake-1",
      is_priority_fee_refund: false,
      livemode: true,
      payment_intent_id: "pi-1",
      refund_cash_at: "2026-05-20T07:01:00.000Z",
      refund_created_at: "2026-05-20T06:58:52.000Z",
      refund_reversed_at: null,
      stripe_event_created_at: null,
      stripe_event_id: null,
      stripe_refund_id: "refund-1",
    }

    await expect(reconcileStripeRefundBackfill({
      evidence: [
        {
          ...shared,
          evidence_key: "live:refund:refund-1:observation:txn-refund:none:succeeded",
          refund_status: "succeeded",
        },
        {
          ...shared,
          evidence_key: "live:refund:refund-1:observation:txn-refund:txn-failure:failed",
          failure_balance_transaction_id: "txn-failure",
          refund_reversed_at: "2026-05-22T08:00:00.000Z",
          refund_status: "failed",
        },
      ],
      livemode: true,
      supabase: { rpc } as never,
    })).resolves.toBe(1)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith("reconcile_intake_refund_cash_state", {
      p_intake_id: "intake-1",
      p_livemode: true,
      p_trigger_status: null,
    })
  })

  it("accepts exactly one conventional package-manager argument separator", () => {
    expect(parseStripeRefundBackfillArgs([
      "--",
      "--mode=test",
      "--from=2026-05-01T00:00:00.000Z",
      "--to=2026-06-01T00:00:00.000Z",
    ])).toMatchObject({ apply: false, mode: "test" })

    expect(() => parseStripeRefundBackfillArgs([
      "--",
      "--",
      "--mode=test",
      "--from=2026-05-01T00:00:00.000Z",
      "--to=2026-06-01T00:00:00.000Z",
    ])).toThrow("Unknown argument")
  })

  it("runs the documented pnpm separator shape through the real CLI", () => {
    const result = spawnSync(
      "corepack",
      [
        "pnpm",
        "exec",
        "tsx",
        "scripts/backfill-stripe-refund-events.ts",
        "--",
        "--help",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, STRIPE_SECRET_KEY: "" },
      },
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("pnpm stripe:refund-ledger:backfill -- --mode=<live|test>")
    expect(result.stderr).toBe("")
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
      createdFrom: "2026-05-01T00:00:00.000Z",
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
