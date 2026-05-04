import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const clientSource = readFileSync(
  join(process.cwd(), "lib/parchment/client.ts"),
  "utf8",
)
const syncSource = readFileSync(
  join(process.cwd(), "lib/parchment/sync-patient.ts"),
  "utf8",
)

describe("Parchment stale patient recovery contract", () => {
  it("preserves Parchment HTTP status without exposing response bodies", () => {
    expect(clientSource).toContain("export class ParchmentApiError extends Error")
    expect(clientSource).toContain("readonly status: number")
    expect(clientSource).toContain("new ParchmentApiError(`Parchment update patient failed: ${res.status}`, res.status)")
    expect(clientSource).toContain("responseBytes: body.length")
    expect(clientSource).not.toContain("responseBody")
  })

  it("clears a stale Parchment patient id on 404 before creating a replacement", () => {
    expect(syncSource).toContain("error instanceof ParchmentApiError && error.status === 404")
    expect(syncSource).toContain("parchment_patient_id: null")
    expect(syncSource).toContain("Stored Parchment patient ID was stale; recreating patient")

    expect(syncSource.indexOf("parchment_patient_id: null")).toBeLessThan(
      syncSource.indexOf("const patientData = buildCreatePatientRequest"),
    )
    expect(syncSource.indexOf("const patientData = buildCreatePatientRequest")).toBeLessThan(
      syncSource.indexOf("const result = await createPatient"),
    )
  })
})
