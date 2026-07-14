import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const sources = [
  "components/doctor/review/intake-review-cockpit.tsx",
  "components/doctor/review-actions.tsx",
  "app/doctor/intakes/[id]/intake-detail-client.tsx",
].map((path) => ({ path, source: readFileSync(join(process.cwd(), path), "utf8") }))
const detailDraftsSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-drafts.tsx"),
  "utf8",
)
const repeatChecklistSource = readFileSync(
  join(process.cwd(), "components/doctor/repeat-prescription-checklist.tsx"),
  "utf8",
)
const queueTableSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/queue-table.tsx"),
  "utf8",
)
const fullCaseHeaderSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-header.tsx"),
  "utf8",
)
const actionButtonsSource = readFileSync(
  join(process.cwd(), "components/doctor/review/intake-action-buttons.tsx"),
  "utf8",
)
const clinicalCaseReviewSource = readFileSync(
  join(process.cwd(), "components/doctor/clinical-case-review.tsx"),
  "utf8",
)

describe("doctor prescribing keyboard shortcuts", () => {
  it("never opens a prescribing handoff without a case-summary prescription intent", () => {
    for (const { path, source } of sources) {
      expect(source, path).toContain("isPrescribingServiceRequest")
      expect(source, path).toMatch(
        /isPrescribingServiceRequest\(service\?\.type, intake\.subtype\)[\s\S]{0,240}hasPrescriptionIntent[\s\S]{0,240}handleOpenParchmentPrescribe/,
      )
    }
  })

  it("disables the legacy script-sent checklist without the raw attestation", () => {
    expect(detailDraftsSource).toContain("getRepeatRxAttestationStatus")
    expect(detailDraftsSource).toContain("Boolean(intake.script_sent) || repeatRxAttestationConfirmed")
    expect(detailDraftsSource).toContain("scriptCompletionAllowed={repeatRxScriptCompletionAllowed}")
    expect(repeatChecklistSource).toContain("scriptCompletionAllowed")
    expect(repeatChecklistSource).toContain("!scriptCompletionAllowed")
    expect(repeatChecklistSource).toMatch(/Decline and refund.*new repeat request/i)
  })

  it("hides Quick Prescribe unless the raw unchanged-regimen attestation is present", () => {
    expect(queueTableSource).toContain("getRepeatRxAttestationStatus")
    expect(queueTableSource).toContain("repeatRxAttestationConfirmed")
    expect(queueTableSource).toMatch(/is_renewal[\s\S]{0,180}repeatRxAttestationConfirmed[\s\S]{0,500}<Button/)
  })

  it("allows only recorded-script completion for legacy repeats and requires a clinician note", () => {
    for (const source of [fullCaseHeaderSource, actionButtonsSource]) {
      expect(source).toContain("canCompleteRecordedRepeatScript")
      expect(source).toContain("isRepeatScript && intake.script_sent === true && isActivePrescribingStatus")
      expect(source).toContain("getRepeatRxAttestationStatus")
      expect(source).toContain("hasLegacyRepeatRxReconciliationNote(doctorNotes)")
      expect(source).toContain("!noteDirty")
      expect(source).toContain("Add and save a reconciliation note for the already-issued script")
      expect(source).toContain("isAiPrefilled")
      expect(source).toContain("canShowPrescribingCompletion")
      expect(source).toContain("canPrescribeInParchment && intake.script_sent !== true")
    }
    expect(actionButtonsSource).toContain("Recorded script evidence needs reconciliation")
    expect(detailDraftsSource).toContain("needsLegacyScriptReconciliation")
    expect(clinicalCaseReviewSource).toContain("needsRecordedScriptReconciliation")
    for (const source of [detailDraftsSource, clinicalCaseReviewSource]) {
      expect(source).toContain("LEGACY_REPEAT_RX_RECONCILIATION_NOTE")
      expect(source).toContain("Acknowledge recorded script evidence")
    }
    expect(detailDraftsSource).toContain("isRepeatRxIntake({ category: intake.category, serviceType: service?.type })")
  })
})
