import { describe, expect, it } from "vitest"

import { formatRelativeTime, groupByTime, startOfDayAEST } from "@/lib/operator/cases/time-grouping"

describe("startOfDayAEST", () => {
  it("floors to AEST midnight, not UTC or server-local midnight", () => {
    // 2026-07-21T15:00:00Z = 2026-07-22T01:00:00+10:00 (1am AEST, July 22).
    // The AEST day started at 2026-07-21T14:00:00Z. A naive UTC-midnight
    // boundary (the bug this function replaced) would instead compute
    // 2026-07-21T00:00:00Z — 14 hours too early, misclassifying anything
    // from the first 14 hours of the AEST day as "yesterday".
    const now = new Date("2026-07-21T15:00:00.000Z")
    expect(startOfDayAEST(now).toISOString()).toBe("2026-07-21T14:00:00.000Z")
  })

  it("is stable across the whole AEST day, including exactly at the boundary", () => {
    const justAfterMidnightAEST = new Date("2026-07-21T14:00:00.000Z")
    const justBeforeNextMidnightAEST = new Date("2026-07-22T13:59:59.999Z")
    expect(startOfDayAEST(justAfterMidnightAEST).toISOString()).toBe("2026-07-21T14:00:00.000Z")
    expect(startOfDayAEST(justBeforeNextMidnightAEST).toISOString()).toBe("2026-07-21T14:00:00.000Z")
  })
})

describe("groupByTime", () => {
  const now = new Date("2026-07-21T15:00:00.000Z") // 1am AEST, July 22

  it("buckets a row from earlier in the same AEST day as TODAY, not YESTERDAY", () => {
    // 2026-07-21T14:30:00Z = 2026-07-22T00:30:00+10:00 — 30 minutes into
    // today's AEST day. This is exactly the shape of the dashboard bug:
    // a naive UTC boundary would have bucketed this as yesterday.
    const rows = [{ id: "a", createdAt: "2026-07-21T14:30:00.000Z" }]
    const groups = groupByTime(rows, "createdAt", now)
    expect(groups).toEqual([{ label: "TODAY", items: rows }])
  })

  it("buckets a row from just before the AEST boundary as YESTERDAY", () => {
    const rows = [{ id: "a", createdAt: "2026-07-21T13:59:59.999Z" }]
    const groups = groupByTime(rows, "createdAt", now)
    expect(groups).toEqual([{ label: "YESTERDAY", items: rows }])
  })

  it("omits empty groups", () => {
    const rows = [{ id: "a", createdAt: "2026-07-21T14:30:00.000Z" }]
    const groups = groupByTime(rows, "createdAt", now)
    expect(groups.map((g) => g.label)).toEqual(["TODAY"])
  })

  it("skips rows with an invalid or missing date", () => {
    const rows = [
      { id: "a", createdAt: "2026-07-21T14:30:00.000Z" },
      { id: "b", createdAt: "not-a-date" },
      { id: "c", createdAt: null },
    ]
    const groups = groupByTime(rows as never, "createdAt", now)
    expect(groups).toEqual([{ label: "TODAY", items: [rows[0]] }])
  })
})

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-21T15:00:00.000Z")

  it("formats sub-minute as 'just now'", () => {
    expect(formatRelativeTime("2026-07-21T14:59:45.000Z", now)).toBe("just now")
  })

  it("formats minutes and hours", () => {
    expect(formatRelativeTime("2026-07-21T14:45:00.000Z", now)).toBe("15m ago")
    expect(formatRelativeTime("2026-07-21T12:00:00.000Z", now)).toBe("3h ago")
  })

  it("returns empty string for invalid input", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("")
    expect(formatRelativeTime(null, now)).toBe("")
    expect(formatRelativeTime(undefined, now)).toBe("")
  })
})
