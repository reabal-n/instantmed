import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814171919_harden_audit_function_search_paths.sql",
  ),
  "utf8",
)

const mutableSearchPathSignatures = [
  "increment_cron_run_count()",
  "set_profile_referral_code()",
  "tg_intake_followups_touch()",
  "tg_partial_intakes_set_updated_at()",
  "guard_issued_certificate_status_change()",
  "normalize_au_phone(text)",
  "tg_profiles_identity_normalize()",
  "increment_auto_approval_attempts(uuid)",
  "prevent_role_change()",
  "upsert_exit_intent_capture(text, text)",
]

describe("audit search-path hardening migration", () => {
  it.each(mutableSearchPathSignatures)("pins public.%s", (signature) => {
    expect(migration).toContain(`ALTER FUNCTION public.${signature}`)
  })

  it("pins every audited function without replacing bodies or ACLs", () => {
    expect(migration.match(/SET search_path TO public, pg_temp;/g)).toHaveLength(10)
    expect(migration).not.toMatch(/CREATE(?: OR REPLACE)? FUNCTION/i)
    expect(migration).not.toMatch(/GRANT EXECUTE|REVOKE EXECUTE/i)
  })

  it("indexes the reconciliation actor foreign key", () => {
    expect(migration).toContain(
      "CREATE INDEX certificate_delivery_reconciliations_recorded_by_idx",
    )
    expect(migration).toContain(
      "ON public.certificate_delivery_reconciliations (recorded_by)",
    )
    expect(migration).toContain("WHERE recorded_by IS NOT NULL")
  })
})
