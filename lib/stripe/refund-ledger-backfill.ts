const DAY_MS = 24 * 60 * 60 * 1000
const MAX_BACKFILL_WINDOW_DAYS = 366

export type StripeRefundBackfillMode = "live" | "test"

export type StripeRefundBackfillOptions = {
  apply: boolean
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

export function parseStripeRefundBackfillArgs(
  args: string[],
): StripeRefundBackfillOptions {
  const allowedFlags = new Set(["--apply"])
  const allowedValues = new Set(["--from", "--mode", "--to"])
  const values = new Map<string, string>()
  let apply = false

  for (const arg of args) {
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
  if (from >= to) {
    throw new Error("--from must be earlier than the exclusive --to bound")
  }
  if (to.getTime() - from.getTime() > MAX_BACKFILL_WINDOW_DAYS * DAY_MS) {
    throw new Error(`Backfill windows must not exceed ${MAX_BACKFILL_WINDOW_DAYS} days`)
  }

  return {
    apply,
    fromEpochSeconds: Math.floor(from.getTime() / 1000),
    fromIso: from.toISOString(),
    livemode: mode === "live",
    mode,
    toEpochSeconds: Math.floor(to.getTime() / 1000),
    toIso: to.toISOString(),
  }
}

export function summarizeStripeRefundBackfill(input: {
  apply: boolean
  fromIso: string
  insertedCount?: number
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
    earliestRefundCashAt,
    earliestRefundCreatedAt,
    earliestRefundReversedAt,
    evidenceRowsAttempted: input.rows.length,
    from: input.fromIso,
    ...(input.insertedCount === undefined ? {} : { evidenceRowsInserted: input.insertedCount }),
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

function parseBoundedIso(name: "--from" | "--to", value: string | undefined): Date {
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
