import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const source = readFileSync(
  join(process.cwd(), "components/request/steps/patient-details-step.tsx"),
  "utf8",
)

// Regression guard for the P1.4 Medicare→IRN auto-advance false-error.
//
// The 10th-digit auto-advance focuses the IRN input synchronously inside the
// Medicare field's onChange, which fires that field's onBlur BEFORE React
// commits the 10th digit. Validating the `medicareNumber` state closure there
// saw only 9 digits and stamped a false "Invalid Medicare number" — and when
// the IRN was pre-filled (restored draft / back-nav / autofill) the patient
// never typed in the IRN, so the compensating onChange cleanup never ran and
// the destructive error persisted on the paid Rx/consult identity step.
describe("Medicare number auto-advance blur safety (P1.4)", () => {
  it("validates the live input value on blur, not the stale medicareNumber closure", () => {
    expect(source).not.toContain("onBlur={() => handleBlur('medicareNumber', medicareNumber)}")
    expect(source).toMatch(/onBlur=\{\(e\) => handleBlur\('medicareNumber', e\.target\.value/)
  })

  it("does not hop focus to the IRN when it is already filled", () => {
    // No focus jump → no synchronous mid-onChange blur to mis-validate.
    expect(source).toContain("raw.length === 10 && medicareNumber.length < 10 && !medicareIrn")
  })
})
