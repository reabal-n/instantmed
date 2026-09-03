import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260502011000_create_fraud_flags_table.sql",
)
const REVIEW_STATE_MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260902090000_converge_fraud_flag_review_state.sql",
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

  it("converges legacy boolean review state to the app-owned status model", () => {
    const sql = readFileSync(REVIEW_STATE_MIGRATION_PATH, "utf8")

    expect(sql).toContain(
      'DROP POLICY IF EXISTS "doctors_view_fraud_flags" ON public.fraud_flags',
    )
    expect(sql).toContain(
      'DROP POLICY IF EXISTS "doctors_update_fraud_flags" ON public.fraud_flags',
    )
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS status TEXT")
    expect(sql).toContain("column_name = 'reviewed'")
    expect(sql).toContain("WHEN reviewed IS TRUE THEN 'reviewed'")
    expect(sql).toContain("ALTER COLUMN status SET DEFAULT 'open'")
    expect(sql).toContain("ALTER COLUMN status SET NOT NULL")
    expect(sql).toContain("fraud_flags_status_check")
    expect(sql).toContain("status IN ('open', 'reviewed', 'dismissed')")
  })
})
