import { describe, expect, it } from "vitest"

import {
  BATCH_REVIEW_DEADLINE_HOURS,
  buildBatchReviewResolutionFields,
  getBatchReviewDeadline,
  isBatchReviewOverdue,
} from "@/lib/clinical/batch-review-policy"

const APPROVED_AT = "2026-07-10T10:00:00.000Z"

describe("batch review policy", () => {
  it("sets the InstantMed governance deadline to 24 hours", () => {
    expect(BATCH_REVIEW_DEADLINE_HOURS).toBe(24)
    expect(getBatchReviewDeadline(APPROVED_AT)?.toISOString()).toBe(
      "2026-07-11T10:00:00.000Z",
    )
  })

  it("does not mark a review overdue before the deadline", () => {
    expect(isBatchReviewOverdue(APPROVED_AT, new Date("2026-07-11T09:59:59.999Z"))).toBe(false)
  })

  it("marks a review overdue at the deadline", () => {
    expect(isBatchReviewOverdue(APPROVED_AT, new Date("2026-07-11T10:00:00.000Z"))).toBe(true)
  })

  it("fails safely for invalid or missing approval timestamps", () => {
    expect(getBatchReviewDeadline("not-a-date")).toBeNull()
    expect(isBatchReviewOverdue("not-a-date", new Date("2026-07-12T10:00:00.000Z"))).toBe(false)
    expect(isBatchReviewOverdue(null, new Date("2026-07-12T10:00:00.000Z"))).toBe(false)
  })

  it("uses the same completion receipt when a doctor revokes an auto-approved certificate", () => {
    expect(buildBatchReviewResolutionFields(
      "22222222-2222-4222-8222-222222222222",
      new Date("2026-07-11T06:00:00.000Z"),
    )).toEqual({
      batch_reviewed_at: "2026-07-11T06:00:00.000Z",
      batch_reviewed_by: "22222222-2222-4222-8222-222222222222",
    })
  })
})
