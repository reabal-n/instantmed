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

  it("prioritizes an empty-page warning over status-filter empty copy", () => {
    const state = buildQueueEmptyState({
      ...baseOptions,
      totalCount: 51,
      statusFilter: "scripts",
    })

    expect(state).toMatchObject({
      title: "This queue page is empty",
      tone: "warning",
      actionHref: "/dashboard",
      actionLabel: "Open first page",
      summary: null,
    })
  })
})

describe("getQueueCompletionOutcome", () => {
  it("opens a visible next case without forcing reconciliation", () => {
    expect(getQueueCompletionOutcome({
      hasNextVisibleCase: true,
      globalTotalBeforeAction: null,
      activeStatusFilter: "scripts",
      queueDegraded: true,
    })).toEqual({
      message: "Case done. Opening next.",
      forceRefresh: false,
    })
  })

  it("claims clear only for the exact final case in a healthy full queue", () => {
    expect(getQueueCompletionOutcome({
      hasNextVisibleCase: false,
      globalTotalBeforeAction: 1,
      activeStatusFilter: "all",
      queueDegraded: false,
    })).toEqual({
      message: "Case done. Queue clear.",
      forceRefresh: false,
    })
  })

  it.each([
    {
      name: "other cases remain in the global queue",
      globalTotalBeforeAction: 51,
      activeStatusFilter: "all" as const,
      queueDegraded: false,
    },
    {
      name: "the global count is unavailable",
      globalTotalBeforeAction: null,
      activeStatusFilter: "all" as const,
      queueDegraded: false,
    },
    {
      name: "the active lane is filtered",
      globalTotalBeforeAction: 1,
      activeStatusFilter: "scripts" as const,
      queueDegraded: false,
    },
    {
      name: "the queue read is degraded",
      globalTotalBeforeAction: 1,
      activeStatusFilter: "all" as const,
      queueDegraded: true,
    },
  ])("forces reconciliation when $name", ({
    globalTotalBeforeAction,
    activeStatusFilter,
    queueDegraded,
  }) => {
    expect(getQueueCompletionOutcome({
      hasNextVisibleCase: false,
      globalTotalBeforeAction,
      activeStatusFilter,
      queueDegraded,
    })).toEqual({
      message: "Case done. Loading remaining queue.",
      forceRefresh: true,
    })
  })
})
