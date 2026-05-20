import { describe, expect, it } from "vitest"

import {
  formatRelativeTime,
  groupByTime,
} from "@/lib/operator/cases/time-grouping"

const NOW = new Date("2026-05-20T10:00:00+10:00")

describe("groupByTime", () => {
  it("buckets into TODAY / YESTERDAY / THIS WEEK / EARLIER", () => {
    const rows = [
      { id: "a", created_at: "2026-05-20T08:00:00+10:00" },
      { id: "b", created_at: "2026-05-19T23:00:00+10:00" },
      { id: "c", created_at: "2026-05-18T12:00:00+10:00" },
      { id: "d", created_at: "2026-05-10T12:00:00+10:00" },
    ]
    const result = groupByTime(rows, "created_at", NOW)
    expect(result.map((g) => g.label)).toEqual([
      "TODAY",
      "YESTERDAY",
      "THIS WEEK",
      "EARLIER",
    ])
    expect(result[0]?.items.map((i) => i.id)).toEqual(["a"])
    expect(result[1]?.items.map((i) => i.id)).toEqual(["b"])
    expect(result[2]?.items.map((i) => i.id)).toEqual(["c"])
    expect(result[3]?.items.map((i) => i.id)).toEqual(["d"])
  })

  it("omits empty groups so the UI never renders a 0-count header", () => {
    const rows = [{ id: "a", created_at: "2026-05-20T08:00:00+10:00" }]
    const result = groupByTime(rows, "created_at", NOW)
    expect(result).toHaveLength(1)
    expect(result[0]?.label).toBe("TODAY")
  })

  it("preserves input order within each group", () => {
    const rows = [
      { id: "a", created_at: "2026-05-20T08:00:00+10:00" },
      { id: "b", created_at: "2026-05-20T09:00:00+10:00" },
    ]
    const result = groupByTime(rows, "created_at", NOW)
    expect(result[0]?.items.map((i) => i.id)).toEqual(["a", "b"])
  })

  it("ignores rows with invalid or missing dates", () => {
    const rows = [
      { id: "a", created_at: "not-a-date" },
      { id: "b", created_at: "2026-05-20T08:00:00+10:00" },
      { id: "c", created_at: null as unknown as string },
    ]
    const result = groupByTime(rows, "created_at", NOW)
    expect(result).toHaveLength(1)
    expect(result[0]?.items.map((i) => i.id)).toEqual(["b"])
  })

  it("accepts Date instances", () => {
    const rows = [
      { id: "a", at: new Date("2026-05-20T08:00:00+10:00") },
    ]
    const result = groupByTime(rows, "at", NOW)
    expect(result[0]?.label).toBe("TODAY")
  })
})

describe("formatRelativeTime", () => {
  it("returns 'just now' under 1 minute", () => {
    const t = new Date(NOW.getTime() - 30 * 1000).toISOString()
    expect(formatRelativeTime(t, NOW)).toBe("just now")
  })

  it("returns minutes for under 1 hour", () => {
    const t = new Date(NOW.getTime() - 12 * 60 * 1000).toISOString()
    expect(formatRelativeTime(t, NOW)).toBe("12m ago")
  })

  it("returns hours for under 1 day", () => {
    const t = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(t, NOW)).toBe("3h ago")
  })

  it("returns days for under 1 week", () => {
    const t = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(t, NOW)).toBe("3d ago")
  })

  it("returns a date for older entries", () => {
    const t = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const out = formatRelativeTime(t, NOW)
    // exact format depends on locale, but should contain a year + a 3-letter month
    expect(out).toMatch(/2026/)
  })

  it("returns empty string for invalid input", () => {
    expect(formatRelativeTime("not-a-date", NOW)).toBe("")
    expect(formatRelativeTime(null as unknown as string, NOW)).toBe("")
  })
})
