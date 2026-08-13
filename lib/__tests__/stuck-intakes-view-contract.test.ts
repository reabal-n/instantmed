import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260502010500_fix_stuck_intake_delivery_failure_priority.sql",
)
const REPORTABLE_MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260814110000_make_stuck_intakes_reportable.sql",
)
const CORRECTION_MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260710173000_atomic_certificate_corrections.sql",
)
const REVOKE_MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260811120000_revoke_auto_issued_certificate_atomically.sql",
)
const APPROVAL_MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260607000000_atomic_approve_clears_claim.sql",
)
const OPS_DOC_PATH = join(process.cwd(), "docs/OPERATIONS.md")
const INTAKE_OPS_PATH = join(process.cwd(), "lib/data/intake-ops.ts")
const SYSTEM_HEALTH_PATH = join(process.cwd(), "lib/data/system-health.ts")
const OPS_CLIENT_PATH = join(process.cwd(), "components/shared/ops/intakes-stuck-client.tsx")

const DELIVERY_EMAIL_TYPES = [
  "request_approved",
  "certificate_delivery",
  "med_cert_patient",
  "script_sent",
] as const

describe("stuck intakes view contract", () => {
  it("classifies failed delivery emails before generic delivery pending", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")

    const failedIndex = sql.indexOf("THEN 'delivery_failed'")
    const pendingIndex = sql.indexOf("THEN 'delivery_pending'")

    expect(sql).toContain("DROP VIEW IF EXISTS public.v_stuck_intakes")
    expect(sql).toContain("CREATE VIEW public.v_stuck_intakes")
    expect(failedIndex).toBeGreaterThan(-1)
    expect(pendingIndex).toBeGreaterThan(-1)
    expect(failedIndex).toBeLessThan(pendingIndex)
  })

  it("keeps non-certificate delivery email types aligned across the canonical view and runbook", () => {
    const sql = readFileSync(REPORTABLE_MIGRATION_PATH, "utf8")
    const opsDoc = readFileSync(OPS_DOC_PATH, "utf8")

    for (const emailType of DELIVERY_EMAIL_TYPES) {
      expect(sql).toContain(`'${emailType}'`)
      expect(opsDoc).toContain(`'${emailType}'`)
    }
  })

  it("exposes the two reportability keys without weakening the private view boundary", () => {
    const sql = readFileSync(REPORTABLE_MIGRATION_PATH, "utf8")

    expect(sql).toContain("CREATE OR REPLACE VIEW public.v_stuck_intakes")
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.v_stuck_intakes\s+WITH \(security_invoker = on\) AS/i)
    expect(sql).toContain("i.patient_id")
    expect(sql).toContain("i.exclude_from_reporting")
    expect(sql).toContain("ALTER VIEW public.v_stuck_intakes SET (security_invoker = on)")
    expect(sql).toMatch(/REVOKE ALL ON public\.v_stuck_intakes FROM PUBLIC, anon, authenticated/i)
    expect(sql).toMatch(/GRANT SELECT ON public\.v_stuck_intakes TO service_role/i)
  })

  it("binds med-cert delivery to the latest valid certificate and keeps refund obligations aligned", () => {
    const sql = readFileSync(REPORTABLE_MIGRATION_PATH, "utf8")

    expect(sql).toContain("i.document_sent_at IS NOT NULL")
    expect(sql).toContain("FROM public.issued_certificates ic")
    expect(sql).toContain("ic.status = 'valid'")
    expect(sql).toContain("ORDER BY ic.created_at DESC, ic.id DESC")
    expect(sql).toMatch(/ORDER BY ic\.created_at DESC, ic\.id DESC\s+LIMIT 1/)
    expect(sql).toContain("THEN current_certificate.email_sent_at IS NOT NULL")
    expect(sql).toContain("current_certificate.email_failed_at IS NOT NULL")
    expect(sql).toContain("i.payment_status IN ('paid', 'partially_refunded')")
  })

  it("ignores stale intake and outbox mirrors after correction or revoke-and-reissue", () => {
    const sql = readFileSync(REPORTABLE_MIGRATION_PATH, "utf8")
    const correctionSql = readFileSync(CORRECTION_MIGRATION_PATH, "utf8")
    const revokeSql = readFileSync(REVOKE_MIGRATION_PATH, "utf8")
    const approvalSql = readFileSync(APPROVAL_MIGRATION_PATH, "utf8")
    const medicalBranchStart = sql.indexOf("-- A correction replaces the current certificate")
    const nonMedicalBranchStart = sql.indexOf("ELSE (", medicalBranchStart)
    const deliverySentEnd = sql.indexOf("END AS delivery_email_sent", nonMedicalBranchStart)
    const medicalBranch = sql.slice(medicalBranchStart, nonMedicalBranchStart)
    const nonMedicalBranch = sql.slice(nonMedicalBranchStart, deliverySentEnd)

    expect(medicalBranchStart).toBeGreaterThan(-1)
    expect(nonMedicalBranchStart).toBeGreaterThan(medicalBranchStart)
    expect(medicalBranch).toContain("current_certificate.email_sent_at")
    expect(medicalBranch).not.toContain("i.document_sent_at")
    expect(medicalBranch).not.toContain("public.email_outbox")
    expect(nonMedicalBranch).toContain("public.email_outbox")
    expect(correctionSql).toContain("email_sent_at = NULL")
    expect(correctionSql).toContain("SET document_sent_at = NULL")
    expect(correctionSql).not.toContain("DELETE FROM public.email_outbox")
    expect(revokeSql).not.toContain("document_sent_at = NULL")
    expect(approvalSql).not.toContain("document_sent_at = NULL")
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.clear_med_cert_delivery_mirror_on_revocation()",
    )
    expect(sql).toContain("OLD.status = 'valid' AND NEW.status = 'revoked'")
    expect(sql).toContain("SET document_sent_at = NULL")
    expect(sql).toContain("AFTER UPDATE OF status ON public.issued_certificates")
    expect(sql).toContain("AND (newer.created_at, newer.id) > (NEW.created_at, NEW.id)")
  })

  it("uses the same reportable-intake boundary for System Health, Operations, and alerts", () => {
    const intakeOps = readFileSync(INTAKE_OPS_PATH, "utf8")
    const opsDoc = readFileSync(OPS_DOC_PATH, "utf8")
    const systemHealth = readFileSync(SYSTEM_HEALTH_PATH, "utf8")

    expect(intakeOps).toContain('import { filterReportableIntakes } from "@/lib/data/reporting-filters"')
    expect(systemHealth).toContain('import { filterReportableIntakes } from "@/lib/data/reporting-filters"')
    expect(intakeOps.match(/filterReportableIntakes\(/g)?.length).toBe(1)
    expect(systemHealth).toContain("filterReportableIntakes(")
    expect(intakeOps).not.toContain("filterSeededE2EIntakes")
    expect(systemHealth).not.toContain("filterSeededE2EIntakes")
    expect(intakeOps).not.toContain("getStuckIntakesDirect")
    expect(intakeOps).not.toContain('.from("intakes")')
    expect(intakeOps).toContain("STUCK_INTAKE_PAGE_SIZE = 1000")
    expect(intakeOps).toContain("query.range(")
    expect(opsDoc).toContain("filterReportableIntakes")
    expect(opsDoc).toContain("Stuck-intake status unavailable")
    expect(opsDoc).toContain("Do not copy seeded profile IDs into SQL runbooks")
  })

  it("renders query failure as unavailable without an all-clear summary", () => {
    const client = readFileSync(OPS_CLIENT_PATH, "utf8")
    const errorBranchStart = client.indexOf("{error ? (")
    const verifiedBranchStart = client.indexOf(") : (", errorBranchStart)
    const errorBranch = client.slice(errorBranchStart, verifiedBranchStart)

    expect(errorBranchStart).toBeGreaterThan(-1)
    expect(verifiedBranchStart).toBeGreaterThan(errorBranchStart)
    expect(errorBranch).toContain("Stuck-intake status unavailable")
    expect(errorBranch).not.toContain('"Clear"')
    expect(errorBranch).not.toContain("No stuck intakes found")
  })

  it("locks the exact certificate storage version before repairing the intake mirror", () => {
    const sql = readFileSync(REPORTABLE_MIGRATION_PATH, "utf8")
    const repairStart = sql.indexOf(
      "CREATE OR REPLACE FUNCTION public.repair_certificate_document_sent_at",
    )
    const repairSql = sql.slice(repairStart)
    const certificateLock = repairSql.indexOf("FOR UPDATE OF ic;")
    const intakeLock = repairSql.indexOf("FOR UPDATE OF i;")

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.repair_certificate_document_sent_at")
    expect(certificateLock).toBeGreaterThan(-1)
    expect(intakeLock).toBeGreaterThan(certificateLock)
    expect(sql).toContain("extensions.digest(v_storage_path, 'sha256')")
    expect(sql).toContain("eo.metadata->>'certificate_storage_version' = p_expected_storage_version")
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.repair_certificate_document_sent_at\(uuid, uuid, uuid, text\)\s+FROM PUBLIC, anon, authenticated/i,
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.repair_certificate_document_sent_at\(uuid, uuid, uuid, text\)\s+TO service_role/i,
    )
  })

  it("clears revoked med-cert delivery proof without exposing the trigger function", () => {
    const sql = readFileSync(REPORTABLE_MIGRATION_PATH, "utf8")

    expect(sql).toMatch(
      /CREATE TRIGGER clear_med_cert_delivery_mirror_on_revocation\s+AFTER UPDATE OF status ON public\.issued_certificates/i,
    )
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.clear_med_cert_delivery_mirror_on_revocation\(\)\s+FROM PUBLIC, anon, authenticated/i,
    )
  })

  it("replaces auto-issued revocation with the same certificate-first lock order", () => {
    const sql = readFileSync(REPORTABLE_MIGRATION_PATH, "utf8")
    const revokeStart = sql.indexOf(
      "CREATE OR REPLACE FUNCTION public.revoke_auto_issued_certificate",
    )
    const revokeEnd = sql.indexOf(
      "REVOKE ALL ON FUNCTION public.revoke_auto_issued_certificate",
      revokeStart,
    )
    const revokeSql = sql.slice(revokeStart, revokeEnd)
    const certificateLock = revokeSql.indexOf("FROM public.issued_certificates AS c")
    const lockedIntake = revokeSql.lastIndexOf("FROM public.intakes AS i")

    expect(revokeStart).toBeGreaterThan(-1)
    expect(certificateLock).toBeGreaterThan(-1)
    expect(lockedIntake).toBeGreaterThan(certificateLock)
    expect(revokeSql.slice(lockedIntake)).toContain("FOR UPDATE")
    expect(revokeSql).toContain("IF v_latest_certificate.id <> v_certificate.id THEN")
    expect(revokeSql).toContain("document_sent_at = NULL")
  })

  it("reconciles certificate email status and the intake mirror in one version-locked RPC", () => {
    const sql = readFileSync(REPORTABLE_MIGRATION_PATH, "utf8")

    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.reconcile_certificate_email_status",
    )
    expect(sql).toContain("ic.storage_path = p_expected_storage_path")
    expect(sql).toContain("FOR UPDATE OF ic")
    expect(sql).toContain("SET email_sent_at = v_now")
    expect(sql).toContain("SET document_sent_at = COALESCE(i.document_sent_at, v_now)")
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.reconcile_certificate_email_status\(uuid, text, text, text, text\)\s+FROM PUBLIC, anon, authenticated/i,
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.reconcile_certificate_email_status\(uuid, text, text, text, text\)\s+TO service_role/i,
    )
  })
})
