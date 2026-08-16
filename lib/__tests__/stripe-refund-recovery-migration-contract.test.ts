import { readdirSync,readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATTERN =
  /^20260816\d*_harden_stripe_refund_recovery\.sql$/

function readRecoveryMigration(): string {
  const migrationDirectory = join(process.cwd(), "supabase/migrations")
  const matches = readdirSync(migrationDirectory).filter((file) =>
    MIGRATION_PATTERN.test(file),
  )

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one 20260816*_harden_stripe_refund_recovery.sql migration, found ${matches.length}`,
    )
  }

  return readFileSync(join(migrationDirectory, matches[0]!), "utf8")
}

function functionBody(migration: string, functionName: string): string {
  const start = migration.indexOf(
    `CREATE OR REPLACE FUNCTION public.${functionName}`,
  )
  const end = migration.indexOf(
    `REVOKE ALL ON FUNCTION public.${functionName}`,
    start,
  )

  expect(start, `${functionName} must be created`).toBeGreaterThanOrEqual(0)
  expect(end, `${functionName} must have an explicit ACL`).toBeGreaterThan(start)

  return migration.slice(start, end)
}

function expectServiceRoleOnlyFunction(
  migration: string,
  functionName: string,
): void {
  const body = functionBody(migration, functionName)
  expect(body).toContain("SECURITY DEFINER")
  expect(body).toContain("SET search_path = pg_catalog, public")

  const aclStart = migration.indexOf(
    `REVOKE ALL ON FUNCTION public.${functionName}`,
  )
  const aclEnd = migration.indexOf(";", migration.indexOf("GRANT EXECUTE", aclStart))
  const acl = migration.slice(aclStart, aclEnd + 1)

  expect(acl).toMatch(/FROM PUBLIC, anon, authenticated, service_role;/)
  expect(acl).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]+TO service_role;/)
  expect(acl).not.toMatch(/TO (?:anon|authenticated);/)
}

describe("Stripe refund recovery migration", () => {
  it("creates a durable service-role-only refund-attempt ledger", () => {
    const migration = readRecoveryMigration()

    expect(migration).toContain("CREATE TABLE public.stripe_refund_attempts")
    expect(migration).toContain("id uuid PRIMARY KEY")
    expect(migration).toContain("intake_id uuid NOT NULL")
    expect(migration).toContain("payment_intent_id text NOT NULL")
    expect(migration).toContain("refund_type text NOT NULL")
    expect(migration).toContain("target_total_cents integer NOT NULL")
    expect(migration).toContain("requested_amount_cents integer NOT NULL")
    expect(migration).toContain("idempotency_key text NOT NULL UNIQUE")
    expect(migration).toContain("lease_token uuid")
    expect(migration).toContain("lease_expires_at timestamptz")
    expect(migration).toContain("downstream_manual_review_at timestamptz")
    expect(migration).toContain("stripe_refund_id text")
    expect(migration).toContain("state text NOT NULL")
    expect(migration).toMatch(
      /ALTER TABLE public\.stripe_refund_attempts ENABLE ROW LEVEL SECURITY;\s+REVOKE ALL ON TABLE public\.stripe_refund_attempts\s+FROM PUBLIC, anon, authenticated, service_role;\s+GRANT SELECT ON TABLE public\.stripe_refund_attempts TO service_role;/,
    )
    expect(migration).not.toMatch(
      /GRANT [^;]+ ON (?:TABLE )?public\.stripe_refund_attempts TO (?:anon|authenticated)/,
    )
  })

  it("uses partial indexes to serialize active targets and find due recovery work", () => {
    const migration = readRecoveryMigration()
    const attemptIndexes = Array.from(
      migration.matchAll(/CREATE (?:UNIQUE )?INDEX[\s\S]*?;/g),
      (match) => match[0],
    ).filter((statement) =>
      statement.includes("public.stripe_refund_attempts"),
    )
    const activeIndexes = attemptIndexes.filter(
      (statement) => statement.includes("WHERE") && statement.includes("state"),
    )

    expect(activeIndexes.length).toBeGreaterThanOrEqual(2)
    expect(
      activeIndexes.some(
        (statement) =>
          statement.includes("CREATE UNIQUE INDEX") &&
          statement.includes("livemode") &&
          statement.includes("intake_id") &&
          statement.includes("'reserved'") &&
          statement.includes("'submitted'") &&
          statement.includes("'unknown_outcome'"),
      ),
    ).toBe(true)
    expect(
      activeIndexes.some(
        (statement) =>
          statement.includes("lease_expires_at") ||
          statement.includes("next_check_at"),
      ),
    ).toBe(true)
  })

  it("exposes one current lifecycle row per Stripe refund, never one global latest refund", () => {
    const migration = readRecoveryMigration()
    const viewStart = migration.indexOf(
      "CREATE OR REPLACE VIEW public.stripe_refund_current_lifecycle",
    )
    const viewEnd = migration.indexOf(";", viewStart)
    const lifecycle = migration.slice(viewStart, viewEnd + 1)

    expect(viewStart).toBeGreaterThanOrEqual(0)
    expect(lifecycle).toContain("public.stripe_refund_events")
    expect(lifecycle).toMatch(
      /PARTITION BY\s+(?:\w+\.)?livemode,\s*(?:\w+\.)?stripe_refund_id/,
    )
    expect(lifecycle).toContain("refund_status")
    expect(lifecycle).not.toMatch(
      /PARTITION BY\s+(?:\w+\.)?intake_id\s*(?:\)|ORDER BY)/,
    )
    expect(migration).toMatch(
      /REVOKE ALL ON (?:TABLE )?public\.stripe_refund_current_lifecycle\s+FROM PUBLIC, anon, authenticated, service_role;\s+GRANT SELECT ON (?:TABLE )?public\.stripe_refund_current_lifecycle TO service_role;/,
    )
  })

  it("reserves and completes attempts through attempt-and-lease CAS RPCs only", () => {
    const migration = readRecoveryMigration()

    for (const functionName of [
      "reserve_stripe_refund_attempt",
      "complete_stripe_refund_attempt",
      "complete_stripe_refund_attempt_error",
    ]) {
      expectServiceRoleOnlyFunction(migration, functionName)
    }

    const submitted = functionBody(
      migration,
      "complete_stripe_refund_attempt",
    )
    const errored = functionBody(
      migration,
      "complete_stripe_refund_attempt_error",
    )

    for (const completion of [submitted, errored]) {
      expect(completion).toContain("p_attempt_id")
      expect(completion).toContain("p_lease_token")
      expect(completion).toMatch(/WHERE[\s\S]+attempt\.id = p_attempt_id/)
      expect(completion).toMatch(
        /attempt\.lease_token = p_lease_token|attempt\.lease_token IS NOT DISTINCT FROM p_lease_token/,
      )
      expect(completion).toContain("RETURNING")
    }
    expect(errored).toContain("unknown_outcome")
    expect(errored).toContain("manual_review")
    expect(errored).toContain("downstream_manual_review_at")
    expect(errored).toMatch(
      /WHEN attempt\.state IN \('succeeded', 'failed', 'canceled'\)\s+THEN attempt\.state/,
    )
  })

  it("binds webhook evidence only when the complete mutation identity matches", () => {
    const migration = readRecoveryMigration()
    const binding = functionBody(
      migration,
      "bind_stripe_refund_attempt_from_webhook",
    )

    expectServiceRoleOnlyFunction(
      migration,
      "bind_stripe_refund_attempt_from_webhook",
    )
    expect(migration).toMatch(
      /bind_stripe_refund_attempt_from_webhook\(\s*p_attempt_id uuid,\s*p_stripe_refund_id text,\s*p_stripe_status text,\s*p_payment_intent_id text,\s*p_livemode boolean,\s*p_intake_id uuid,\s*p_refund_type text,\s*p_amount_cents integer\s*\)/,
    )
    for (const mismatch of [
      "v_attempt.livemode <> p_livemode",
      "v_attempt.intake_id <> p_intake_id",
      "v_attempt.refund_type <> p_refund_type",
      "v_attempt.requested_amount_cents <> p_amount_cents",
    ]) {
      expect(binding).toContain(mismatch)
    }
    expect(binding.indexOf("refund_attempt_webhook_identity_conflict")).toBeLessThan(
      binding.indexOf("v_attempt.state IN ('succeeded', 'failed', 'canceled')"),
    )
  })

  it("claims stale attempts in bounded SKIP LOCKED batches", () => {
    const migration = readRecoveryMigration()
    const claim = functionBody(
      migration,
      "claim_stale_stripe_refund_attempts",
    )

    expectServiceRoleOnlyFunction(
      migration,
      "claim_stale_stripe_refund_attempts",
    )
    expect(claim).toContain("FOR UPDATE SKIP LOCKED")
    expect(claim).toMatch(
      /v_claim_limit\s*:=\s*LEAST\(GREATEST\(p_limit,\s*1\),\s*100\)/,
    )
    expect(claim).toContain("LIMIT (v_claim_limit / 2)")
    expect(claim).toContain("LIMIT (v_remaining / 2)")
    expect(claim).toContain("LIMIT v_remaining")
    expect(claim).toContain("lease_expires_at")
    expect(claim).toContain("downstream_manual_review_at IS NULL")
    expect(claim).toContain("RETURNING")
  })

  it("finalizes terminal downstream work through a semantic lifecycle CAS", () => {
    const migration = readRecoveryMigration()
    const finalization = functionBody(
      migration,
      "finalize_stripe_refund_attempt",
    )

    expectServiceRoleOnlyFunction(migration, "finalize_stripe_refund_attempt")
    expect(migration).toMatch(
      /finalize_stripe_refund_attempt\(\s*p_attempt_id uuid,\s*p_livemode boolean,\s*p_stripe_refund_id text,\s*p_expected_outcome text,\s*p_expected_refund_cash_at timestamptz,\s*p_expected_refund_reversed_at timestamptz\s*\)/,
    )
    expect(finalization).toContain("public.stripe_refund_current_lifecycle")
    expect(finalization).toContain("v_terminal_state <> p_expected_outcome")
    expect(finalization).toContain(
      "v_lifecycle.refund_cash_at IS DISTINCT FROM p_expected_refund_cash_at",
    )
    expect(finalization).toContain(
      "v_lifecycle.refund_reversed_at IS DISTINCT FROM p_expected_refund_reversed_at",
    )
    expect(finalization).toContain("downstream_finalized_at")
    expect(finalization).toContain("downstream_manual_review_at = NULL")
  })

  it("keeps the reconcile RPC signature and reduces lifecycle per refund", () => {
    const migration = readRecoveryMigration()
    const reconcile = functionBody(
      migration,
      "reconcile_intake_refund_cash_state",
    )

    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.reconcile_intake_refund_cash_state\(\s*p_intake_id uuid,\s*p_livemode boolean,\s*p_trigger_status text\s*\)/,
    )
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.reconcile_intake_refund_cash_state\(\s*uuid,\s*boolean,\s*text\s*\) FROM PUBLIC, anon, authenticated, service_role;\s+GRANT EXECUTE ON FUNCTION public\.reconcile_intake_refund_cash_state\(\s*uuid,\s*boolean,\s*text\s*\) TO service_role;/,
    )
    expect(reconcile).toContain("public.stripe_refund_current_lifecycle")
    expect(reconcile).toMatch(/FILTER\s*\([\s\S]+refund_status/)
    expect(reconcile).not.toContain("v_latest_refund_status")
    const directEvidenceStatements = reconcile.split(";").filter((statement) =>
      statement.includes("FROM public.stripe_refund_events"),
    )
    expect(directEvidenceStatements.every((statement) =>
      !/ORDER BY[\s\S]+LIMIT 1/.test(statement),
    )).toBe(true)
  })

  it("replaces the legacy NOT VALID constraint with transition-only retirement enforcement", () => {
    const migration = readRecoveryMigration()

    expect(migration).toContain(
      "DROP CONSTRAINT IF EXISTS intakes_consult_subtype_not_general",
    )

    const transition = functionBody(
      migration,
      "enforce_general_consult_retirement_transition",
    )
    expect(transition).toContain("NEW.category = 'consult'")
    expect(transition).toContain("NEW.subtype = 'general'")
    expect(transition).toContain("TG_OP = 'INSERT'")
    expect(transition).toContain("OLD.category")
    expect(transition).toContain("OLD.subtype")
    expect(transition).toContain("ERRCODE = '23514'")
    expect(migration).toMatch(
      /CREATE TRIGGER enforce_general_consult_retirement_transition\s+BEFORE INSERT OR UPDATE OF category, subtype ON public\.intakes/,
    )
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.enforce_general_consult_retirement_transition\(\)\s+FROM PUBLIC, anon, authenticated, service_role;/,
    )
  })
})
