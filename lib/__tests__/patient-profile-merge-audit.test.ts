import { describe, expect, it } from "vitest"

import { summarizeMergeReferenceCounts } from "@/lib/data/patient-profile-merge-audit"

describe("patient profile merge audit", () => {
  it("summarizes moved references in descending order and ignores zero-count tables", () => {
    expect(summarizeMergeReferenceCounts({
      intakes: 4,
      email_outbox: 1,
      consents: 0,
      patient_notes: 2,
    })).toEqual({
      total: 7,
      movedTables: [
        { table: "intakes", count: 4 },
        { table: "patient_notes", count: 2 },
        { table: "email_outbox", count: 1 },
      ],
    })
  })
})
