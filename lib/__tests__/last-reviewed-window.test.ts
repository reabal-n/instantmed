import { describe, expect, it } from "vitest"

import {
  LAST_REVIEWED_FRESH_MINUTES,
  lastReviewedLabel,
} from "@/lib/brand/last-reviewed-window"

const NOW = Date.parse("2026-07-24T10:00:00Z")
const minutesAgo = (m: number) => NOW - m * 60_000

describe("lastReviewedLabel — the signal renders real freshness or nothing", () => {
  it("renders nothing without a timestamp", () => {
    expect(lastReviewedLabel(null, NOW)).toBeNull()
    expect(lastReviewedLabel(Number.NaN, NOW)).toBeNull()
  })

  it("renders nothing for a future timestamp (clock skew)", () => {
    expect(lastReviewedLabel(minutesAgo(-5), NOW)).toBeNull()
  })

  it("says just now inside the first minute", () => {
    expect(lastReviewedLabel(minutesAgo(0), NOW)).toBe("Last reviewed just now")
    expect(lastReviewedLabel(minutesAgo(1), NOW)).toBe("Last reviewed just now")
  })

  it("reports real minutes inside the freshness window", () => {
    expect(lastReviewedLabel(minutesAgo(5), NOW)).toBe("Last reviewed 5 min ago")
    expect(lastReviewedLabel(minutesAgo(44), NOW)).toBe("Last reviewed 44 min ago")
    expect(lastReviewedLabel(minutesAgo(LAST_REVIEWED_FRESH_MINUTES), NOW)).toBe(
      `Last reviewed ${LAST_REVIEWED_FRESH_MINUTES} min ago`,
    )
  })

  it("renders nothing once the latest review is older than the window", () => {
    expect(lastReviewedLabel(minutesAgo(LAST_REVIEWED_FRESH_MINUTES + 1), NOW)).toBeNull()
    expect(lastReviewedLabel(minutesAgo(600), NOW)).toBeNull()
  })

  it("never fabricates: the label is derived purely from the input timestamp", () => {
    // The retired implementation seeded Math.random() into localStorage and
    // ticked it upward. The replacement is a pure function of (reviewedAt, now)
    // — same inputs, same output, no randomness to regress to.
    const a = lastReviewedLabel(minutesAgo(12), NOW)
    const b = lastReviewedLabel(minutesAgo(12), NOW)
    expect(a).toBe(b)
    expect(a).toBe("Last reviewed 12 min ago")
  })
})
