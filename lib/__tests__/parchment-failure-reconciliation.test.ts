import { describe, expect, it } from "vitest"

import {
  filterUnresolvedParchmentFailures,
  getResolvedParchmentFailureIds,
  isNonActionableParchmentFailure,
} from "@/lib/parchment/failure-reconciliation"

describe("Parchment failure reconciliation", () => {
  it("removes only failures with a durable successful retry receipt", () => {
    const failures = [
      { id: "failure-resolved", reason: "intake_correlation_mismatch" },
      { id: "failure-open", reason: "prescription_sync_failed" },
    ]
    const receipts = [
      {
        action: "admin_action",
        metadata: {
          action_type: "parchment_webhook_retry",
          failure_audit_id: "failure-resolved",
          result: "success",
        },
      },
      {
        action: "admin_action",
        metadata: {
          action_type: "parchment_webhook_retry",
          failure_audit_id: "failure-open",
          result: "failed",
        },
      },
    ]

    expect(filterUnresolvedParchmentFailures(failures, receipts)).toEqual([
      { id: "failure-open", reason: "prescription_sync_failed" },
    ])
  })

  it("ignores malformed and unrelated audit rows", () => {
    const receipts = [
      {
        action: "webhook_failed",
        metadata: {
          action_type: "parchment_webhook_retry",
          failure_audit_id: "wrong-action",
          result: "success",
        },
      },
      {
        action: "admin_action",
        metadata: {
          action_type: "different_action",
          failure_audit_id: "wrong-type",
          result: "success",
        },
      },
      {
        action: "admin_action",
        metadata: {
          action_type: "parchment_webhook_retry",
          result: "success",
        },
      },
      { action: "admin_action", metadata: null },
    ]

    expect(getResolvedParchmentFailureIds(receipts)).toEqual(new Set())
  })

  it.each(["no_awaiting_script_intake", "patient_not_found"])(
    "keeps unlinked %s events out of retry work",
    (reason) => {
      expect(isNonActionableParchmentFailure({ intakeId: null, reason })).toBe(true)
      expect(isNonActionableParchmentFailure({ intakeId: "linked-intake", reason })).toBe(false)
    },
  )

  it("keeps an unlinked correlation mismatch actionable for profile-safe recovery", () => {
    expect(isNonActionableParchmentFailure({
      intakeId: null,
      reason: "intake_correlation_mismatch",
    })).toBe(false)
  })
})
