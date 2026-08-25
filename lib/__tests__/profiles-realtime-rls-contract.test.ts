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

describe("authenticated is_doctor RLS policies", () => {
  it("does not evaluate the authenticated-only helper for anonymous connections", () => {
    expect(normalizedMigration).toContain(
      'CREATE POLICY "profiles_select_own_or_doctor" ON public.profiles FOR SELECT TO authenticated',
    )
    expect(normalizedMigration).toContain(
      "CREATE POLICY doctors_manage_documents ON public.documents FOR ALL TO authenticated",
    )
    expect(normalizedMigration).toContain(
      'CREATE POLICY "Doctors can insert verifications" ON public.document_verifications FOR INSERT TO authenticated',
    )
    expect(normalizedMigration).toContain("auth_user_id = (select auth.uid())")
    expect(normalizedMigration).toContain("(select public.is_doctor())")
    expect(normalizedMigration).not.toContain("TO anon")
  })

  it("fails migration apply when any protected policy is absent or has the wrong role", () => {
    expect(normalizedMigration).toContain("LEFT JOIN pg_catalog.pg_policies AS policy")
    expect(normalizedMigration).toContain("ARRAY['authenticated']::name[]")
    expect(normalizedMigration).toContain("RAISE EXCEPTION 'Authenticated is_doctor RLS policy verification failed'")
    expect(normalizedMigration).toContain("END; $verify_authenticated_is_doctor_policies$;")
  })
})
