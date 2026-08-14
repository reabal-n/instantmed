import { describe, expect, it, vi } from "vitest"

import {
  getHistoricalAutoIssuedReviewLane,
  parseHistoricalAutoIssuedReviewLane,
  parseHistoricalAutoIssuedReviewOpenOutcome,
  parseHistoricalAutoIssuedReviewReceiptOutcome,
  recordHistoricalAutoIssuedNoCorrection,
} from "@/lib/admin/historical-auto-issued-review"

const CASE = {
  intakeId: "11111111-1111-4111-8111-111111111111",
  referenceNumber: "IM-REVIEW",
  aiApprovedAt: "2026-07-01T00:00:00.000Z",
  certificateCreatedAt: "2026-07-01T00:01:00.000Z",
  state: "ready_for_review",
} as const

function payload(overrides: Record<string, unknown> = {}) {
  return {
    expectedCount: 9,
    cohortCount: 9,
    resolvedCount: 8,
    unresolvedCount: 1,
    cases: [CASE],
    ...overrides,
  }
}

describe("historical auto-issued review data boundary", () => {
  it("parses a reconciled PHI-minimized lane", () => {
    expect(parseHistoricalAutoIssuedReviewLane(payload())).toEqual({
      ...payload(),
      queryFailed: false,
    })
  })

  it("fails closed on cohort drift, inconsistent totals, or malformed cases", () => {
    expect(parseHistoricalAutoIssuedReviewLane(payload({ cohortCount: 8, resolvedCount: 7 })))
      .toMatchObject({ queryFailed: true })
    expect(parseHistoricalAutoIssuedReviewLane(payload({ resolvedCount: 7 }))).toBeNull()
    expect(parseHistoricalAutoIssuedReviewLane(payload({ cases: [{ ...CASE, intakeId: null }] })))
      .toBeNull()
  })

  it("returns an unavailable lane when the RPC fails", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "database unavailable" } }))

    await expect(getHistoricalAutoIssuedReviewLane({ rpc } as never)).resolves.toEqual({
      cases: [],
      cohortCount: 0,
      expectedCount: 9,
      queryFailed: true,
      resolvedCount: 0,
      unresolvedCount: 0,
    })
  })

  it("accepts only explicit RPC outcomes", () => {
    expect(parseHistoricalAutoIssuedReviewOpenOutcome("opened")).toBe("opened")
    expect(parseHistoricalAutoIssuedReviewOpenOutcome("unexpected")).toBe("unavailable")
    expect(parseHistoricalAutoIssuedReviewReceiptOutcome("recorded")).toBe("recorded")
    expect(parseHistoricalAutoIssuedReviewReceiptOutcome("unexpected")).toBeNull()
  })

  it("binds the receipt RPC to the supplied intake and authenticated actor handles", async () => {
    const rpc = vi.fn(async () => ({ data: "recorded", error: null }))

    await expect(recordHistoricalAutoIssuedNoCorrection(
      { rpc } as never,
      CASE.intakeId,
      "22222222-2222-4222-8222-222222222222",
    )).resolves.toEqual({ outcome: "recorded", queryFailed: false })
    expect(rpc).toHaveBeenCalledWith("record_historical_auto_issued_no_correction", {
      p_actor_id: "22222222-2222-4222-8222-222222222222",
      p_intake_id: CASE.intakeId,
    })
  })
})
