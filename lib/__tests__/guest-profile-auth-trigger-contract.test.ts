import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260502010000_link_single_guest_profile_on_auth.sql",
)

describe("guest profile auth trigger contract", () => {
  it("links one deterministic guest profile instead of bulk-updating duplicate email matches", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.handle_new_user()")
    expect(sql).toContain("v_guest_profile_id")
    expect(sql).toContain("LIMIT 1")
    expect(sql).toContain("p.id = v_guest_profile_id")
    expect(sql).not.toMatch(/WHERE\s+LOWER\(email\)\s*=\s*LOWER\(NEW\.email\)\s+AND\s+auth_user_id\s+IS\s+NULL;/i)
  })
})
