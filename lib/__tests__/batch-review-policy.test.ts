import { describe, expect, it } from "vitest"

import {
  BATCH_REVIEW_DEADLINE_HOURS,
  BATCH_REVIEW_ELIGIBLE_STATUSES,
  BATCH_REVIEW_ENFORCEMENT_START,
  buildBatchReviewResolutionFields,
  getBatchReviewDeadline,
  isAfterBatchReviewEnforcementStart,
  isBatchReviewEligible,
  isBatchReviewOverdue,
} from "@/lib/clinical/batch-review-policy"

const APPROVED_AT = "2026-07-10T10:00:00.000Z"
const POST_CUTOVER_AT = "2026-07-12T10:00:00.000Z"

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

  it("scopes eligibility to approved med certs only — never completed (which cannot reopen)", () => {
    expect(BATCH_REVIEW_ELIGIBLE_STATUSES).toEqual(["approved"])
    const base = {
      ai_approved: true,
      category: "medical_certificate",
      status: "approved",
      batch_reviewed_at: null,
    }
    expect(isBatchReviewEligible(base)).toBe(true)
    // `completed` is a DB terminal state — including it stranded the revoke path.
    expect(isBatchReviewEligible({ ...base, status: "completed" })).toBe(false)
    expect(isBatchReviewEligible({ ...base, status: "in_review" })).toBe(false)
    expect(isBatchReviewEligible({ ...base, ai_approved: false })).toBe(false)
    expect(isBatchReviewEligible({ ...base, category: "consult" })).toBe(false)
    expect(isBatchReviewEligible({ ...base, batch_reviewed_at: "2026-07-12T00:00:00Z" })).toBe(false)
  })

  it("grandfathers certs auto-approved before the enforcement cutover", () => {
    // The 74-cert launch backlog (all approved before the feature shipped) must
    // not count as overdue — enforcement is forward-only from the cutover.
    expect(isAfterBatchReviewEnforcementStart(APPROVED_AT)).toBe(false)
    expect(isAfterBatchReviewEnforcementStart("2026-03-29T02:19:18Z")).toBe(false)
    expect(isAfterBatchReviewEnforcementStart(BATCH_REVIEW_ENFORCEMENT_START)).toBe(true)
    expect(isAfterBatchReviewEnforcementStart(POST_CUTOVER_AT)).toBe(true)
    expect(isAfterBatchReviewEnforcementStart(null)).toBe(false)
    expect(isAfterBatchReviewEnforcementStart("not-a-date")).toBe(false)
  })
})
