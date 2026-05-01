import { describe, expect, it, vi } from "vitest"

import {
  filterSeededE2EIntakes,
  SEEDED_E2E_PATIENT_PROFILE_ID,
  shouldIncludeSeededE2EData,
} from "@/lib/data/seeded-e2e-data"

function createQueryRecorder() {
  return {
    calls: [] as Array<[string, string, string]>,
    not(column: string, operator: string, value: string) {
      this.calls.push([column, operator, value])
      return this
    },
  }
}

describe("seeded E2E data guards", () => {
  it("hides seeded E2E intakes from live operational reads by default", () => {
    expect(shouldIncludeSeededE2EData({})).toBe(false)

    const query = createQueryRecorder()
    const returned = filterSeededE2EIntakes(query, {})

    expect(returned).toBe(query)
    expect(query.calls).toEqual([
      ["patient_id", "in", `(${SEEDED_E2E_PATIENT_PROFILE_ID})`],
    ])
  })

  it("keeps seeded E2E intakes visible during test runs", () => {
    for (const env of [
      { PLAYWRIGHT: "1" },
      { E2E: "true" },
      { E2E_MODE: "true" },
      { NODE_ENV: "test" },
    ]) {
      expect(shouldIncludeSeededE2EData(env)).toBe(true)

      const query = createQueryRecorder()
      filterSeededE2EIntakes(query, env)

      expect(query.calls).toEqual([])
    }
  })

  it("keeps the production helper tied to the actual runtime environment", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")
    try {
      expect(shouldIncludeSeededE2EData()).toBe(true)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
