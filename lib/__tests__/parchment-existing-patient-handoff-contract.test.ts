import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`)
  expect(start).toBeGreaterThanOrEqual(0)
  const nextExport = source.indexOf("\nexport async function ", start + 1)
  return source.slice(start, nextExport === -1 ? source.length : nextExport)
}

describe("existing Parchment patient handoff", () => {
  it("reuses a linked patient before attempting a demographic refresh", () => {
    const source = read("lib/parchment/sync-patient.ts")
    const body = functionBody(source, "syncPatientToParchment")
    const reuseGuard = body.indexOf('existingPatientMode === "reuse"')
    const updateCall = body.indexOf("await updatePatient(")

    expect(reuseGuard).toBeGreaterThanOrEqual(0)
    expect(reuseGuard).toBeLessThan(updateCall)
    expect(body.slice(reuseGuard, updateCall)).toContain("return existing.parchment_patient_id")
  })

  it("uses reuse mode for normal prescribing opens but not explicit identity sync", () => {
    const intakeActions = read("app/actions/parchment.ts")
    const manualActions = read("app/actions/manual-patient.ts")
    const patientActions = read("app/doctor/patients/actions.ts")

    expect(functionBody(intakeActions, "getParchmentPrescribeUrlAction"))
      .toContain('existingPatientMode: "reuse"')
    expect(functionBody(manualActions, "getPatientParchmentPrescribeUrlAction"))
      .toContain('existingPatientMode: "reuse"')
    expect(functionBody(patientActions, "openPatientInParchmentAction"))
      .toContain('existingPatientMode: "reuse"')

    expect(functionBody(manualActions, "syncPatientParchmentProfileAction"))
      .not.toContain('existingPatientMode: "reuse"')
    expect(functionBody(patientActions, "updateDoctorPatientAndSyncParchmentAction"))
      .not.toContain('existingPatientMode: "reuse"')
  })
})
