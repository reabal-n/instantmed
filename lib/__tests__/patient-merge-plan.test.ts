import { describe, expect, it } from "vitest"

import {
  getPatientProfileMergePreflightPlan,
  PATIENT_PROFILE_MERGE_REFERENCE_TABLES,
} from "@/lib/doctor/patient-merge-plan"

describe("patient profile merge plan", () => {
  it("covers the patient-owned tables that must move before duplicate profiles are archived", () => {
    const tableNames = PATIENT_PROFILE_MERGE_REFERENCE_TABLES.map((table) => table.table)

    expect(tableNames).toEqual(expect.arrayContaining([
      "intakes",
      "issued_certificates",
      "email_outbox",
      "patient_notes",
      "patient_health_profiles",
      "consents",
    ]))
  })

  it("builds a non-destructive preflight plan for duplicate profile merges", () => {
    const plan = getPatientProfileMergePreflightPlan("canonical", ["dupe-a", "dupe-b"])

    expect(plan.canonicalPatientId).toBe("canonical")
    expect(plan.duplicatePatientIds).toEqual(["dupe-a", "dupe-b"])
    expect(plan.updateOperations).toContainEqual({
      table: "intakes",
      column: "patient_id",
      fromPatientIds: ["dupe-a", "dupe-b"],
      toPatientId: "canonical",
    })
  })

  it("rejects a merge plan that tries to merge the canonical profile into itself", () => {
    expect(() => getPatientProfileMergePreflightPlan("canonical", ["dupe-a", "canonical"])).toThrow(
      "Duplicate profile list cannot include the canonical profile",
    )
  })
})
