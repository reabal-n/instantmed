import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const patientDetailsSource = readFileSync(
  join(process.cwd(), "components/request/steps/patient-details-step.tsx"),
  "utf8",
)
const addressAutocompleteSource = readFileSync(
  join(process.cwd(), "components/ui/address-autocomplete.tsx"),
  "utf8",
)

describe("prescribing street-address UI contract", () => {
  it("shows the street-number blocker in the patient details step before checkout", () => {
    expect(patientDetailsSource).toContain("hasAustralianStreetNumber")
    expect(patientDetailsSource).toContain("STREET_NUMBER_REQUIRED_ERROR")
    expect(patientDetailsSource).toContain("addressComplete")
  })

  it("explains the blocker when the patient leaves a manually entered street line", () => {
    expect(addressAutocompleteSource).toContain("onBlur?: () => void")
    expect(addressAutocompleteSource).toContain("onBlur={onBlur}")
    expect(patientDetailsSource).toContain("onBlur={() => handleBlur('addressLine1', addressLine1)}")
    expect(patientDetailsSource).toMatch(
      /<AddressAutocomplete[\s\S]*?error=\{touched\.addressLine1 \? errors\.addressLine1 : undefined\}/,
    )
  })
})
