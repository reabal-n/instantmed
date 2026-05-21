import { groupByTime } from "./time-grouping"

/**
 * Aggregate snapshot for "today" on the staff intake ledger. Drives the
 * compact informational line above the FilterBar:
 *
 *   Today: 12 intakes (8 renewals)
 *
 * Pure, deterministic, no DOM. "Today" is defined by `groupByTime`'s
 * TODAY bucket so the aggregate stays in lockstep with the row grouping
 * below the bar (no second source of truth for the day boundary).
 */
export type LedgerDailyAggregate = {
  total: number
  renewals: number
}

type AggregateInput = {
  created_at: string | Date
  isRenewal?: boolean
}

/**
 * Compute the daily aggregate for the ledger.
 *
 * `now` is overridable for tests; production callers pass nothing so the
 * helper observes the real clock.
 */
export function computeLedgerDailyAggregate<T extends AggregateInput>(
  rows: T[],
  now: Date = new Date(),
): LedgerDailyAggregate {
  const todayGroup = groupByTime(rows, "created_at" as keyof T, now).find(
    (g) => g.label === "TODAY",
  )
  const items = todayGroup?.items ?? []
  const renewals = items.filter((row) => row.isRenewal === true).length
  return { total: items.length, renewals }
}
