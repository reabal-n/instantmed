import { describe, expect, it } from "vitest"

import {
  buildRevenueMilestoneProgress,
  REVENUE_ACTIVE_MILESTONE_CENTS,
  REVENUE_CAPACITY_REVIEW_CENTS,
} from "@/lib/business/revenue-milestones"

describe("revenue milestone progress", () => {
  it("exports the active $2k milestone for other revenue read models", () => {
    expect(REVENUE_ACTIVE_MILESTONE_CENTS).toBe(200_000)
    expect(REVENUE_CAPACITY_REVIEW_CENTS).toBe(1_000_000)
  })

  it("tracks rolling net-retained revenue against the first $2k rung", () => {
    expect(buildRevenueMilestoneProgress(130_000)).toMatchObject({
      currentNetCents: 130_000,
      activeMilestone: {
        key: "two_thousand",
        targetNetCents: 200_000,
        horizonDays: 30,
        deadlineDateKey: "2026-08-11",
      },
      activeHorizonLabel: "30-day horizon · due 11 Aug 2026",
      progressPercent: 65,
      remainingCents: 70_000,
      progressLabel: "$1,300 of $2,000 net retained",
      remainingLabel: "$700 remaining",
      nextRungLabel: "Next: $5,000 monthly net-retained run-rate (90-day horizon)",
      capacityReviewTriggered: false,
    })
  })

  it("preserves a negative retained-revenue balance while clamping only visual progress", () => {
    expect(buildRevenueMilestoneProgress(-10_000)).toMatchObject({
      currentNetCents: -10_000,
      progressPercent: 0,
      remainingCents: 210_000,
      progressLabel: "-$100 of $2,000 net retained",
      remainingLabel: "$2,100 remaining",
    })
  })

  it("advances to the $5k rung once the first milestone is reached", () => {
    expect(buildRevenueMilestoneProgress(200_000)).toMatchObject({
      activeMilestone: {
        key: "five_thousand",
        targetNetCents: 500_000,
        horizonDays: 90,
      },
      progressPercent: 40,
      remainingCents: 300_000,
      progressLabel: "$2,000 of $5,000 net retained",
      remainingLabel: "$3,000 remaining",
      nextRungLabel: "Next: $10,000 monthly net-retained run-rate (capacity review)",
      capacityReviewTriggered: false,
    })
  })

  it("uses the $10k rung as the final growth milestone before capacity review", () => {
    expect(buildRevenueMilestoneProgress(500_000)).toMatchObject({
      activeMilestone: {
        key: "ten_thousand",
        targetNetCents: 1_000_000,
        horizonDays: null,
      },
      progressPercent: 50,
      remainingCents: 500_000,
      nextRungLabel: "Capacity review at $10,000 monthly net-retained run-rate",
      capacityReviewTriggered: false,
    })
  })

  it("triggers a capacity review once rolling net-retained revenue reaches $10k", () => {
    expect(buildRevenueMilestoneProgress(1_000_000)).toMatchObject({
      activeMilestone: {
        key: "ten_thousand",
      },
      progressPercent: 100,
      remainingCents: 0,
      progressLabel: "$10,000 of $10,000 net retained",
      remainingLabel: "$0 remaining",
      nextRungLabel: "Capacity review triggered",
      capacityReviewTriggered: true,
    })
  })
})
