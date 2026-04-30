import { describe, expect, it } from "vitest"

import { buildPBSMedicationSearchQueries } from "@/lib/clinical/pbs-client"

describe("buildPBSMedicationSearchQueries", () => {
  it("removes strength and form words so patient label text can still match PBS names", () => {
    expect(buildPBSMedicationSearchQueries("Rosuvastatin 10 mg tablet")).toContain("rosuvastatin")
  })

  it("corrects common medication typos inside longer queries", () => {
    expect(buildPBSMedicationSearchQueries("Symbicourt 100/3 inhaler")[0]).toBe("symbicort")
  })

  it("keeps active ingredient terms from combination medicines", () => {
    const queries = buildPBSMedicationSearchQueries("Budesonide + formoterol pressurised inhalation 100 micrograms")

    expect(queries).toContain("budesonide")
    expect(queries).toContain("formoterol")
  })
})
