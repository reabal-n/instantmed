import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildParchmentIntakeRedirectPath,
  buildParchmentPatientProfileRedirectPath,
  parseParchmentIntakeCorrelation,
} from "@/lib/parchment/intake-correlation"

describe("Parchment intake correlation", () => {
  it("is backed by the unique non-PHI database-generated request reference", () => {
    const baseline = readFileSync(
      join(process.cwd(), "supabase/migrations/20240101000000_baseline.sql"),
      "utf8",
    )

    expect(baseline).toContain("reference_number TEXT UNIQUE NOT NULL DEFAULT")
    expect(baseline).toContain("'IM-' || TO_CHAR(NOW(), 'YYYYMMDD')")
    expect(baseline).toContain("UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6))")
  })

  it("accepts the unique database-generated request reference within Parchment's limit", () => {
    const correlation = parseParchmentIntakeCorrelation("IM-20260730-A1B2C3")

    expect(correlation).toBe("IM-20260730-A1B2C3")
    expect(correlation?.length).toBeLessThanOrEqual(30)
  })

  it("rejects raw UUIDs, patient identifiers, and oversized values", () => {
    expect(parseParchmentIntakeCorrelation("33333333-3333-4333-8333-333333333333")).toBeNull()
    expect(parseParchmentIntakeCorrelation("patient@example.com")).toBeNull()
    expect(parseParchmentIntakeCorrelation("Patient Name")).toBeNull()
    expect(parseParchmentIntakeCorrelation(`IM-20260730-${"A".repeat(31)}`)).toBeNull()
  })

  it("puts only the opaque request reference in reserved_1", () => {
    const path = buildParchmentIntakeRedirectPath(
      "parchment/patient",
      "IM-20260730-A1B2C3",
    )

    expect(path).toBe(
      "/embed/patients/parchment%2Fpatient/prescriptions?reserved_1=IM-20260730-A1B2C3",
    )
    expect(path).not.toContain("33333333-3333-4333-8333-333333333333")
  })

  it("marks patient-profile prescribing as explicitly standalone", () => {
    expect(buildParchmentPatientProfileRedirectPath("parchment/patient")).toBe(
      "/embed/patients/parchment%2Fpatient/prescriptions?reserved_1=IM-PATIENT-PROFILE",
    )
  })
})
