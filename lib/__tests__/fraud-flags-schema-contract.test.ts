import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260502011000_create_fraud_flags_table.sql",
)

describe("fraud flags schema contract", () => {
  it("creates the table used by checkout persistence and admin finance visibility", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.fraud_flags")
    expect(sql).toContain("intake_id UUID REFERENCES public.intakes(id)")
    expect(sql).toContain("patient_id UUID REFERENCES public.profiles(id)")
    expect(sql).toContain("flag_type TEXT NOT NULL")
    expect(sql).toContain("severity TEXT NOT NULL")
    expect(sql).toContain("details JSONB NOT NULL DEFAULT '{}'")
    expect(sql).toContain("ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY")
  })

  it("keeps service writes available while limiting human reads to admins", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")

    expect(sql).toContain('CREATE POLICY "service_role_manage_fraud_flags"')
    expect(sql).toContain("(select auth.role()) = 'service_role'")
    expect(sql).toContain('CREATE POLICY "admins_view_fraud_flags"')
    expect(sql).toContain("p.role::text = 'admin'")
  })
})
