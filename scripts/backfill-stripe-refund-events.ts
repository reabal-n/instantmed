import path from "node:path"
import { pathToFileURL } from "node:url"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import Stripe from "stripe"

import {
  buildStripeRefundBackfillEvidence,
  hasSameStripeRefundEvidence,
  STRIPE_REFUND_EVIDENCE_SELECT,
  type StripeRefundEvidenceRow,
} from "@/lib/stripe/refund-event-ledger"
import {
  assertStripeRefundBackfillApplySafe,
  isStripeRefundBackfillHelpRequest,
  parseStripeRefundBackfillArgs,
  reconcileStripeRefundBackfill,
  type StripeRefundBackfillLinkage,
  type StripeRefundBackfillOptions,
  type StripeRefundBackfillSummaryRow,
  summarizeStripeRefundBackfill,
} from "@/lib/stripe/refund-ledger-backfill"

/**
 * Exact historical refund evidence reader. Dry-run is the default:
 *
 *   pnpm stripe:refund-ledger:backfill -- \
 *     --mode=live \
 *     --created-from=2026-01-01T00:00:00.000Z \
 *     --from=2026-01-01T00:00:00.000Z \
 *     --to=2026-07-01T00:00:00.000Z
 *
 * Add `--apply` only after reviewing the aggregate-only dry-run. `--to` is
 * exclusive, windows are capped at 366 days, and writes are insert-only plus
 * conflict-ignore so an interrupted apply can be rerun safely. No Stripe money
 * mutation is available in this script, and no durable identifiers are printed.
 */
const READ_BATCH_SIZE = 200
const WRITE_BATCH_SIZE = 200
let failureStage = "initialization"

type IntakeLink = {
  id: string
  stripe_payment_intent_id: string | null
}

type RefundWithLink = {
  evidence: StripeRefundEvidenceRow
  summary: StripeRefundBackfillSummaryRow
}

