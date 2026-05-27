import { describe, expect, it } from "vitest"

import {
  computePatientProfileCompleteness,
  PATIENT_COMPLETENESS_TOTAL,
  type PatientCompletenessInput,
} from "@/lib/data/patient-completeness"

const EMPTY: PatientCompletenessInput = {
  full_name: "",
  date_of_birth: null,
  email: null,
  phone: null,
  sex: null,
  address_line1: null,
  suburb: null,
  state: null,
  postcode: null,
  medicare_number: null,
}

const COMPLETE: PatientCompletenessInput = {
  full_name: "Ada Lovelace",
  date_of_birth: "1992-04-12",
  email: "ada@example.com",
  phone: "+61400000000",
  sex: "F",
  address_line1: "1 Test St",
  suburb: "Surry Hills",
  state: "NSW",
  postcode: "2010",
  medicare_number: "2123456701",
}

describe("computePatientProfileCompleteness", () => {
  it("tracks exactly 10 fields", () => {
    expect(PATIENT_COMPLETENESS_TOTAL).toBe(10)
    expect(computePatientProfileCompleteness(EMPTY).total).toBe(10)
  })

  it("returns 0 of 10 on a fully empty profile", () => {
    const result = computePatientProfileCompleteness(EMPTY)
    expect(result.filled).toBe(0)
    expect(result.ratio).toBe(0)
    expect(result.isComplete).toBe(false)
    expect(result.missingFields.map((f) => f.key)).toEqual([
      "full_name",
      "date_of_birth",
      "email",
      "phone",
      "sex",
      "address_line1",
      "suburb",
      "state",
      "postcode",
      "medicare_number",
    ])
  })

  it("counts partially filled profiles correctly", () => {
    const result = computePatientProfileCompleteness({
      ...EMPTY,
      full_name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+61400000000",
    })
    expect(result.filled).toBe(3)
    expect(result.total).toBe(10)
    expect(result.ratio).toBeCloseTo(0.3, 5)
    expect(result.isComplete).toBe(false)
    expect(result.missingFields.map((f) => f.key)).not.toContain("full_name")
    expect(result.missingFields.map((f) => f.key)).toContain("medicare_number")
  })

  it("shows 9 of 10 for a Medicare-less but otherwise complete profile", () => {
    const result = computePatientProfileCompleteness({
      ...COMPLETE,
      medicare_number: null,
    })
    expect(result.filled).toBe(9)
    expect(result.total).toBe(10)
    expect(result.isComplete).toBe(false)
    expect(result.missingFields).toEqual([{ key: "medicare_number", label: "Medicare number" }])
  })

  it("does not count all-zero Medicare placeholders as complete", () => {
    const result = computePatientProfileCompleteness({
      ...COMPLETE,
      medicare_number: "0000000000",
    })

    expect(result.filled).toBe(9)
    expect(result.isComplete).toBe(false)
    expect(result.missingFields).toEqual([{ key: "medicare_number", label: "Medicare number" }])
  })

  it("marks a fully-filled profile complete", () => {
    const result = computePatientProfileCompleteness(COMPLETE)
    expect(result.filled).toBe(10)
    expect(result.ratio).toBe(1)
    expect(result.isComplete).toBe(true)
    expect(result.missingFields).toEqual([])
  })

  it("treats empty strings, whitespace, null, and undefined as not filled", () => {
    const result = computePatientProfileCompleteness({
      ...COMPLETE,
      full_name: "",
      phone: "   ",
      email: null,
    })
    expect(result.filled).toBe(7)
    const missing = result.missingFields.map((f) => f.key)
    expect(missing).toContain("full_name")
    expect(missing).toContain("phone")
    expect(missing).toContain("email")
  })

  it("returns missing fields in the canonical display order", () => {
    const result = computePatientProfileCompleteness({
      ...COMPLETE,
      full_name: "",
      address_line1: null,
      medicare_number: null,
    })
    expect(result.missingFields.map((f) => f.key)).toEqual([
      "full_name",
      "address_line1",
      "medicare_number",
    ])
  })
})
