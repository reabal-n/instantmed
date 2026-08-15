const DAY_MS = 24 * 60 * 60 * 1000
const MAX_BACKFILL_WINDOW_DAYS = 366

export type StripeRefundBackfillMode = "live" | "test"

export type StripeRefundBackfillOptions = {
  apply: boolean
  createdFromEpochSeconds: number
  createdFromExplicit: boolean
  createdFromIso: string
  fromEpochSeconds: number
  fromIso: string
  livemode: boolean
  mode: StripeRefundBackfillMode
  toEpochSeconds: number
  toIso: string
}

export type StripeRefundBackfillLinkage = "ambiguous" | "linked" | "unlinked"

export type StripeRefundBackfillSummaryRow = {
  amountCents: number
  cashAt: string | null
  createdAt: string
  currency: string
  linkage: StripeRefundBackfillLinkage
  reversedAt: string | null
  status: string | null
}

export type StripeRefundBackfillReconciliationResult = {
  legacyConstraintEvidenceOnlyCount: number
  reconciledIntakeCount: number
}

export function parseStripeRefundBackfillArgs(
  args: string[],
): StripeRefundBackfillOptions {
  const allowedFlags = new Set(["--apply"])
  const allowedValues = new Set(["--created-from", "--from", "--mode", "--to"])
  const values = new Map<string, string>()
  let apply = false

  const normalizedArgs = args[0] === "--" ? args.slice(1) : args
  for (const arg of normalizedArgs) {
    if (allowedFlags.has(arg)) {
      if (arg === "--apply") apply = true
      continue
    }

    const separator = arg.indexOf("=")
    const name = separator >= 0 ? arg.slice(0, separator) : arg
    if (!allowedValues.has(name) || separator < 0) {
      throw new Error(`Unknown argument: ${arg}`)
    }
    if (values.has(name)) {
      throw new Error(`Duplicate argument: ${name}`)
    }
    values.set(name, arg.slice(separator + 1))
  }

  const mode = values.get("--mode")
  if (mode !== "live" && mode !== "test") {
    throw new Error("--mode must be exactly live or test")
  }

  const from = parseBoundedIso("--from", values.get("--from"))
  const to = parseBoundedIso("--to", values.get("--to"))
  const createdFromExplicit = values.has("--created-from")
  const createdFrom = createdFromExplicit
    ? parseBoundedIso("--created-from", values.get("--created-from"))
    : from
  if (from >= to) {
    throw new Error("--from must be earlier than the exclusive --to bound")
  }
  if (to.getTime() - from.getTime() > MAX_BACKFILL_WINDOW_DAYS * DAY_MS) {
    throw new Error(`Backfill windows must not exceed ${MAX_BACKFILL_WINDOW_DAYS} days`)
  }
  if (createdFrom > from) {
    throw new Error("--created-from must be at or before the cash-event --from bound")
  }
  if (apply && !createdFromExplicit) {
    throw new Error("--apply requires explicit --created-from lifecycle coverage")
  }
  if (to.getTime() - createdFrom.getTime() > MAX_BACKFILL_WINDOW_DAYS * DAY_MS) {
    throw new Error(`Refund creation reads must not exceed ${MAX_BACKFILL_WINDOW_DAYS} days`)
  }

  return {
    apply,
    createdFromEpochSeconds: Math.floor(createdFrom.getTime() / 1000),
    createdFromExplicit,
    createdFromIso: createdFrom.toISOString(),
    fromEpochSeconds: Math.floor(from.getTime() / 1000),
    fromIso: from.toISOString(),
    livemode: mode === "live",
    mode,
    toEpochSeconds: Math.floor(to.getTime() / 1000),
    toIso: to.toISOString(),
  }
}

export function assertStripeRefundBackfillApplySafe(input: {
  apply: boolean
  rows: StripeRefundBackfillSummaryRow[]
}): void {
  if (!input.apply) return
  if (input.rows.some((row) => row.linkage !== "linked")) {
    throw new Error("Refund ledger apply requires every selected observation to link uniquely")
  }
  if (input.rows.some((row) =>
    !row.cashAt || !["succeeded", "failed", "canceled"].includes(row.status ?? ""),
  )) {
    throw new Error("Refund ledger apply rejects pending or unstable observations")
  }
  if (input.rows.some((row) => row.currency.toLowerCase() !== "aud")) {
    throw new Error("Refund ledger apply rejects non-AUD observations")
  }
}

