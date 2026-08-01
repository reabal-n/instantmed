import { describe, expect, it } from "vitest"

import {
  isSafeGenericMedicationName,
  type MedicationCatalogRow,
  normalizeGenericMedicationQuery,
  resolveGenericMedicationNameFromRows,
} from "@/lib/clinical/generic-medication-resolver"

const CURATED_CATALOG: MedicationCatalogRow[] = [
  { name: "Sertraline", brand_names: ["Zoloft"] },
  { name: "Venlafaxine", brand_names: ["Efexor", "Effexor"] },
  { name: "Budesonide/Formoterol", brand_names: ["Symbicort"] },
  { name: "Rosuvastatin", brand_names: ["Crestor"] },
]

describe("generic medication resolver", () => {
  it.each([
    ["Zoloft 100 mg tablet", "Sertraline"],
    ["Sertraline 100mg", "Sertraline"],
    ["Effexor 75mg XR capsule", "Venlafaxine"],
    ["Symbicort 200/6 mcg inhaler", "Budesonide/Formoterol"],
  ])("resolves %s from an exact curated generic or brand alias", (patientEntry, genericName) => {
    expect(resolveGenericMedicationNameFromRows(patientEntry, CURATED_CATALOG)).toEqual({
      status: "resolved",
      genericName,
    })
  })

  it("does not turn a partial brand into a match", () => {
    expect(resolveGenericMedicationNameFromRows("Crest", CURATED_CATALOG)).toEqual({
      status: "unresolved",
      genericName: null,
    })
  })

  it("fails closed when an exact alias maps to multiple generic identities", () => {
    expect(resolveGenericMedicationNameFromRows("Shared Brand 10 mg tablet", [
      { name: "Ingredient one", brand_names: ["Shared Brand"] },
      { name: "Ingredient two", brand_names: ["Shared Brand"] },
    ])).toEqual({
      status: "ambiguous",
      genericName: null,
    })
  })

  it("deduplicates the same generic identity case-insensitively", () => {
    expect(resolveGenericMedicationNameFromRows("Shared Brand", [
      { name: "Sertraline", brand_names: ["Shared Brand"] },
      { name: "sertraline", brand_names: ["Shared Brand"] },
    ])).toEqual({
      status: "resolved",
      genericName: "Sertraline",
    })
  })

  it.each([
    "Sertraline 100 mg",
    "Sertraline tablet",
    "Sertraline once daily",
    "Sertraline\nConfirm directions before prescribing",
    "Sertraline: patient reports current dose",
    `${"Verylongingredient ".repeat(8)}name`,
  ])("rejects unsafe clipboard output %j", (unsafeGenericName) => {
    expect(resolveGenericMedicationNameFromRows("Unsafe Brand", [{
      name: unsafeGenericName,
      brand_names: ["Unsafe Brand"],
    }])).toEqual({
      status: "unsafe",
      genericName: null,
    })
  })

  it("keeps safe combination-ingredient punctuation", () => {
    expect(isSafeGenericMedicationName("Amoxicillin/Clavulanate")).toBe(true)
    expect(isSafeGenericMedicationName("Sulfamethoxazole + Trimethoprim")).toBe(true)
  })

  it("ignores malformed catalog rows", () => {
    const malformedRows = [
      { name: null, brand_names: ["Null Brand"] },
      { name: "", brand_names: ["Empty Brand"] },
      { name: "Sertraline", brand_names: null },
    ] satisfies MedicationCatalogRow[]

    expect(resolveGenericMedicationNameFromRows("Null Brand", malformedRows)).toEqual({
      status: "unresolved",
      genericName: null,
    })
    expect(resolveGenericMedicationNameFromRows("Sertraline", malformedRows)).toEqual({
      status: "resolved",
      genericName: "Sertraline",
    })
  })

  it("normalizes only exact and conservative dose/form variants", () => {
    expect(normalizeGenericMedicationQuery("Effexor 75 mg XR capsule")).toEqual([
      "effexor 75 mg xr capsule",
      "effexor",
      "efexor",
    ])
    expect(normalizeGenericMedicationQuery("Crest")).toEqual(["crest"])
    expect(normalizeGenericMedicationQuery("Sertraline 100 mg once daily")).toEqual([
      "sertraline 100 mg once daily",
      "sertraline once daily",
    ])
  })
})
