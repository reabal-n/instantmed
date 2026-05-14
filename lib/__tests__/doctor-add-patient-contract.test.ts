import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const actionsSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/actions.ts"),
  "utf8",
)
const listSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/patients-list-client.tsx"),
  "utf8",
)
const pageSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/page.tsx"),
  "utf8",
)
const patientDirectorySource = readFileSync(
  join(process.cwd(), "lib/data/patient-directory.ts"),
  "utf8",
)
const detailSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/patient-detail-client.tsx"),
  "utf8",
)
const detailPageSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/page.tsx"),
  "utf8",
)
const editPatientDialogSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/edit-patient-dialog.tsx"),
  "utf8",
)
const addPatientDialogSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/add-patient-dialog.tsx"),
  "utf8",
)

function functionBody(name: string): string {
  const start = actionsSource.indexOf(`export async function ${name}`)
  expect(start).toBeGreaterThanOrEqual(0)

  const nextExport = actionsSource.indexOf("\nexport async function ", start + 1)
  return actionsSource.slice(start, nextExport === -1 ? actionsSource.length : nextExport)
}

describe("doctor add patient Parchment contract", () => {
  it("exposes an Add patient CTA on the patient directory and selects Parchment sync state", () => {
    expect(listSource).toContain("showAddPatientAction")
    expect(listSource).toContain("actions={showAddPatientAction ? <AddPatientDialog /> : undefined}")
    expect(listSource).toContain("AddPatientDialog")
    expect(listSource).toContain("Parchment synced")
    expect(listSource).toContain('aria-label="Filter patients by service"')
    expect(listSource).toContain('aria-label="Filter patients by Parchment sync"')
    expect(listSource).toContain("Last request")
    expect(listSource).toContain("Last script")
    expect(pageSource).toContain("getPatientDirectoryPage")
    expect(pageSource).toContain("parsePatientDirectorySort")
    expect(patientDirectorySource).toContain("parchment_patient_id")
    expect(patientDirectorySource).toContain("lastRequest")
    expect(patientDirectorySource).toContain("lastScript")
  })

  it("requires doctor/admin auth and rate limits before creating a patient", () => {
    const body = functionBody("createDoctorPatientAndOpenParchmentAction")

    expect(body).toContain('requireRoleOrNull(["doctor", "admin"])')
    expect(body).toContain("`doctor:add-patient:${authResult.profile.id}`")
    expect(body.indexOf("checkServerActionRateLimit(")).toBeLessThan(
      body.indexOf("const validation = validateDoctorPatientCreateInput(input)"),
    )
    expect(body.indexOf("validateDoctorPatientCreateInput(input)")).toBeLessThan(
      body.indexOf("createServiceRoleClient()"),
    )
  })

  it("creates the local PMS patient before syncing that same patient to Parchment", () => {
    const body = functionBody("createDoctorPatientAndOpenParchmentAction")

    expect(body).toContain(".from(\"profiles\")")
    expect(body).toContain(".insert(insertPayload)")
    expect(body).toContain("await validateIntegration(doctorProfile.parchment_user_id)")
    expect(body).toContain("syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)")
    expect(body).toContain("`/embed/patients/${parchmentPatientId}/prescriptions`")
    expect(body.indexOf(".insert(insertPayload)")).toBeLessThan(
      body.indexOf("await validateIntegration(doctorProfile.parchment_user_id)"),
    )
    expect(body.indexOf("await validateIntegration(doctorProfile.parchment_user_id)")).toBeLessThan(
      body.indexOf("syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)"),
    )
  })

  it("lets doctors retry/open Parchment from an existing patient record", () => {
    const body = functionBody("openPatientInParchmentAction")

    expect(detailSource).toContain('aria-label="Patient file status"')
    expect(detailSource).toContain('label: "Identity"')
    expect(detailSource).toContain('label: "Duplicate"')
    expect(detailSource).toContain('label: "Parchment"')
    expect(detailSource).toContain('label: "Last request"')
    expect(detailSource).toContain("Prescribe in Parchment")
    expect(detailSource).toContain("ParchmentPrescribePanel")
    expect(detailSource).toContain("handleOpenParchmentPrescribe")
    expect(detailSource).toContain("patientId={patient.id}")
    expect(body).toContain("await validateIntegration(doctorProfile.parchment_user_id)")
    expect(body).toContain("syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)")
    expect(body).toContain("getSsoUrl(")
    expect(body.indexOf("await validateIntegration(doctorProfile.parchment_user_id)")).toBeLessThan(
      body.indexOf("syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)"),
    )
  })

  it("does not open placeholder blank tabs before a real Parchment SSO URL exists", () => {
    expect(addPatientDialogSource).not.toContain("about:blank")
    expect(detailSource).not.toContain("about:blank")
  })

  it("requires doctors to pick a confirmed autocomplete address before creating the patient", () => {
    expect(addPatientDialogSource).toContain("AddressAutocomplete")
    expect(addPatientDialogSource).toContain("requireVerified={true}")
    expect(addPatientDialogSource).toContain("onAddressSelect")
    expect(addPatientDialogSource).toContain("Select the address from the suggestions before creating the patient.")
  })

  it("lets doctors edit an existing PMS patient and immediately resync that patient to Parchment", () => {
    const body = functionBody("updateDoctorPatientAndSyncParchmentAction")

    expect(detailSource).toContain("EditPatientDialog")
    expect(editPatientDialogSource).toContain("Update and sync")
    expect(editPatientDialogSource).toContain("AddressAutocomplete")
    expect(body).toContain('requireRoleOrNull(["doctor", "admin"])')
    expect(body).toContain("validateDoctorPatientCreateInput(input)")
    expect(body).toContain(".from(\"profiles\")")
    expect(body).toContain(".update(updatePayload)")
    expect(body).toContain("await validateIntegration(doctorProfile.parchment_user_id)")
    expect(body).toContain("syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)")
    expect(body.indexOf(".update(updatePayload)")).toBeLessThan(
      body.indexOf("await validateIntegration(doctorProfile.parchment_user_id)"),
    )
    expect(body.indexOf("await validateIntegration(doctorProfile.parchment_user_id)")).toBeLessThan(
      body.indexOf("syncPatientToParchment(patient.id, doctorProfile.parchment_user_id)"),
    )
  })

  it("displays Parchment-synced prescriptions on the doctor patient record", () => {
    expect(detailPageSource).toContain(".from(\"prescriptions\")")
    expect(detailPageSource).toContain("parchment_reference")
    expect(detailPageSource).toContain("medications={data.medications}")
    expect(detailSource).toContain("interface PatientMedication")
    expect(detailSource).toContain("Active Prescriptions")
    expect(detailSource).toContain("parchment_reference")
  })
})