export async function reconcileStripeRefundBackfill(input: {
  evidence: StripeRefundEvidenceRow[]
  livemode: boolean
  supabase: SupabaseClient
}): Promise<StripeRefundBackfillReconciliationResult> {
  const intakeIds = [...new Set(input.evidence.map((row) => row.intake_id))]
  if (intakeIds.some((id) => !id)) {
    throw new Error("Refund ledger reconciliation requires complete unique linkage")
  }

  let legacyConstraintEvidenceOnlyCount = 0
  let reconciledIntakeCount = 0
  for (const intakeId of intakeIds as string[]) {
    const { data, error } = await input.supabase.rpc("reconcile_intake_refund_cash_state", {
      p_intake_id: intakeId,
      p_livemode: input.livemode,
      p_trigger_status: null,
    })
    if (error) {
      if (
        isLegacyGeneralConsultConstraintError(error) &&
        await verifyLegacyGeneralConsultRefundState({
          evidence: input.evidence.filter((row) => row.intake_id === intakeId),
          intakeId,
          supabase: input.supabase,
        })
      ) {
        legacyConstraintEvidenceOnlyCount += 1
        continue
      }
      throw new Error("Refund backfill intake reconciliation failed")
    }
    const result = (data ?? {}) as { applied?: unknown; intake_id?: unknown }
    if (result.applied !== true || result.intake_id !== intakeId) {
      throw new Error("Refund backfill intake reconciliation returned incomplete evidence")
    }
    reconciledIntakeCount += 1
  }
  return { legacyConstraintEvidenceOnlyCount, reconciledIntakeCount }
}

function isLegacyGeneralConsultConstraintError(error: {
  code?: string
  message?: string
}): boolean {
  return error.code === "23514" &&
    error.message?.includes("intakes_consult_subtype_not_general") === true
}

async function verifyLegacyGeneralConsultRefundState(input: {
  evidence: StripeRefundEvidenceRow[]
  intakeId: string
  supabase: SupabaseClient
}): Promise<boolean> {
  const refundsById = new Map<string, StripeRefundEvidenceRow>()
  for (const row of input.evidence) {
    if (refundsById.has(row.stripe_refund_id)) return false
    refundsById.set(row.stripe_refund_id, row)
  }
  const outstanding = [...refundsById.values()].filter((row) =>
    row.refund_cash_at !== null && row.refund_reversed_at === null
  )
  if (outstanding.length === 0) return false

  const stateRead = await input.supabase
    .from("intakes")
    .select(
      "amount_cents, payment_status, priority_fee_refunded_at, " +
      "refund_amount_cents, refund_status",
    )
    .eq("id", input.intakeId)
    .maybeSingle()
  if (stateRead.error || !stateRead.data) return false

  const state = stateRead.data as unknown as {
    amount_cents: number | null
    payment_status: string | null
    priority_fee_refunded_at: string | null
    refund_amount_cents: number | null
    refund_status: string | null
  }
  if (!Number.isInteger(state.amount_cents) || (state.amount_cents ?? 0) <= 0) return false

  const outstandingCents = outstanding.reduce((sum, row) => sum + row.amount_cents, 0)
  const expectedRefundCents = Math.min(outstandingCents, state.amount_cents as number)
  const expectedPaymentStatus = expectedRefundCents >= (state.amount_cents as number)
    ? "refunded"
    : "partially_refunded"
  const latestPriorityRefund = outstanding
    .filter((row) => row.is_priority_fee_refund)
    .sort((left, right) =>
      Date.parse(right.refund_cash_at as string) - Date.parse(left.refund_cash_at as string)
    )[0]

  return state.payment_status === expectedPaymentStatus &&
    state.refund_status === "succeeded" &&
    state.refund_amount_cents === expectedRefundCents &&
    sameTimestamp(
      state.priority_fee_refunded_at,
      latestPriorityRefund?.refund_cash_at ?? null,
    )
}

function sameTimestamp(left: string | null, right: string | null): boolean {
  if (left === null || right === null) return left === right
  return Date.parse(left) === Date.parse(right)
}

