import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("E2E seed contract", () => {
  it("resets the canonical intake in place instead of deleting and reinserting it", () => {
    const seedSource = read("scripts/e2e/seed.ts")

    expect(seedSource).toContain("async function resetExistingIntake")
    expect(seedSource).toContain("Existing intake is terminal")
    expect(seedSource).not.toMatch(
      /from\("intakes"\)\s*\.delete\(\)\s*\.eq\("id", INTAKE_ID\)/,
    )
  })

  it("keeps E2E fixture self-heal aligned with profile-id auth bypass", () => {
    const helperSource = read("e2e/helpers/db.ts")

    expect(helperSource).toContain("async function ensureE2EPatientProfile")
    expect(helperSource).toContain("auth_user_id: null")
    expect(helperSource).not.toContain("auth_user_id: E2E_PATIENT_ID")
    expect(helperSource).toContain("async function ensureE2EService")
    expect(helperSource).toContain("await ensureE2ESeedDependencies(supabase, serviceId)")
  })
})
