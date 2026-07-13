import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

type FunctionPolicy = "authenticated" | "owner_only" | "service_role" | "trigger"

const expectedPolicies = new Map<string, FunctionPolicy>([
  ["public.add_to_webhook_dead_letter(text, text, text, uuid, text, text, jsonb)", "service_role"],
  ["public.approve_draft(uuid, uuid, jsonb)", "service_role"],
  ["public.archive_old_audit_logs(integer)", "service_role"],
  ["public.audit_intake_created()", "trigger"],
  ["public.audit_intake_status_change()", "trigger"],
  ["public.audit_phi_access()", "trigger"],
  ["public.audit_phi_access(text, uuid, text, uuid, text, text)", "service_role"],
  ["public.check_employer_email_rate_limit(uuid)", "service_role"],
  ["public.cleanup_expired_partial_intakes()", "service_role"],
  ["public.count_intakes_today_sydney()", "service_role"],
  ["public.create_clinical_summaries_table()", "owner_only"],
  ["public.create_notification(uuid, text, text, text, text, jsonb)", "owner_only"],
  ["public.e2e_reset_intake_status(uuid, text)", "service_role"],
  ["public.expire_pending_payment_intakes(integer)", "service_role"],
  ["public.get_email_outbox_stats()", "service_role"],
  ["public.get_my_profile_id()", "authenticated"],
  ["public.get_or_create_email_preferences(uuid)", "service_role"],
  ["public.get_patient_notes(uuid, text, integer)", "owner_only"],
  ["public.get_queue_position(uuid)", "service_role"],
  ["public.grant_consent(uuid, consent_type, text, text, text, text)", "owner_only"],
  ["public.handle_new_user()", "trigger"],
  ["public.increment_auto_approval_attempts(uuid)", "service_role"],
  ["public.is_doctor()", "authenticated"],
  ["public.is_doctor_or_admin()", "owner_only"],
  ["public.is_patient()", "authenticated"],
  [
    "public.log_audit_event(audit_event_type, text, uuid, uuid, uuid, text, jsonb, jsonb, jsonb, text, text, text)",
    "owner_only",
  ],
  [
    "public.log_ai_audit(uuid, ai_audit_action, draft_type, uuid, uuid, ai_actor_type, character varying, character varying, character varying, integer, integer, integer, boolean, boolean, jsonb, jsonb, jsonb, text)",
    "service_role",
  ],
  ["public.log_certificate_edit()", "trigger"],
  ["public.log_certificate_edit(uuid, uuid, uuid, text, text, text, text)", "service_role"],
  [
    "public.log_compliance_event(compliance_event_type, uuid, text, uuid, text, boolean, text, text, boolean, boolean, boolean, boolean, text, jsonb, inet, text)",
    "service_role",
  ],
  ["public.log_intake_event(uuid, text, text, uuid, intake_status, intake_status, jsonb)", "service_role"],
  ["public.medications_search_vector_update()", "trigger"],
  ["public.merge_guest_profile(uuid, uuid)", "service_role"],
  ["public.notify_on_intake_status_change()", "trigger"],
  ["public.payment_exists_for_session(text)", "service_role"],
  [
    "public.record_admin_action(uuid, admin_action_type, intake_status, text, text, text, jsonb, jsonb)",
    "owner_only",
  ],
  ["public.reject_draft(uuid, uuid, text)", "service_role"],
  ["public.release_intake_claim(uuid, uuid)", "service_role"],
  ["public.release_stale_intake_claims(integer)", "service_role"],
  ["public.search_medications(text, integer)", "service_role"],
  ["public.try_process_stripe_event(text, text, uuid, text, jsonb)", "service_role"],
  ["public.update_certificate_edit_count()", "trigger"],
  ["public.update_email_outbox_updated_at()", "trigger"],
  ["public.update_repeat_rx_updated_at()", "trigger"],
  ["public.upsert_exit_intent_capture(text, text)", "service_role"],
])

const optionalSignatures = new Set([
  "public.audit_intake_created()",
  "public.audit_intake_status_change()",
  "public.create_clinical_summaries_table()",
  "public.create_notification(uuid, text, text, text, text, jsonb)",
  "public.get_patient_notes(uuid, text, integer)",
  "public.grant_consent(uuid, consent_type, text, text, text, text)",
  "public.is_doctor_or_admin()",
  "public.log_audit_event(audit_event_type, text, uuid, uuid, uuid, text, jsonb, jsonb, jsonb, text, text, text)",
  "public.notify_on_intake_status_change()",
  "public.record_admin_action(uuid, admin_action_type, intake_status, text, text, text, jsonb, jsonb)",
])

const migrationsDirectory = join(process.cwd(), "supabase/migrations")
const migrationFile = readdirSync(migrationsDirectory).find((file) =>
  file.endsWith("_lock_down_security_definer_rpc_acls.sql"),
)
const migrationSource = migrationFile
  ? readFileSync(join(migrationsDirectory, migrationFile), "utf8")
  : ""
const checkerPath = join(process.cwd(), "scripts/check-security-definer-acls.ts")
const checkerSource = existsSync(checkerPath) ? readFileSync(checkerPath, "utf8") : ""
const emailPreferencesSource = readFileSync(
  join(process.cwd(), "app/actions/email-preferences.ts"),
  "utf8",
)
const packageSource = readFileSync(join(process.cwd(), "package.json"), "utf8")

