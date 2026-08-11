/**
 * Atomic auto-issued revocation contract (2026-08-11)
 *
 * The admin correction path used to run as split service-role writes (revoke
 * certificate -> reopen intake -> AI audit insert) with no compensation: a
 * failure after the first write stranded a REVOKED certificate on an APPROVED
 * intake, and a failed reopen returned before the AI audit event was written.
 * The whole correction now lives in one transactional RPC. These pins keep the
 * database boundary and the action shape from silently splitting again.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260811120000_revoke_auto_issued_certificate_atomically.sql",
  ),
  "utf8",
)

const actionSource = readFileSync(
  join(process.cwd(), "app/actions/revoke-ai-approval.ts"),
  "utf8",
)

describe("revoke_auto_issued_certificate migration", () => {
  it("defines the transactional RPC with locked reads", () => {
    expect(migrationSql).toContain(
      "CREATE OR REPLACE FUNCTION public.revoke_auto_issued_certificate",
    )
    // Both rows are locked before any write so concurrent corrections
    // serialize instead of interleaving.
    const forUpdateCount = migrationSql.match(/FOR UPDATE/g)?.length ?? 0
    expect(forUpdateCount).toBeGreaterThanOrEqual(2)
    expect(migrationSql).toContain("SET search_path = pg_catalog, public")
  })

  it("is service-role only", () => {
    expect(migrationSql).toContain(
      "REVOKE ALL ON FUNCTION public.revoke_auto_issued_certificate",
    )
    expect(migrationSql).toContain("FROM PUBLIC, anon, authenticated")
    expect(migrationSql).toContain("TO service_role")
    // Runs as the calling role (service role), never as the definer.
    expect(migrationSql).toContain("SECURITY INVOKER")
  })

  it("enforces the full domain shape inside the transaction", () => {
    for (const outcome of [
      "intake_not_found",
      "not_auto_issued",
      "wrong_category",
      "wrong_status",
      "certificate_not_found",
      "certificate_not_revocable",
      "already_reopened",
      "revoked_and_reopened",
    ]) {
      expect(migrationSql).toContain(`'${outcome}'`)
    }
    expect(migrationSql).toContain("v_intake.category <> 'medical_certificate'")
    expect(migrationSql).toContain("v_intake.status <> 'approved'")
    expect(migrationSql).toContain("length(v_reason) < 5 OR length(v_reason) > 2000")
  })

  it("revokes, reopens, and writes both audit events in the same transaction", () => {
    // Order matters: the certificate must be revoked before the intake update
    // so validate_intake_status_transition sees the revoked row in-transaction.
    const revokeIdx = migrationSql.indexOf("SET status = 'revoked'")
    const reopenIdx = migrationSql.indexOf("SET status = 'in_review'")
    expect(revokeIdx).toBeGreaterThan(-1)
    expect(reopenIdx).toBeGreaterThan(revokeIdx)
    expect(migrationSql).toContain("INSERT INTO public.certificate_audit_log")
    expect(migrationSql).toContain("INSERT INTO public.ai_audit_log")
    expect(migrationSql).toContain("'auto_issued_revoked_to_review'")
  })
})

describe("revoke-ai-approval action", () => {
  it("delegates the whole correction to the RPC — no split writes", () => {
    expect(actionSource).toContain('.rpc("revoke_auto_issued_certificate"')
    expect(actionSource).not.toContain("revokeCertificateAction")
    expect(actionSource).not.toContain('.from("intakes")')
    expect(actionSource).not.toContain('.from("issued_certificates")')
    expect(actionSource).not.toContain('.from("ai_audit_log")')
  })

  it("treats both completion outcomes as success and refusals as errors", () => {
    expect(actionSource).toContain('"revoked_and_reopened"')
    expect(actionSource).toContain('"already_reopened"')
    expect(actionSource).toContain("OUTCOME_ERRORS[row.outcome]")
  })

  it("never sends the clinical reason to telemetry", () => {
    // The reason lives in the audit tables the RPC writes; Sentry gets tags
    // only. A crafted `extra: { reason }` here would leak clinical judgment
    // about an identified patient into error tooling.
    expect(actionSource).not.toMatch(/extra:\s*\{[^}]*reason/i)
  })

  it("notifies the patient only on the first completed transition", () => {
    const firstTransitionIdx = actionSource.indexOf('row.outcome === "revoked_and_reopened"')
    const notifyIdx = actionSource.indexOf("createNotification(")
    expect(firstTransitionIdx).toBeGreaterThan(-1)
    expect(notifyIdx).toBeGreaterThan(firstTransitionIdx)
  })
})