export function isStripeRefundBackfillHelpRequest(args: string[]): boolean {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : args
  return normalizedArgs.length === 1 && normalizedArgs[0] === "--help"
}

export function summarizeStripeRefundBackfill(input: {
  apply: boolean
  createdFromIso?: string
  fromIso: string
  insertedCount?: number
  legacyConstraintEvidenceOnlyCount?: number
  reconciledIntakeCount?: number
  mode: StripeRefundBackfillMode
  rows: StripeRefundBackfillSummaryRow[]
  toIso: string
}) {
  const statusCounts: Record<string, number> = {}
  const succeededAmountCentsByCurrency: Record<string, number> = {}
  const linkageCounts: Record<StripeRefundBackfillLinkage, number> = {
    ambiguous: 0,
    linked: 0,
    unlinked: 0,
  }
  let earliestRefundCreatedAt: string | null = null
  let earliestRefundCashAt: string | null = null
  let earliestRefundReversedAt: string | null = null
  let latestRefundCreatedAt: string | null = null
  let latestRefundCashAt: string | null = null
  let latestRefundReversedAt: string | null = null
  let cashMovementCount = 0
  let reversalCount = 0
  let succeededRefundCount = 0

  for (const row of input.rows) {
    const status = row.status || "unknown"
    statusCounts[status] = (statusCounts[status] ?? 0) + 1
    linkageCounts[row.linkage] += 1
    if (!earliestRefundCreatedAt || row.createdAt < earliestRefundCreatedAt) {
      earliestRefundCreatedAt = row.createdAt
    }
    if (!latestRefundCreatedAt || row.createdAt > latestRefundCreatedAt) {
      latestRefundCreatedAt = row.createdAt
    }
    if (row.cashAt) {
      cashMovementCount += 1
      if (!earliestRefundCashAt || row.cashAt < earliestRefundCashAt) {
        earliestRefundCashAt = row.cashAt
      }
      if (!latestRefundCashAt || row.cashAt > latestRefundCashAt) {
        latestRefundCashAt = row.cashAt
      }
    }
    if (row.reversedAt) {
      reversalCount += 1
      if (!earliestRefundReversedAt || row.reversedAt < earliestRefundReversedAt) {
        earliestRefundReversedAt = row.reversedAt
      }
      if (!latestRefundReversedAt || row.reversedAt > latestRefundReversedAt) {
        latestRefundReversedAt = row.reversedAt
      }
    }
    if (status === "succeeded") {
      succeededRefundCount += 1
      const currency = row.currency.toLowerCase()
      succeededAmountCentsByCurrency[currency] =
        (succeededAmountCentsByCurrency[currency] ?? 0) + row.amountCents
    }
  }

  return {
    apply: input.apply,
    cashMovementCount,
    createdFrom: input.createdFromIso ?? input.fromIso,
    earliestRefundCashAt,
    earliestRefundCreatedAt,
    earliestRefundReversedAt,
    evidenceRowsAttempted: input.rows.length,
    from: input.fromIso,
    ...(input.insertedCount === undefined ? {} : { evidenceRowsInserted: input.insertedCount }),
    ...(input.legacyConstraintEvidenceOnlyCount === undefined
      ? {}
      : { legacyConstraintEvidenceOnlyCount: input.legacyConstraintEvidenceOnlyCount }),
    ...(input.reconciledIntakeCount === undefined
      ? {}
      : { reconciledIntakeCount: input.reconciledIntakeCount }),
    latestRefundCashAt,
    latestRefundCreatedAt,
    latestRefundReversedAt,
    linkageCounts,
    mode: input.mode,
    refundCount: input.rows.length,
    reversalCount,
    statusCounts,
    succeededAmountCentsByCurrency,
    succeededRefundCount,
    to: input.toIso,
  }
}

function parseBoundedIso(
  name: "--created-from" | "--from" | "--to",
  value: string | undefined,
): Date {
  if (!value) throw new Error(`${name} is required`)
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error(`${name} must include an explicit timezone`)
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${name} must be a valid ISO timestamp`)
  }
  return parsed
}
import type { SupabaseClient } from "@supabase/supabase-js"

import type { StripeRefundEvidenceRow } from "@/lib/stripe/refund-event-ledger"
