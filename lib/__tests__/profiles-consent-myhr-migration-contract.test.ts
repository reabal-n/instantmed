import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260814123000_restore_profiles_consent_myhr.sql",
)
const SCHEMA_VALIDATION_PATH = join(
  process.cwd(),
  "lib/validation/schema-validation.ts",
)
const BACKEND_SMOKE_PATH = join(process.cwd(), "scripts/smoke-backend.ts")

describe("profiles My Health Record consent schema contract", () => {
  it("restores the production column shape without rewriting profile data", () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true)

    const sql = readFileSync(MIGRATION_PATH, "utf8")
      .replace(/--.*$/gm, "")
      .trim()

    expect(sql).toBe(
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_myhr BOOLEAN DEFAULT FALSE;",
    )
    expect(sql).not.toMatch(/\bUPDATE\b/i)
    expect(sql).not.toMatch(/\bNOT\s+NULL\b/i)
  })

  it("treats the auth-hydration column as startup-critical", () => {
    const source = readFileSync(SCHEMA_VALIDATION_PATH, "utf8")
    const profilesColumns = source.match(/profiles:\s*\[([\s\S]*?)\],/)?.[1] ?? ""

    expect(profilesColumns).toContain('"consent_myhr"')
  })

  it("checks the auth-hydration column in the read-only backend smoke", () => {
    const source = readFileSync(BACKEND_SMOKE_PATH, "utf8")
    const profilesColumns = source.match(/profiles:\s*\[([\s\S]*?)\],/)?.[1] ?? ""

    expect(profilesColumns).toContain('"consent_myhr"')
  })
})
