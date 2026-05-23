import { describe, expect, it } from "vitest"

import { computeLedgerDailyAggregate } from "@/lib/operator/cases/daily-aggregate"

// Anchor NOW in AEST (+10:00) so the helper's TODAY bucket — which uses
// startOfDayAEST() under the hood per lib/operator/cases/time-grouping.ts —
// resolves to the same wall-clock day on AEST macOS and UTC CI runners.
// The cockpit-time-utils.test.ts uses the same +10:00 anchoring pattern.
const NOW = new Date("2026-05-21T14:00:00+10:00")
const AEST_OFFSET_MS = 10 * 60 * 60 * 1000

// Construct AEST timestamps by computing the UTC instant for the given
// AEST wall-clock hour on NOW's AEST day. Using setHours() here would
// be system-local and would diverge between AEST and UTC runners.
function todayAt(hours: number, minutes = 0): string {
  const aestMidnight = Math.floor((NOW.getTime() + AEST_OFFSET_MS) / 86_400_000) * 86_400_000 - AEST_OFFSET_MS
  return new Date(aestMidnight + hours * 60 * 60 * 1000 + minutes * 60 * 1000).toISOString()
}

function yesterdayAt(hours: number): string {
  const aestMidnight = Math.floor((NOW.getTime() + AEST_OFFSET_MS) / 86_400_000) * 86_400_000 - AEST_OFFSET_MS
  return new Date(aestMidnight + hours * 60 * 60 * 1000 - 86_400_000).toISOString()
}

describe("computeLedgerDailyAggregate", () => {
  it("counts only rows created today", () => {
    const agg = computeLedgerDailyAggregate(
      [
        { created_at: todayAt(9), isRenewal: false },
        { created_at: todayAt(10), isRenewal: false },
        { created_at: yesterdayAt(15), isRenewal: false },
      ],
      NOW,
    )
    expect(agg.total).toBe(2)
    expect(agg.renewals).toBe(0)
  })

  it("counts today's renewals separately from non-renewals", () => {
    const agg = computeLedgerDailyAggregate(
      [
        { created_at: todayAt(9), isRenewal: true },
        { created_at: todayAt(10), isRenewal: true },
        { created_at: todayAt(11), isRenewal: false },
      ],
      NOW,
    )
    expect(agg.total).toBe(3)
    expect(agg.renewals).toBe(2)
  })

  it("ignores renewals from prior days", () => {
    const agg = computeLedgerDailyAggregate(
      [
        { created_at: yesterdayAt(9), isRenewal: true },
        { created_at: todayAt(10), isRenewal: false },
      ],
      NOW,
    )
    expect(agg.total).toBe(1)
    expect(agg.renewals).toBe(0)
  })

  it("returns zero total and zero renewals on an empty input", () => {
    const agg = computeLedgerDailyAggregate([], NOW)
    expect(agg.total).toBe(0)
    expect(agg.renewals).toBe(0)
  })

  it("returns zero total when no rows fall in the TODAY bucket", () => {
    const agg = computeLedgerDailyAggregate(
      [
        { created_at: yesterdayAt(9), isRenewal: true },
        { created_at: yesterdayAt(14), isRenewal: false },
      ],
      NOW,
    )
    expect(agg.total).toBe(0)
    expect(agg.renewals).toBe(0)
  })

  it("treats missing or undefined isRenewal as non-renewal", () => {
    const agg = computeLedgerDailyAggregate(
      [
        { created_at: todayAt(9) },
        { created_at: todayAt(10), isRenewal: undefined },
        { created_at: todayAt(11), isRenewal: true },
      ],
      NOW,
    )
    expect(agg.total).toBe(3)
    expect(agg.renewals).toBe(1)
  })
})