function readPolicyEntries(
  source: string,
): Map<string, { policy: FunctionPolicy; requiredPresence: boolean }> {
  const policyValuesStart = source.indexOf("      VALUES\n")
  const policyValuesEnd = source.indexOf(
    "    ) AS policy(function_signature, access_policy, required_presence)",
    policyValuesStart,
  )
  const policyValues = source.slice(policyValuesStart, policyValuesEnd)
  const entries = [
    ...policyValues.matchAll(
      /\('([^']+)', '(authenticated|owner_only|service_role|trigger)', (true|false)\)/g,
    ),
  ].map(
    (match) =>
      [
        match[1],
        {
          policy: match[2] as FunctionPolicy,
          requiredPresence: match[3] === "true",
        },
      ] as const,
  )

  expect(entries).toHaveLength(new Set(entries.map(([signature]) => signature)).size)
  return new Map(entries)
}

describe("SECURITY DEFINER ACL ratchet", () => {
  it("classifies and locks down every previously exposed function", () => {
    const expectedEntries = new Map(
      [...expectedPolicies].map(([signature, policy]) => [
        signature,
        { policy, requiredPresence: !optionalSignatures.has(signature) },
      ]),
    )

    expect(migrationFile).toBeDefined()
    expect(readPolicyEntries(migrationSource)).toEqual(expectedEntries)
    expect(expectedPolicies).toHaveLength(45)
    expect([...expectedPolicies.values()].filter((policy) => policy === "service_role")).toHaveLength(25)
    expect([...expectedPolicies.values()].filter((policy) => policy === "authenticated")).toHaveLength(3)
    expect([...expectedPolicies.values()].filter((policy) => policy === "owner_only")).toHaveLength(7)
    expect([...expectedPolicies.values()].filter((policy) => policy === "trigger")).toHaveLength(10)
    expect(optionalSignatures).toHaveLength(10)

    expect(migrationSource).toContain(
      "REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role",
    )
    expect(migrationSource).toContain("GRANT EXECUTE ON FUNCTION %s TO service_role")
    expect(migrationSource).toContain("GRANT EXECUTE ON FUNCTION %s TO authenticated")
    expect(migrationSource).toContain(
      "SECURITY DEFINER ACL policy was not applied exactly",
    )
    expect(migrationSource).toContain(
      "IF function_oid IS NULL AND required_presence THEN",
    )

    const verifierSource = migrationSource.slice(
      migrationSource.indexOf(
        "CREATE OR REPLACE FUNCTION public.security_definer_acl_violations()",
      ),
    )
    expect(verifierSource).not.toContain("is_doctor_or_admin")
  })

  it("removes unsafe default function privileges for the migration owner", () => {
    expect(migrationSource).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public",
    )
    expect(migrationSource.match(/REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated/g)).toHaveLength(1)
  })

  it("installs a service-only live catalog verifier and fails the migration on violations", () => {
    expect(migrationSource).toContain(
      "CREATE OR REPLACE FUNCTION public.security_definer_acl_violations()",
    )
    expect(migrationSource).toContain("SECURITY INVOKER")
    expect(migrationSource).toContain("SET search_path = ''")
    expect(migrationSource).toContain(
      "REVOKE EXECUTE ON FUNCTION public.security_definer_acl_violations() FROM PUBLIC, anon, authenticated",
    )
    expect(migrationSource).toContain(
      "GRANT EXECUTE ON FUNCTION public.security_definer_acl_violations() TO service_role",
    )
    expect(migrationSource).toContain("RAISE EXCEPTION 'SECURITY DEFINER ACL verification failed")
    expect(migrationSource).not.toContain("pg_catalog.coalesce")
    expect(migrationSource).toContain(
      "IF COALESCE(pg_catalog.array_length(violations, 1), 0) > 0 THEN",
    )

    expect(checkerSource).toContain('.rpc("security_definer_acl_violations")')
    expect(checkerSource).toContain("process.exitCode = 1")
    expect(packageSource).toContain(
      '"db:check:security-definer-acls": "tsx scripts/check-security-definer-acls.ts"',
    )
  })

  it("moves the preference upsert behind the service-role boundary", () => {
    const updateAction = emailPreferencesSource.slice(
      emailPreferencesSource.indexOf("export const updateEmailPreferences"),
      emailPreferencesSource.indexOf("export async function unsubscribeFromMarketing"),
    )

    expect(updateAction).toContain("const serviceClient = createServiceRoleClient()")
    expect(updateAction).toContain('serviceClient.rpc("get_or_create_email_preferences"')
    expect(updateAction).not.toContain('supabase.rpc("get_or_create_email_preferences"')
  })

  it("requires later SECURITY DEFINER migrations to include an explicit ACL decision", () => {
    expect(migrationFile).toBeDefined()
    if (!migrationFile) return

    const laterSecurityDefinerMigrations = readdirSync(migrationsDirectory)
      .filter((file) => file > migrationFile && file.endsWith(".sql"))
      .map((file) => ({
        file,
        source: readFileSync(join(migrationsDirectory, file), "utf8"),
      }))
      .filter(({ source }) => /SECURITY\s+DEFINER/i.test(source))

    for (const migration of laterSecurityDefinerMigrations) {
      expect(migration.source, migration.file).toMatch(
        /REVOKE\s+(?:ALL|EXECUTE)[\s\S]+FROM\s+PUBLIC,\s*anon,\s*authenticated/i,
      )
    }
  })
})
