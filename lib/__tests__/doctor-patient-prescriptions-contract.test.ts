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
    expect(detailSource).toContain("Prescriber not linked")
    expect(detailSource).toContain("/doctor/settings/identity#parchment-account")
    expect(detailSource).toContain("Parchment integration disabled")
    expect(detailSource).toContain("Sync patient")
  })

  it("organizes the profile around clinically relevant sections", () => {
    expect(detailSource).toContain("Clinical snapshot")
    expect(detailSource).toContain("Prescribing identity")
    expect(detailSource).toContain("Latest activity")
    expect(detailSource).toContain("Last prescription")
    expect(detailSource).toContain("Parchment delivery status")
    expect(detailSource).toContain("Webhook confirmed script sent")
    expect(detailPageSource).toContain("Prescription synced to PMS")
  })

  it("surfaces Parchment webhook and sync activity without exposing raw PHI", () => {
    expect(detailPageSource).toContain("getPatientParchmentAuditRows")
    expect(detailPageSource).toContain("parchment_webhook_script_sent")
    expect(detailPageSource).toContain("metadata->>patient_id")
    expect(detailPageSource).toContain("metadata->>partner_patient_id")
    expect(detailSource).toContain("parchmentActivity")
    expect(detailSource).toContain("Waiting for webhook")
  })

  it("keeps the Parchment delivery panel consolidated instead of duplicating prescription history rows", () => {
    expect(detailPageSource).toContain(".slice(0, 1)")
    expect(detailSource).toContain("Latest delivery update")
    expect(detailSource).toContain("secondaryParchmentActivity")
    expect(detailSource).toContain("Other recent events")
    expect(detailSource).not.toContain("parchmentActivity.slice(1, 5)")
  })

  it("does not pass raw intake answers into the client props", () => {
    expect(detailPageSource).toContain("intakeWithoutAnswers")
    expect(detailSource).not.toContain("answers:")
    expect(detailSource).not.toContain("intake_answers")
  })
})