async function main(): Promise<void> {
  const cliArgs = process.argv.slice(2)
  if (isStripeRefundBackfillHelpRequest(cliArgs)) {
    process.stdout.write(
      "Usage: pnpm stripe:refund-ledger:backfill -- --mode=<live|test> " +
      "--created-from=<Refund.created ISO timestamp> --from=<cash ISO timestamp> " +
      "--to=<exclusive cash ISO timestamp> [--apply]\n",
    )
    return
  }
  loadEnvironment()
  const options = parseStripeRefundBackfillArgs(cliArgs)
  const stripeSecretKey = requiredEnvironment("STRIPE_SECRET_KEY")
  assertStripeMode(stripeSecretKey, options.mode)
  const supabase = createSupabaseClient()
  const stripe = new Stripe(stripeSecretKey, {
    maxNetworkRetries: 2,
    timeout: 15_000,
  })

  failureStage = "read_target_window"
  const refunds = await readExactRefunds(stripe, options)
  failureStage = "link_target_window"
  const intakeIdsByPaymentIntent = await readIntakeLinks(supabase, refunds)
  const linkedRefunds = refunds
    .map((refund) => linkRefund(refund, options, intakeIdsByPaymentIntent))
    .filter((row) => isMovementWithinTargetWindow(row.summary, options))
  let insertedCount: number | undefined
  let legacyConstraintEvidenceOnlyCount: number | undefined
  let reconciledIntakeCount: number | undefined
  if (options.apply) {
    failureStage = "validate_charge_identity"
    const chargeIds = [...new Set(linkedRefunds.map((row) => row.evidence.charge_id))]
    if (chargeIds.some((chargeId) => !chargeId)) {
      throw new Error("Refund ledger apply requires a durable Charge identity")
    }
    failureStage = "read_complete_charge_lifecycle"
    const completeRefunds = await readCompleteChargeRefunds(
      stripe,
      chargeIds as string[],
    )
    failureStage = "link_complete_charge_lifecycle"
    const completeLinks = await readIntakeLinks(supabase, completeRefunds)
    const completeLinkedRefunds = completeRefunds.map((refund) =>
      linkRefund(refund, options, completeLinks),
    )
    failureStage = "validate_complete_charge_lifecycle"
    assertStripeRefundBackfillApplySafe({
      apply: true,
      rows: completeLinkedRefunds.map((row) => row.summary),
    })
    const completeEvidence = completeLinkedRefunds.map((row) => row.evidence)
    failureStage = "insert_exact_evidence"
    insertedCount = await insertEvidence(supabase, completeEvidence)
    failureStage = "reconcile_intake_cash_state"
    const reconciliation = await reconcileStripeRefundBackfill({
      evidence: completeEvidence,
      livemode: options.livemode,
      supabase,
    })
    legacyConstraintEvidenceOnlyCount = reconciliation.legacyConstraintEvidenceOnlyCount
    reconciledIntakeCount = reconciliation.reconciledIntakeCount
  }
  failureStage = "summarize"
  const summary = summarizeStripeRefundBackfill({
    apply: options.apply,
    createdFromIso: options.createdFromIso,
    fromIso: options.fromIso,
    insertedCount,
    legacyConstraintEvidenceOnlyCount,
    mode: options.mode,
    rows: linkedRefunds.map((row) => row.summary),
    reconciledIntakeCount,
    toIso: options.toIso,
  })

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

async function readCompleteChargeRefunds(
  stripe: Stripe,
  chargeIds: string[],
): Promise<Stripe.Refund[]> {
  const refundsById = new Map<string, Stripe.Refund>()
  for (const chargeId of chargeIds) {
    const page = await stripe.refunds.list({
      charge: chargeId,
      expand: [
        "data.balance_transaction",
        "data.failure_balance_transaction",
      ],
      limit: 100,
    })
    if (page.has_more) {
      throw new Error("Refund ledger apply exceeds the bounded per-charge lifecycle read")
    }
    for (const refund of page.data) refundsById.set(refund.id, refund)
  }
  return [...refundsById.values()]
}

function loadEnvironment(): void {
  dotenv.config({
    path: path.join(process.cwd(), ".env.local"),
    override: false,
    quiet: true,
  })
  dotenv.config({
    path: path.join(process.cwd(), ".env"),
    override: false,
    quiet: true,
  })
}

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY")
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function readExactRefunds(
  stripe: Stripe,
  options: StripeRefundBackfillOptions,
): Promise<Stripe.Refund[]> {
  const refunds: Stripe.Refund[] = []
  for await (const refund of stripe.refunds.list({
    created: {
      gte: options.createdFromEpochSeconds,
      lt: options.toEpochSeconds,
    },
    expand: [
      "data.balance_transaction",
      "data.failure_balance_transaction",
    ],
    limit: 100,
  })) {
    refunds.push(refund)
  }
  return refunds
}

function isMovementWithinTargetWindow(
  row: StripeRefundBackfillSummaryRow,
  options: StripeRefundBackfillOptions,
): boolean {
  return [row.cashAt, row.reversedAt].some((value) => {
    if (!value) return false
    const timestamp = Date.parse(value)
    return timestamp >= options.fromEpochSeconds * 1000 &&
      timestamp < options.toEpochSeconds * 1000
  })
}

async function readIntakeLinks(
  supabase: SupabaseClient,
  refunds: Stripe.Refund[],
): Promise<Map<string, string[]>> {
  const paymentIntentIds = [...new Set(refunds.flatMap((refund) => {
    const paymentIntentId = stripeId(refund.payment_intent)
    return paymentIntentId ? [paymentIntentId] : []
  }))]
  const idsByPaymentIntent = new Map<string, string[]>()

  for (const batch of chunks(paymentIntentIds, READ_BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("intakes")
      .select("id, stripe_payment_intent_id")
      .in("stripe_payment_intent_id", batch)
    if (error) throw new Error("Refund backfill intake-link read failed")

    for (const row of (data ?? []) as IntakeLink[]) {
      if (!row.stripe_payment_intent_id) continue
      const ids = idsByPaymentIntent.get(row.stripe_payment_intent_id) ?? []
      ids.push(row.id)
      idsByPaymentIntent.set(row.stripe_payment_intent_id, ids)
    }
  }

  return idsByPaymentIntent
}

function linkRefund(
  refund: Stripe.Refund,
  options: StripeRefundBackfillOptions,
  intakeIdsByPaymentIntent: Map<string, string[]>,
): RefundWithLink {
  const paymentIntentId = stripeId(refund.payment_intent)
  const intakeIds = paymentIntentId
    ? intakeIdsByPaymentIntent.get(paymentIntentId) ?? []
    : []
  const linkage: StripeRefundBackfillLinkage = intakeIds.length === 1
    ? "linked"
    : intakeIds.length > 1
      ? "ambiguous"
      : "unlinked"
  const evidence = buildStripeRefundBackfillEvidence({
    intakeId: linkage === "linked" ? intakeIds[0] : null,
    livemode: options.livemode,
    refund,
  })
  if (!evidence) throw new Error("Stripe returned an invalid refund object")

  return {
    evidence,
    summary: {
      amountCents: refund.amount,
      cashAt: evidence.refund_cash_at,
      createdAt: evidence.refund_created_at,
      currency: evidence.currency,
      linkage,
      reversedAt: evidence.refund_reversed_at,
      status: evidence.refund_status,
    },
  }
}

async function insertEvidence(
  supabase: SupabaseClient,
  rows: StripeRefundEvidenceRow[],
): Promise<number> {
  let insertedCount = 0
  for (const batch of chunks(rows, WRITE_BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("stripe_refund_events")
      .upsert(batch, { ignoreDuplicates: true, onConflict: "evidence_key" })
      .select("id")
    if (error) throw new Error("Refund backfill evidence insert failed")
    insertedCount += data?.length ?? 0
    const verification = await supabase
      .from("stripe_refund_events")
      .select(STRIPE_REFUND_EVIDENCE_SELECT)
      .in("evidence_key", batch.map((row) => row.evidence_key))
    if (verification.error) {
      throw new Error("Refund backfill evidence verification failed")
    }
    const persistedByKey = new Map(
      ((verification.data ?? []) as unknown as StripeRefundEvidenceRow[])
        .map((row) => [row.evidence_key, row]),
    )
    if (batch.some((row) => !hasSameStripeRefundEvidence(
      row,
      persistedByKey.get(row.evidence_key),
    ))) {
      throw new Error("Refund backfill evidence conflicts with an immutable observation")
    }
  }
  return insertedCount
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment: ${name}`)
  return value
}

function assertStripeMode(
  secretKey: string,
  mode: StripeRefundBackfillOptions["mode"],
): void {
  const keyMode = /^(?:sk|rk)_live_/.test(secretKey)
    ? "live"
    : /^(?:sk|rk)_test_/.test(secretKey)
      ? "test"
      : null
  if (!keyMode || keyMode !== mode) {
    throw new Error("STRIPE_SECRET_KEY mode does not match the explicit --mode")
  }
}

function stripeId(value: { id: string } | string | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null
}

function chunks<T>(values: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size))
  }
  return batches
}

const entryPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null
if (entryPath === import.meta.url) {
  main().catch(() => {
    process.stderr.write(
      `Stripe refund ledger backfill failed at ${failureStage}; no identifiers were printed. ` +
      "An --apply run may have inserted earlier append-only batches and is safe to rerun.\n",
    )
    process.exitCode = 1
  })
}
