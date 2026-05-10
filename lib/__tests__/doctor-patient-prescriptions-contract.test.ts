import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const detailSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/patient-detail-client.tsx"),
  "utf8",
)
const detailPageSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/page.tsx"),
  "utf8",
)
const panelSource = readFileSync(
  join(process.cwd(), "components/doctor/parchment-prescribe-panel.tsx"),
  "utf8",
)
const clinicalCaseReviewSource = readFileSync(
  join(process.cwd(), "components/doctor/clinical-case-review.tsx"),
  "utf8",
)

describe("doctor patient medication history contract", () => {
  it("shows Parchment prescriptions and prior InstantMed medication requests on the patient record", () => {
    expect(detailPageSource).toContain(".from(\"prescriptions\")")
    expect(detailPageSource).toContain("parchment_reference")
    expect(detailPageSource).toContain("answers:intake_answers(answers)")
    expect(detailPageSource).toContain("extractMedicationFromAnswers")
    expect(detailPageSource).toContain("medications={data.medications}")

    expect(detailSource).toContain("interface PatientMedication")
    expect(detailSource).toContain("Medication history")
    expect(detailSource).toContain("Parchment prescriptions and previous InstantMed prescription requests")
    expect(detailSource).toContain("InstantMed request")
    expect(detailSource).toContain("SCID")
  })

  it("keeps patient-profile prescribing actions visible with clear blocked states", () => {
    expect(detailSource).toContain("Prescribing workspace")
    expect(detailSource).toContain("Prescribe in Parchment")
    expect(detailSource).not.toContain("Add prescription")
    expect(detailSource.match(/Refresh prescriptions/g)?.length ?? 0).toBe(1)
    expect(detailSource).toContain("Verify delivery")
    expect(detailSource).toContain("Prescriber not linked")
    expect(detailSource).toContain("/doctor/settings/identity#parchment-account")
    expect(detailSource).toContain("Parchment integration disabled")
    expect(detailSource).toContain("Sync patient")
  })

  it("organizes the profile around clinically relevant sections", () => {
    expect(detailSource).toContain("Patient summary")
    expect(detailSource).toContain("Prescribing identity")
    expect(detailSource).toContain("Last prescription")
    expect(detailSource).toContain("Delivery evidence")
    expect(detailSource).toContain("Webhook confirmed script sent")
    expect(detailPageSource).toContain("Prescription synced to PMS")
    expect(detailSource).toContain("visibleMedications")
    expect(detailSource).toContain("hiddenMedicationCount")
  })

  it("surfaces Parchment webhook and sync activity without exposing raw PHI", () => {
    expect(detailPageSource).toContain("getPatientParchmentAuditRows")
    expect(detailPageSource).toContain("parchment_webhook_script_sent")
    expect(detailPageSource).toContain("metadata->>patient_id")
    expect(detailPageSource).toContain("metadata->>partner_patient_id")
    expect(detailSource).toContain("parchmentActivity")
    expect(detailSource).toContain("Waiting for webhook")
    expect(detailSource).toContain("Verifying Parchment delivery evidence")
  })

  it("keeps the Parchment delivery panel consolidated instead of duplicating prescription history rows", () => {
    expect(detailPageSource).toContain(".slice(0, 1)")
    expect(detailSource).toContain("Latest delivery update")
    expect(detailSource).toContain("secondaryParchmentActivity")
    expect(detailSource).toContain("earlier delivery event")
    expect(detailSource).not.toContain("parchmentActivity.slice(1, 5)")
  })

  it("hides empty secondary patient sections instead of rendering full empty cards", () => {
    expect(detailSource).toContain("<PatientTimeline")
    expect(detailSource).toContain("emptyLabel=\"No requests or staff notes recorded yet.\"")
    expect(detailSource).toContain("{showNoteForm && (")
    expect(detailSource).toContain("{emailLogs.length > 0 && (")
    expect(detailSource).not.toContain("No requests from this patient yet")
    expect(detailSource).not.toContain("No emails sent to this patient yet")
    expect(detailSource).not.toContain("No notes yet")
  })

  it("shows Parchment sync health in the doctor patient list", () => {
    const patientsPageSource = readFileSync(
      join(process.cwd(), "app/doctor/patients/page.tsx"),
      "utf8",
    )
    const patientsListSource = readFileSync(
      join(process.cwd(), "app/doctor/patients/patients-list-client.tsx"),
      "utf8",
    )

    expect(patientsPageSource).toContain("parchment_patient_id")
    expect(patientsListSource).toContain("Parchment sync")
    expect(patientsListSource).toContain("Ready in Parchment")
    expect(patientsListSource).toContain("Not synced")
    expect(patientsListSource).toContain("Directory summary")
    expect(patientsListSource).toContain("sm:grid-cols-2 xl:grid-cols-4")
    expect(patientsListSource).not.toContain("{/* Overview */}")
  })

  it("refreshes patient prescriptions when the embedded Parchment panel closes", () => {
    expect(panelSource).toContain("closeAndRefresh")
    expect(panelSource).toContain("onPrescriptionsRefresh()")
  })

  it("keeps automatic Parchment session refreshes out of top-level doctor toasts", () => {
    expect(panelSource).toContain("loadPrescribingUrl()")
    expect(panelSource).not.toContain("Parchment session expiring")
    expect(panelSource).not.toContain("toast.warning")
  })

  it("gives doctors a slow-iframe recovery state without blocking prescribing", () => {
    expect(panelSource).toContain("PARCHMENT_IFRAME_SLOW_LOAD_MS")
    expect(panelSource).toContain("iframeSlowToLoad")
    expect(panelSource).toContain("Parchment is taking a little longer")
    expect(panelSource).toContain("Open in new tab")
    expect(panelSource).toContain("copyPrescriptionContext")
  })

  it("lets doctors retry only the embedded iframe without refreshing the SSO session", () => {
    expect(panelSource).toContain("iframeReloadKey")
    expect(panelSource).toContain("retryIframeOnly")
    expect(panelSource).toContain("setIframeReloadKey((key) => key + 1)")
    expect(panelSource).toContain("Retry iframe")
    expect(panelSource).toContain("key={iframeReloadKey}")
  })

  it("names the copied medicine in Parchment copy feedback", () => {
    expect(panelSource).toContain("getCopiedMedicineLabel")
    expect(panelSource).toContain("Copied")
    expect(panelSource).toContain("to Parchment")
    expect(panelSource).not.toContain('toast.success("Prescription details copied")')

    expect(clinicalCaseReviewSource).toContain("getPrescriptionCopyLabel")
    expect(clinicalCaseReviewSource).toContain("Copied")
    expect(clinicalCaseReviewSource).toContain("for Parchment")
    expect(clinicalCaseReviewSource).not.toContain('toast.success("Parchment preset copied")')
  })

  it("lets doctors copy only the Parchment search term when needed", () => {
    expect(panelSource).toContain("copyPrescriptionSearchHint")
    expect(panelSource).toContain("Copied Parchment search term")
    expect(panelSource).toContain("Copy search")
    expect(panelSource).toContain("prescriptionContext.searchHint")

    expect(clinicalCaseReviewSource).toContain("copySearchHint")
    expect(clinicalCaseReviewSource).toContain("medicationSearchHint")
    expect(clinicalCaseReviewSource).toContain("Copy search")
  })

  it("does not pass raw intake answers into the client props", () => {
    expect(detailPageSource).toContain("intakeWithoutAnswers")
    expect(detailSource).not.toContain("answers:")
    expect(detailSource).not.toContain("intake_answers")
  })
})
