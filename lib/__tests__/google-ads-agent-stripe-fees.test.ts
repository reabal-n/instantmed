import type { SupabaseClient } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getStripeFeeMap } from "@/lib/ads-agent/stripe-fees"
import { stripe } from "@/lib/stripe/client"

interface IntakeFeeCacheRow {
  id: string
  stripe_balance_transaction_id: string | null
  stripe_fee_cents: number | null
  stripe_fee_synced_at: string | null
  stripe_payment_intent_id: string | null
}

function makeSupabase(options: {
  rows?: IntakeFeeCacheRow[]
  selectError?: { message: string } | null
  updateError?: { message: string } | null
}) {
  const updates: Array<{ intakeId: string; values: Record<string, unknown> }> = []
  const selectIn = vi.fn(async () => ({
    data: options.rows ?? [],
    error: options.selectError ?? null,
  }))

  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      in: selectIn,
    })),
    update: vi.fn((values: Record<string, unknown>) => {
      const filters: Record<string, string> = {}
      const updateChain = {
        eq: vi.fn((column: string, value: string) => {
          filters[column] = value
          return updateChain
        }),
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => {
            updates.push({
              intakeId: filters.id ?? "",
              values,
            })
            return {
              data: options.updateError ? null : { id: filters.id },
              error: options.updateError ?? null,
            }
          }),
        })),
      }
      return updateChain
    }),
  }))

  return {
    client: { from } as unknown as SupabaseClient,
    selectIn,
    updates,
  }
}

function expandedPaymentIntent(
  paymentIntentId: string,
  feeCents: number,
  balanceTransactionId = `txn_${paymentIntentId}`,
) {
  return {
    id: paymentIntentId,
    latest_charge: {
      id: `ch_${paymentIntentId}`,
      balance_transaction: {
        id: balanceTransactionId,
        fee: feeCents,
      },
    },
  }
}

