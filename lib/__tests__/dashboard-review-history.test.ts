import { describe, expect, it } from "vitest"

import * as queueUtils from "@/lib/doctor/queue-utils"

type ReviewHistoryStatusMeta = {
  label: string
  tone: "approved" | "declined" | "completed" | "reviewed"
}

const reviewHistoryUtils = queueUtils as typeof queueUtils & {
  buildReviewHistorySummary?: (input: {
    reviews: Array<{ activity_at: string }>
    truncated: boolean
    governanceReceipt?: {
      certificateCount: number
      latestActivityAt: string
    } | null
    now: Date
  }) => string
  getReviewHistoryStatusMeta?: (status: string) => ReviewHistoryStatusMeta
}

describe("dashboard review history", () => {
  it.each([
    ["approved", { label: "Approved", tone: "approved" }],
    ["declined", { label: "Declined", tone: "declined" }],
    ["completed", { label: "Completed", tone: "completed" }],
    ["in_review", { label: "Reviewed", tone: "reviewed" }],
  ] as const)("maps %s to a truthful history status", (status, expected) => {
    expect(reviewHistoryUtils.getReviewHistoryStatusMeta).toBeTypeOf("function")
    expect(reviewHistoryUtils.getReviewHistoryStatusMeta?.(status)).toEqual(expected)
  })

  it("labels a truncated review slice as a latest subset rather than a total", () => {
    expect(reviewHistoryUtils.buildReviewHistorySummary).toBeTypeOf("function")
    expect(reviewHistoryUtils.buildReviewHistorySummary?.({
      reviews: Array.from({ length: 50 }, (_, index) => ({
        activity_at: new Date(Date.UTC(2026, 6, 29, 1, index)).toISOString(),
      })),
      truncated: true,
      now: new Date("2026-07-29T02:00:00.000Z"),
    })).toBe("50+ reviews recorded today · latest 50 shown · last reviewed 11m ago")
  })

  it("reports an uncapped review count as the actor's complete today total", () => {
    expect(reviewHistoryUtils.buildReviewHistorySummary).toBeTypeOf("function")
    expect(reviewHistoryUtils.buildReviewHistorySummary?.({
      reviews: [{ activity_at: "2026-07-29T01:55:00.000Z" }],
      truncated: false,
      now: new Date("2026-07-29T02:00:00.000Z"),
    })).toBe("Your reviews today: 1 · last reviewed 5m ago")
  })

  it("reports governance as a separate aggregate receipt", () => {
    expect(reviewHistoryUtils.buildReviewHistorySummary?.({
      reviews: [{ activity_at: "2026-07-29T01:50:00.000Z" }],
      truncated: false,
      governanceReceipt: {
        certificateCount: 6,
        latestActivityAt: "2026-07-29T01:55:00.000Z",
      },
      now: new Date("2026-07-29T02:00:00.000Z"),
    })).toBe(
      "Your reviews today: 1 · last reviewed 10m ago · Governance: 6 auto-issued certificates covered · latest receipt 5m ago",
    )
  })
})
