import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260501060000_restrict_feature_flag_updates_to_admins.sql",
)

describe("feature flag RLS contract", () => {
  it("keeps feature flag writes restricted to admins", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")

    expect(sql).toContain('DROP POLICY IF EXISTS "doctors_update_feature_flags"')
    expect(sql).toContain('CREATE POLICY "admins_update_feature_flags"')
    expect(sql).toContain("profiles.role = 'admin'")
    expect(sql).not.toMatch(/role\s*=\s*ANY\s*\(\s*ARRAY\['doctor'/i)
  })
})
