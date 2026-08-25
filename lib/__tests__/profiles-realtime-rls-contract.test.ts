import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260825073433_scope_profiles_realtime_policy_to_authenticated.sql",
  ),
  "utf8",
)

const normalizedMigration = migrationSource.replace(/\s+/g, " ").trim()

describe("profiles Realtime RLS policy", () => {
  it("does not evaluate the authenticated-only is_doctor helper for anonymous connections", () => {
    expect(normalizedMigration).toContain(
      'CREATE POLICY "profiles_select_own_or_doctor" ON public.profiles FOR SELECT TO authenticated',
    )
    expect(normalizedMigration).toContain("auth_user_id = (select auth.uid())")
    expect(normalizedMigration).toContain("(select public.is_doctor())")
    expect(normalizedMigration).not.toContain("TO anon")
  })
})
