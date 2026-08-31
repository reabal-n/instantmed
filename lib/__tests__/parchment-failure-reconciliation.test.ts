import { describe, expect, it } from "vitest"

import {
  filterRecoveredStandaloneParchmentFailures,
  filterUnresolvedParchmentFailures,
  getRecoveredStandaloneParchmentFailurePresentation,
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

    expect(filterUnresolvedParchmentFailures([{ id: "still-open" }], receipts)).toEqual([
      { id: "still-open" },
    ])
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

  it("reclassifies an invalid standalone correlation when the same SCID is synced to the same patient", () => {
    const failure = {
      id: "failure-recovered",
      intakeId: null,
      reason: "intake_correlation_invalid",
      scid: "SCID-standalone",
      patientProfileId: "patient-1",
      partnerPatientId: "patient-1",
    }
    const prescriptions = [{
      intakeId: null,
      parchmentReference: "SCID-standalone",
      patientId: "patient-1",
    }]

    expect(getRecoveredStandaloneParchmentFailurePresentation(failure, prescriptions)).toEqual({
      status: "success",
      label: "Direct prescription synced",
      detail: "No InstantMed request was attached to this Parchment event, and the same prescription is synced to this patient profile.",
    })
    expect(filterRecoveredStandaloneParchmentFailures([
      failure,
      { ...failure, id: "failure-open", scid: "SCID-open" },
    ], prescriptions)).toEqual([
      { ...failure, id: "failure-open", scid: "SCID-open" },
    ])
  })

  it.each([
    {
      label: "a linked intake",
      failure: { intakeId: "intake-1" },
      prescription: {},
    },
    {
      label: "a different failure reason",
      failure: { reason: "intake_correlation_mismatch" },
      prescription: {},
    },
    {
      label: "a different SCID",
      failure: {},
      prescription: { parchmentReference: "SCID-other" },
    },
    {
      label: "a different patient",
      failure: {},
      prescription: { patientId: "patient-2" },
    },
    {
      label: "an intake-linked prescription",
      failure: {},
      prescription: { intakeId: "intake-1" },
    },
  ])("keeps the failure actionable when recovery evidence has $label", ({ failure, prescription }) => {
    expect(getRecoveredStandaloneParchmentFailurePresentation({
      id: "failure-open",
      intakeId: null,
      reason: "intake_correlation_invalid",
      scid: "SCID-standalone",
      patientProfileId: "patient-1",
      partnerPatientId: "patient-1",
      ...failure,
    }, [{
      intakeId: null,
      parchmentReference: "SCID-standalone",
      patientId: "patient-1",
      ...prescription,
    }])).toBeNull()
  })
})
