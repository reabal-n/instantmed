import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { stripe } from "@/lib/stripe/client"

const STRIPE_FEE_LOOKUP_CONCURRENCY = 5

interface StripeFeeIntake {
  id: string
  stripePaymentIntentId: string | null
}

interface PaymentFeeCacheRow {
  id: string
  intake_id: string | null
  stripe_balance_transaction_id: string | null
  stripe_fee_cents: number | null
  stripe_fee_synced_at: string | null
  stripe_payment_intent_id: string | null
}

interface FeeLookupWork {
  intake: StripeFeeIntake
  paymentRowId: string
}

export type StripeFeeResult =
  | { status: "available"; feeCents: number; source: "cache" | "stripe" }
  | { status: "unavailable"; reason: string }

function unavailable(reason: string): StripeFeeResult {
  return { status: "unavailable", reason }
}

function hasDurableCachedFee(row: PaymentFeeCacheRow): boolean {
  return (
    Number.isSafeInteger(row.stripe_fee_cents) &&
    (row.stripe_fee_cents ?? -1) >= 0 &&
    typeof row.stripe_balance_transaction_id === "string" &&
    row.stripe_balance_transaction_id.length > 0 &&
    typeof row.stripe_fee_synced_at === "string" &&
    Number.isFinite(Date.parse(row.stripe_fee_synced_at))
  )
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0
  const workerCount = Math.min(concurrency, items.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex]
        nextIndex += 1
        await worker(item)
      }
    }),
  )
}

async function fetchAndCacheStripeFee(args: {
  result: Map<string, StripeFeeResult>
  supabase: SupabaseClient
  work: FeeLookupWork
}): Promise<void> {
  const { intake } = args.work
  const paymentIntentId = intake.stripePaymentIntentId
  if (!paymentIntentId) {
    args.result.set(intake.id, unavailable("missing_payment_intent"))
    return
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge.balance_transaction"],
    })
    const charge = paymentIntent.latest_charge
    const balanceTransaction =
      charge && typeof charge !== "string"
        ? charge.balance_transaction
        : null

    if (
      !balanceTransaction ||
      typeof balanceTransaction === "string" ||
      typeof balanceTransaction.id !== "string" ||
      balanceTransaction.id.length === 0 ||
      !Number.isSafeInteger(balanceTransaction.fee) ||
      balanceTransaction.fee < 0
    ) {
      args.result.set(intake.id, unavailable("stripe_fee_unavailable"))
      return
    }

    const syncedAt = new Date().toISOString()
    const { data, error } = await args.supabase
      .from("payments")
      .update({
        stripe_balance_transaction_id: balanceTransaction.id,
        stripe_fee_cents: balanceTransaction.fee,
        stripe_fee_synced_at: syncedAt,
      })
      .eq("id", args.work.paymentRowId)
      .eq("stripe_payment_intent_id", paymentIntentId)
      .select("id")
      .maybeSingle()

    if (error || !data) {
      args.result.set(intake.id, unavailable("stripe_fee_cache_write_failed"))
      return
    }

    args.result.set(intake.id, {
      status: "available",
      feeCents: balanceTransaction.fee,
      source: "stripe",
    })
  } catch {
    args.result.set(intake.id, unavailable("stripe_fee_lookup_failed"))
  }
}

/**
 * Return actual Stripe fees per intake. Cache misses are resolved from the
 * expanded BalanceTransaction and become available only after a durable,
 * current-PaymentIntent cache write succeeds.
 */
export async function getStripeFeeMap(args: {
  intakes: StripeFeeIntake[]
  supabase: SupabaseClient
}): Promise<Map<string, StripeFeeResult>> {
  const result = new Map<string, StripeFeeResult>()
  const uniqueIntakes = Array.from(
    new Map(args.intakes.map((intake) => [intake.id, intake])).values(),
  )

  for (const intake of uniqueIntakes) {
    if (!intake.stripePaymentIntentId) {
      result.set(intake.id, unavailable("missing_payment_intent"))
    }
  }

  const withPaymentIntents = uniqueIntakes.filter(
    (intake): intake is StripeFeeIntake & { stripePaymentIntentId: string } =>
      Boolean(intake.stripePaymentIntentId),
  )
  if (withPaymentIntents.length === 0) {
    return result
  }

  const { data, error } = await args.supabase
    .from("payments")
    .select(
      "id, intake_id, stripe_payment_intent_id, stripe_balance_transaction_id, stripe_fee_cents, stripe_fee_synced_at",
    )
    .in("intake_id", withPaymentIntents.map((intake) => intake.id))

  if (error) {
    for (const intake of withPaymentIntents) {
      result.set(intake.id, unavailable("stripe_fee_cache_query_failed"))
    }
    return result
  }

  const rows = (data ?? []) as PaymentFeeCacheRow[]
  const work: FeeLookupWork[] = []

  for (const intake of withPaymentIntents) {
    const matchingRows = rows.filter(
      (row) =>
        row.intake_id === intake.id &&
        row.stripe_payment_intent_id === intake.stripePaymentIntentId,
    )

    if (matchingRows.length === 0) {
      result.set(intake.id, unavailable("payment_cache_row_missing"))
      continue
    }
    if (matchingRows.length > 1) {
      result.set(intake.id, unavailable("payment_cache_row_ambiguous"))
      continue
    }

    const [paymentRow] = matchingRows
    if (hasDurableCachedFee(paymentRow)) {
      result.set(intake.id, {
        status: "available",
        feeCents: paymentRow.stripe_fee_cents as number,
        source: "cache",
      })
      continue
    }

    work.push({
      intake,
      paymentRowId: paymentRow.id,
    })
  }

  await runWithConcurrency(
    work,
    STRIPE_FEE_LOOKUP_CONCURRENCY,
    async (item) => fetchAndCacheStripeFee({
      result,
      supabase: args.supabase,
      work: item,
    }),
  )

  return result
}
