import { describe, expect, it } from "vitest"

import {
  buildPBSMedicationSearchQueries,
  mapPBSItemsToSearchResults,
} from "@/lib/clinical/pbs-client"

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

  it("maps PBS brand rows with product, active ingredient, form and manufacturer display fields", () => {
    const [result] = mapPBSItemsToSearchResults([
      {
        pbs_code: "1234A",
        drug_name: "budesonide + formoterol",
        li_drug_name: "budesonide + formoterol",
        li_form: "100 micrograms/3 micrograms pressurised inhalation",
        brand_name: "Symbicort Rapihaler",
        manufacturer_code: "AZ",
        manufacturer_name: "AstraZeneca Pty Ltd",
      },
    ], 10)

    expect(result).toMatchObject({
      pbs_code: "1234A",
      drug_name: "Symbicort Rapihaler",
      brand_name: "Symbicort Rapihaler",
      active_ingredient: "budesonide + formoterol",
      form: "100 micrograms/3 micrograms pressurised inhalation",
      manufacturer: "AstraZeneca Pty Ltd",
    })
  })
})
