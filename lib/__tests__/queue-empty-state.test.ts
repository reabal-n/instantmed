import { describe, expect, it } from "vitest"

import {
  buildQueueEmptyState,
  getQueueCompletionOutcome,
} from "@/lib/doctor/queue-empty-state"

const baseOptions = {
  doctorAvailable: true,
  queueDegraded: false,
  totalCount: 0,
  statusFilter: "all" as const,
  searchQuery: "",
  baseHref: "/dashboard",
  recentlyCompleted: [],
  governanceReceipt: null,
  recentlyCompletedDegraded: false,
  recentlyCompletedTruncated: false,
  now: new Date("2026-07-30T00:00:00.000Z"),
}

describe("buildQueueEmptyState", () => {
  it("fails closed when the queue data read is degraded", () => {
    const state = buildQueueEmptyState({
      ...baseOptions,
      queueDegraded: true,
    })

    expect(state).toMatchObject({
      title: "Queue data unavailable",
      tone: "warning",
      summary: null,
    })
    expect(state.description).toContain("Refresh")
  })

  it("does not claim the queue is clear when an out-of-range page is empty", () => {
    const state = buildQueueEmptyState({
      ...baseOptions,
      totalCount: 51,
    })

    expect(state).toMatchObject({
      title: "This queue page is empty",
      tone: "warning",
      actionHref: "/dashboard",
      actionLabel: "Open first page",
      summary: null,
    })
  })

  it("forces reconciliation instead of claiming clear when cases remain off-page", () => {
    expect(getQueueCompletionOutcome({
      hasNextVisibleCase: false,
      totalBeforeAction: 51,
    })).toEqual({
      message: "Case done. Loading remaining queue.",
      forceRefresh: true,
    })
    expect(getQueueCompletionOutcome({
      hasNextVisibleCase: false,
      totalBeforeAction: 1,
    })).toEqual({
      message: "Case done. Queue clear.",
      forceRefresh: false,
    })
  })
})
