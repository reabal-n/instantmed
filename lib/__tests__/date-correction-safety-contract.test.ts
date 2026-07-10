import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const actionSource = readFileSync(
  join(process.cwd(), "app/actions/request-date-correction.ts"),
  "utf8",
)
const correctionMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260710173000_atomic_certificate_corrections.sql"),
  "utf8",
)
const intakeActionsSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/use-intake-actions.tsx"),
  "utf8",
)
const intakeHeaderSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-header.tsx"),
  "utf8",
)
const patientIntakeClientSource = readFileSync(
  join(process.cwd(), "app/patient/intakes/[id]/client.tsx"),
  "utf8",
)
const patientIntakePageSource = readFileSync(
  join(process.cwd(), "app/patient/intakes/[id]/page.tsx"),
  "utf8",
)

describe("date correction safety contract", () => {
  it("limits patient requests to owned medical-certificate intakes", () => {
    expect(actionSource).toContain('intake.category !== "medical_certificate"')
    expect(actionSource).toContain("Date corrections are only available for medical certificates")
    expect(actionSource).toContain("getCertificateForIntake(intakeId)")
    expect(actionSource).toContain('currentCertificate.status !== "valid"')
  })

  it("rejects patient requests that cannot fit the paid certificate tier", () => {
    expect(actionSource).toContain('.from("intake_answers")')
    expect(actionSource).toContain("getAbsenceDays(intakeAnswersRow.answers")
    expect(actionSource).toContain("dateRangeValidation.durationDays > paidDays")
    expect(actionSource).toContain("exceeds the paid certificate tier")
  })

  it("guards pending correction reads and approvals by doctor capability", () => {
    const pendingStart = actionSource.indexOf("export async function getPendingDateCorrection")
    const approvalStart = actionSource.indexOf("export async function approveDateCorrection")
    const pendingSource = actionSource.slice(pendingStart, approvalStart)
    const approvalSource = actionSource.slice(approvalStart)

    for (const source of [pendingSource, approvalSource]) {
      expect(source).toContain("getApiAuth()")
      expect(source).toContain("hasDoctorAccess(authResult.profile)")
      expect(source).toContain('doctorHasCapability(authResult.profile, "review_med_certs")')
    }
  })

  it("requires pending status and delegates event CAS to the atomic correction RPC", () => {
    expect(actionSource).toContain('.eq("metadata->>status", "pending")')
    expect(actionSource).toContain("correctionEventId,")

    const afterReissue = actionSource.slice(actionSource.indexOf("if (!reissueResult.success)"))
    expect(afterReissue).not.toContain('.from("intake_events").update')
    expect(afterReissue).not.toContain('event_type: "date_correction_approved"')
  })

  it("provides an audited terminal path for a correction that cannot be approved", () => {
    expect(actionSource).toContain("export async function rejectDateCorrection")
    expect(actionSource).toContain('status: "rejected"')
    expect(actionSource).toContain("rejected_by: authResult.profile.id")
    expect(actionSource).toContain("rejected_at: new Date().toISOString()")
    expect(intakeActionsSource).toContain("rejectDateCorrection(pendingCorrection.id, intake.id)")
  })

  it("cannot bypass a pending patient request through the manual correction path", () => {
    expect(correctionMigration).toContain("p_pending_correction_event_id IS NULL")
    expect(correctionMigration).toContain("Pending date correction must be resolved first")
    expect(correctionMigration).toContain("validate_date_correction_request_version")
    expect(correctionMigration).toContain("certificate_storage_path")
    expect(correctionMigration).toContain("Certificate changed before correction request was saved")
    expect(actionSource).toContain("certificate_storage_path: currentCertificate.storage_path")

    const manualButton = intakeHeaderSource.slice(
      intakeHeaderSource.indexOf("Correct certificate") - 520,
      intakeHeaderSource.indexOf("Correct certificate") + 80,
    )
    expect(manualButton).toContain("Boolean(pendingCorrection)")
  })

  it("allows both correction event types in the persisted intake-event contract", () => {
    expect(correctionMigration).toContain("DROP CONSTRAINT IF EXISTS intake_events_event_type_check")
    for (const baselineEvent of [
      "status_change",
      "payment_received",
      "document_generated",
      "email_sent",
      "email_failed",
      "script_sent",
      "refund_processed",
      "escalated",
      "claimed",
      "unclaimed",
    ]) {
      expect(correctionMigration).toContain(`'${baselineEvent}'`)
    }
    expect(correctionMigration).toContain("'date_correction_requested'")
    expect(correctionMigration).toContain("'date_correction_approved'")
    expect(correctionMigration).toContain("idx_intake_events_one_pending_date_correction")
  })

  it("tells the doctor that approval already generated and notified", () => {
    expect(intakeActionsSource).toContain(
      "Date correction approved — updated certificate generated and delivery started",
    )
    expect(intakeActionsSource).not.toContain(
      "Date correction approved - use Edit & Resend to generate the updated certificate",
    )
  })

  it("only offers a patient correction when a current document is present", () => {
    const correctionGateStart = patientIntakeClientSource.indexOf("const canRequestCorrection")
    const correctionGate = patientIntakeClientSource.slice(
      correctionGateStart,
      correctionGateStart + 220,
    )

    expect(correctionGate).toContain("intakeDocument")
  })

  it("does not claim the corrected document was emailed without delivery proof", () => {
    expect(patientIntakeClientSource).toContain("intake.document_sent_at")
    expect(patientIntakeClientSource).toContain(
      "Download it here, or use Resend to email for another copy.",
    )
  })

  it("hydrates the existing pending-correction state after refresh", () => {
    expect(actionSource).toContain("export async function getPatientDateCorrectionState")
    expect(patientIntakePageSource).toContain("getPatientDateCorrectionState(id)")
    expect(patientIntakePageSource).toContain(
      "dateCorrectionState={dateCorrectionState}",
    )
    expect(patientIntakeClientSource).toContain(
      'dateCorrectionState === "pending"',
    )
    expect(patientIntakeClientSource).toContain("setCorrectionSubmitted(dateCorrectionState")
    expect(patientIntakeClientSource).toContain('dateCorrectionState === "unavailable"')
  })
})