describe("Google Ads Agent Stripe fee truth", () => {
  beforeEach(() => {
    vi.mocked(stripe.paymentIntents.retrieve).mockReset()
  })

  it("uses a durable cached fee without calling Stripe", async () => {
    const supabase = makeSupabase({
      rows: [{
        id: "intake-cached",
        stripe_balance_transaction_id: "txn_cached",
        stripe_fee_cents: 103,
        stripe_fee_synced_at: "2026-07-27T00:00:00.000Z",
        stripe_payment_intent_id: "pi_cached",
      }],
    })

    const result = await getStripeFeeMap({
      intakes: [{ id: "intake-cached", stripePaymentIntentId: "pi_cached" }],
      supabase: supabase.client,
    })

    expect(result.get("intake-cached")).toEqual({
      status: "available",
      feeCents: 103,
      source: "cache",
    })
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
    expect(supabase.updates).toEqual([])
  })

  it("fetches an expanded balance transaction and durably caches the fee", async () => {
    const supabase = makeSupabase({
      rows: [{
        id: "intake-live",
        stripe_balance_transaction_id: null,
        stripe_fee_cents: null,
        stripe_fee_synced_at: null,
        stripe_payment_intent_id: "pi_live",
      }],
    })
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue(
      expandedPaymentIntent("pi_live", 174, "txn_live") as never,
    )

    const result = await getStripeFeeMap({
      intakes: [{ id: "intake-live", stripePaymentIntentId: "pi_live" }],
      supabase: supabase.client,
    })

    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_live", {
      expand: ["latest_charge.balance_transaction"],
    })
    expect(supabase.updates).toHaveLength(1)
    expect(supabase.updates[0]).toMatchObject({
      intakeId: "intake-live",
      values: {
        stripe_balance_transaction_id: "txn_live",
        stripe_fee_cents: 174,
      },
    })
    expect(supabase.updates[0].values.stripe_fee_synced_at).toEqual(expect.any(String))
    expect(result.get("intake-live")).toEqual({
      status: "available",
      feeCents: 174,
      source: "stripe",
    })
  })

  it("marks a missing PaymentIntent as unavailable instead of zero", async () => {
    const supabase = makeSupabase({ rows: [] })

    const result = await getStripeFeeMap({
      intakes: [{ id: "intake-missing", stripePaymentIntentId: null }],
      supabase: supabase.client,
    })

    expect(result.get("intake-missing")).toEqual({
      status: "unavailable",
      reason: "missing_payment_intent",
    })
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
  })

  it("does not call Stripe when there is no authoritative intake row to cache", async () => {
    const supabase = makeSupabase({ rows: [] })

    const result = await getStripeFeeMap({
      intakes: [{ id: "intake-no-row", stripePaymentIntentId: "pi_no_row" }],
      supabase: supabase.client,
    })

    expect(result.get("intake-no-row")).toEqual({
      status: "unavailable",
      reason: "intake_cache_row_missing",
    })
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
  })

  it("rejects a cache row for a stale PaymentIntent", async () => {
    const supabase = makeSupabase({
      rows: [{
        id: "intake-stale",
        stripe_balance_transaction_id: null,
        stripe_fee_cents: null,
        stripe_fee_synced_at: null,
        stripe_payment_intent_id: "pi_replaced",
      }],
    })

    const result = await getStripeFeeMap({
      intakes: [{ id: "intake-stale", stripePaymentIntentId: "pi_current" }],
      supabase: supabase.client,
    })

    expect(result.get("intake-stale")).toEqual({
      status: "unavailable",
      reason: "payment_intent_mismatch",
    })
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
    expect(supabase.updates).toEqual([])
  })

  it("marks Stripe retrieval failures as unavailable instead of zero", async () => {
    const supabase = makeSupabase({
      rows: [{
        id: "intake-failed",
        stripe_balance_transaction_id: null,
        stripe_fee_cents: null,
        stripe_fee_synced_at: null,
        stripe_payment_intent_id: "pi_failed",
      }],
    })
    vi.mocked(stripe.paymentIntents.retrieve).mockRejectedValue(
      new Error("Stripe unavailable"),
    )

    const result = await getStripeFeeMap({
      intakes: [{ id: "intake-failed", stripePaymentIntentId: "pi_failed" }],
      supabase: supabase.client,
    })

    expect(result.get("intake-failed")).toEqual({
      status: "unavailable",
      reason: "stripe_fee_lookup_failed",
    })
  })

  it("requires the expanded balance transaction and a durable cache write", async () => {
    const missingExpansion = makeSupabase({
      rows: [{
        id: "intake-unexpanded",
        stripe_balance_transaction_id: null,
        stripe_fee_cents: null,
        stripe_fee_synced_at: null,
        stripe_payment_intent_id: "pi_unexpanded",
      }],
    })
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
      id: "pi_unexpanded",
      latest_charge: "ch_unexpanded",
    } as never)

    const missingExpansionResult = await getStripeFeeMap({
      intakes: [{ id: "intake-unexpanded", stripePaymentIntentId: "pi_unexpanded" }],
      supabase: missingExpansion.client,
    })

    expect(missingExpansionResult.get("intake-unexpanded")).toEqual({
      status: "unavailable",
      reason: "stripe_fee_unavailable",
    })

    const failedWrite = makeSupabase({
      rows: [{
        id: "intake-write",
        stripe_balance_transaction_id: null,
        stripe_fee_cents: null,
        stripe_fee_synced_at: null,
        stripe_payment_intent_id: "pi_write",
      }],
      updateError: { message: "write failed" },
    })
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue(
      expandedPaymentIntent("pi_write", 145) as never,
    )

    const failedWriteResult = await getStripeFeeMap({
      intakes: [{ id: "intake-write", stripePaymentIntentId: "pi_write" }],
      supabase: failedWrite.client,
    })

    expect(failedWriteResult.get("intake-write")).toEqual({
      status: "unavailable",
      reason: "stripe_fee_cache_write_failed",
    })
  })

  it("fails closed when the fee cache query fails", async () => {
    const supabase = makeSupabase({
      selectError: { message: "query failed" },
    })

    const result = await getStripeFeeMap({
      intakes: [{ id: "intake-query", stripePaymentIntentId: "pi_query" }],
      supabase: supabase.client,
    })

    expect(result.get("intake-query")).toEqual({
      status: "unavailable",
      reason: "stripe_fee_cache_query_failed",
    })
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
  })

  it("limits live Stripe reads to five concurrent requests", async () => {
    const supabase = makeSupabase({
      rows: Array.from({ length: 12 }, (_, index) => ({
        id: `intake-${index}`,
        stripe_balance_transaction_id: null,
        stripe_fee_cents: null,
        stripe_fee_synced_at: null,
        stripe_payment_intent_id: `pi_${index}`,
      })),
    })
    let active = 0
    let maxActive = 0

    vi.mocked(stripe.paymentIntents.retrieve).mockImplementation(async (id) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return expandedPaymentIntent(String(id), 100) as never
    })

    const intakes = Array.from({ length: 12 }, (_, index) => ({
      id: `intake-${index}`,
      stripePaymentIntentId: `pi_${index}`,
    }))

    const result = await getStripeFeeMap({
      intakes,
      supabase: supabase.client,
    })

    expect(result).toHaveLength(12)
    expect(maxActive).toBe(5)
  })
})
