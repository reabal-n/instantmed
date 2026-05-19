import { describe, expect, it } from "vitest"

import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"

function createQuery() {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const query = {
    not(...args: unknown[]) {
      calls.push({ method: "not", args })
      return query
    },
    or(...args: unknown[]) {
      calls.push({ method: "or", args })
      return query
    },
  }

  return { calls, query }
}

describe("filterReportableIntakes", () => {
  it("excludes rows flagged out of reporting and seeded E2E intakes by default", () => {
    const { calls, query } = createQuery()

    expect(filterReportableIntakes(query)).toBe(query)
    expect(calls).toEqual([
      {
        method: "or",
        args: ["exclude_from_reporting.is.null,exclude_from_reporting.eq.false"],
      },
      {
        method: "not",
        args: ["patient_id", "in", `(${SEEDED_E2E_PATIENT_PROFILE_ID})`],
      },
    ])
  })

  it("can include reporting-excluded rows while still keeping seeded E2E hidden", () => {
    const { calls, query } = createQuery()

    filterReportableIntakes(query, { includeExcludedFromReporting: true })

    expect(calls).toEqual([
      {
        method: "not",
        args: ["patient_id", "in", `(${SEEDED_E2E_PATIENT_PROFILE_ID})`],
      },
    ])
  })

  it("can opt in to seeded data only when explicitly requested", () => {
    const { calls, query } = createQuery()

    filterReportableIntakes(query, { allowSeeded: true })

    expect(calls).toEqual([
      {
        method: "or",
        args: ["exclude_from_reporting.is.null,exclude_from_reporting.eq.false"],
      },
    ])
  })
})
