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

  it("does not pass raw intake answers into the client props", () => {
    expect(detailPageSource).toContain("intakeWithoutAnswers")
    expect(detailSource).not.toContain("answers:")
    expect(detailSource).not.toContain("intake_answers")
  })
})
