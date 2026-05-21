import { describe, expect, it } from "vitest"

import { computeLedgerDailyAggregate } from "@/lib/operator/cases/daily-aggregate"

// Anchor "now" inside the same locale day so the helper's TODAY bucket
// matches the test's intent regardless of the host CI timezone offset.
const NOW = new Date("2026-05-21T14:00:00")

function todayAt(hours: number, minutes = 0): string {
  const d = new Date(NOW)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function yesterdayAt(hours: number): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() - 1)
  d.setHours(hours, 0, 0, 0)
  return d.toISOString()
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
