import { describe, expect, it } from "vitest"

import { makeIntakeFlag } from "@/lib/clinical/intake-flags"
import {
  hasQueueRiskBadge,
  hasReviewNextRisk,
  sortForReviewNext,
} from "@/lib/doctor/review-next"
import type { IntakeWithPatient } from "@/types/db"

function intake(overrides: Partial<IntakeWithPatient>): IntakeWithPatient {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    status: "paid",
    is_priority: false,
    flagged_for_followup: false,
    risk_tier: "low",
    risk_flags: [],
    risk_score: 0,
    requires_live_consult: false,
    paid_at: "2026-05-04T09:00:00.000Z",
    submitted_at: "2026-05-04T08:55:00.000Z",
    info_requested_at: null,
    created_at: "2026-05-04T08:50:00.000Z",
    updated_at: "2026-05-04T08:50:00.000Z",
    patient: { id: "patient", full_name: "Patient" },
    ...overrides,
  } as IntakeWithPatient
}

describe("review next priority", () => {
  it.each(["high", "critical"] as const)(
    "reserves the red queue badge for an explicit %s risk tier",
    (riskTier) => {
      expect(hasQueueRiskBadge(intake({ risk_tier: riskTier }))).toBe(true)
    },
  )

  it("does not infer a red clinical-risk badge from legacy scores or workflow attention", () => {
    const nonClinicalRiskCases = [
      intake({ risk_tier: "low", risk_score: 100 }),
      intake({ risk_tier: "moderate" }),
      intake({ risk_flags: [makeIntakeFlag("medication_strength_missing")] }),
      intake({ flagged_for_followup: true }),
      intake({ requires_live_consult: true }),
    ]

    for (const nonClinicalRiskCase of nonClinicalRiskCases) {
      expect(hasQueueRiskBadge(nonClinicalRiskCase)).toBe(false)
    }
  })

  it("keeps follow-up and live-consult work prioritized without labeling it high risk", () => {
    expect(hasReviewNextRisk(intake({ flagged_for_followup: true }))).toBe(true)
    expect(hasReviewNextRisk(intake({ requires_live_consult: true }))).toBe(true)
  })

  it("ignores malformed legacy risk_flags instead of treating any non-empty array as risk", () => {
    const malformed = intake({ risk_flags: [{ code: "legacy" }] })

    expect(hasQueueRiskBadge(malformed)).toBe(false)
    expect(hasReviewNextRisk(malformed)).toBe(false)
  })

  it("prioritizes attention flags but not info-only context", () => {
    const attention = intake({
      id: "attention",
      risk_flags: [makeIntakeFlag("medication_strength_missing")],
      paid_at: "2026-05-04T13:00:00.000Z",
    })
    const infoOnly = intake({
      id: "info-only",
      risk_flags: [makeIntakeFlag("medication_form_missing")],
      paid_at: "2026-05-04T12:00:00.000Z",
    })
    const ordinary = intake({
      id: "ordinary",
      paid_at: "2026-05-04T10:00:00.000Z",
    })

    expect(hasReviewNextRisk(attention)).toBe(true)
    expect(hasReviewNextRisk(infoOnly)).toBe(false)
    expect(sortForReviewNext([infoOnly, attention, ordinary]).map((row) => row.id))
      .toEqual(["attention", "ordinary", "info-only"])
  })

  it("uses the operator ladder: risk, scripts, priority, oldest paid, pending-info age", () => {
    const sorted = sortForReviewNext([
      intake({ id: "paid-new", paid_at: "2026-05-04T10:00:00.000Z" }),
      intake({ id: "priority", is_priority: true, paid_at: "2026-05-04T11:00:00.000Z" }),
      intake({ id: "script", status: "awaiting_script", paid_at: "2026-05-04T12:00:00.000Z" }),
      intake({ id: "risk", risk_tier: "high", paid_at: "2026-05-04T13:00:00.000Z" }),
      intake({ id: "paid-old", paid_at: "2026-05-04T07:00:00.000Z" }),
    ]).map((row) => row.id)

    expect(sorted).toEqual(["risk", "script", "priority", "paid-old", "paid-new"])
  })

  it("ages pending-info cases from the info request timestamp", () => {
    const sorted = sortForReviewNext([
      intake({
        id: "info-new",
        status: "pending_info",
        info_requested_at: "2026-05-04T11:00:00.000Z",
        paid_at: "2026-05-04T07:00:00.000Z",
      }),
      intake({
        id: "info-old",
        status: "pending_info",
        info_requested_at: "2026-05-04T09:00:00.000Z",
        paid_at: "2026-05-04T12:00:00.000Z",
      }),
    ]).map((row) => row.id)

    expect(sorted).toEqual(["info-old", "info-new"])
  })
})
