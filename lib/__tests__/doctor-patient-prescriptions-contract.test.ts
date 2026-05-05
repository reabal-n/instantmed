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

describe("doctor patient medication history contract", () => {
  it("shows Parchment prescriptions and prior InstantMed medication requests on the patient record", () => {
    expect(detailPageSource).toContain(".from(\"prescriptions\")")
    expect(detailPageSource).toContain("parchment_reference")
    expect(detailPageSource).toContain("answers:intake_answers(answers)")
    expect(detailPageSource).toContain("extractMedicationFromAnswers")
    expect(detailPageSource).toContain("medications={data.medications}")

    expect(detailSource).toContain("interface PatientMedication")
    expect(detailSource).toContain("Medication History")
    expect(detailSource).toContain("Parchment prescriptions and previous InstantMed prescription requests")
    expect(detailSource).toContain("InstantMed request")
    expect(detailSource).toContain("SCID")
  })

  it("keeps patient-profile prescribing actions visible with clear blocked states", () => {
    expect(detailSource).toContain("Prescribing workspace")
    expect(detailSource).toContain("Prescribe in Parchment")
    expect(detailSource).toContain("Add prescription")
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
    expect(detailSource).toContain("{intakes.length > 0 && (")
    expect(detailSource).toContain("{(showNoteForm || notes.length > 0) && (")
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
    expect(patientsListSource).toContain("Overview")
    expect(patientsListSource).toContain("sm:grid-cols-2 xl:grid-cols-4")
  })

  it("refreshes patient prescriptions when the embedded Parchment panel closes", () => {
    const panelSource = readFileSync(
      join(process.cwd(), "components/doctor/parchment-prescribe-panel.tsx"),
      "utf8",
    )

    expect(panelSource).toContain("closeAndRefresh")
    expect(panelSource).toContain("onPrescriptionsRefresh()")
  })

  it("does not pass raw intake answers into the client props", () => {
    expect(detailPageSource).toContain("intakeWithoutAnswers")
    expect(detailSource).not.toContain("answers:")
    expect(detailSource).not.toContain("intake_answers")
  })
})
