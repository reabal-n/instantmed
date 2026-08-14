import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260814163645_reconcile_manual_certificate_delivery.sql",
)
const LOCK_ORDER_MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260814181000_align_manual_delivery_reconciliation_lock_order.sql",
)
const ISSUED_CERTIFICATES_PATH = join(process.cwd(), "lib/data/issued-certificates.ts")
const RESCUE_PATH = join(process.cwd(), "lib/admin/certificate-delivery-rescue.ts")

describe("manual certificate delivery reconciliation contract", () => {
  it("stores manual delivery as append-only evidence without rewriting provider truth", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")
    const functionStart = sql.indexOf(
      "CREATE FUNCTION public.record_manual_certificate_delivery_reconciliation",
    )
    const functionEnd = sql.indexOf("REVOKE ALL ON FUNCTION", functionStart)
    const functionSql = sql.slice(functionStart, functionEnd)

    expect(sql).toContain("CREATE TABLE public.certificate_delivery_reconciliations")
    expect(sql).toContain("'operator_attested_manual_delivery'")
    expect(sql).toContain("delivery_occurred_at")
    expect(sql).toContain("certificate_storage_version")
    expect(sql).toContain("extensions.digest(c.storage_path, 'sha256')")
    expect(sql).toContain("certificate_delivery_reconciliations_append_only")
    expect(sql).toMatch(
      /REVOKE ALL ON public\.certificate_delivery_reconciliations\s+FROM PUBLIC, anon, authenticated/i,
    )
    expect(functionSql).toContain("v_certificate.status <> 'valid'")
    expect(functionSql).toContain("RETURN 'certificate_not_current_valid'")
    expect(functionSql).toContain("delivery_occurred_at")
    expect(functionSql).toMatch(/'operator_attested_manual_delivery',\s+NULL,/)
    expect(functionSql).not.toContain("email_sent_at =")
    expect(functionSql).not.toContain("document_sent_at =")
    expect(functionSql).not.toMatch(/UPDATE public\.issued_certificates/i)
    expect(functionSql).not.toMatch(/UPDATE public\.intakes/i)
  })

  it("lets only the exact current valid certificate satisfy the stuck-delivery view", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8")

    expect(sql).toContain("ic.status = 'valid'")
    expect(sql).toContain("current_certificate.delivery_reconciled")
    expect(sql).toContain("reconciliation.certificate_id = ic.id")
    expect(sql).toContain("reconciliation.intake_id = i.id")
    expect(sql).toContain("reconciliation.certificate_storage_version")
    expect(sql).toContain("extensions.digest(ic.storage_path, 'sha256')")
    expect(sql).toMatch(/ORDER BY ic\.created_at DESC, ic\.id DESC\s+LIMIT 1/)
    expect(sql).not.toMatch(/SET email_sent_at\s*=/)
    expect(sql).not.toMatch(/SET document_sent_at\s*=/)
  })

  it("suppresses patient and rescue resend prompts only from durable reconciliation evidence", () => {
    const issuedCertificates = readFileSync(ISSUED_CERTIFICATES_PATH, "utf8")
    const rescue = readFileSync(RESCUE_PATH, "utf8")

    expect(issuedCertificates).toContain("certificate_delivery_reconciliations")
    expect(issuedCertificates).toContain("row.delivery_reconciliation")
    expect(rescue).toContain("deliveryReconciledAt")
    expect(rescue).toContain("Manual delivery was reconciled")
    expect(rescue).toContain('certificateStatus !== "valid"')
    expect(rescue).toContain(
      '.select("id, intake_id, certificate_id, email_type, status, delivery_status, sent_at, created_at, metadata")',
    )
    expect(rescue).toContain("certEmailByCertificateVersion")
    expect(rescue).toContain("certificateEmailVersionKey(cert?.id, currentStorageVersion)")
  })

  it("aligns reconciliation with the intake-then-certificate correction lock order", () => {
    const sql = readFileSync(LOCK_ORDER_MIGRATION_PATH, "utf8")
    const intakeLock = sql.indexOf("SELECT intake.id, intake.category, intake.status")
    const certificateLock = sql.indexOf("certificate.status,\n    certificate.created_at")

    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.record_manual_certificate_delivery_reconciliation",
    )
    expect(intakeLock).toBeGreaterThan(-1)
    expect(certificateLock).toBeGreaterThan(intakeLock)
    expect(sql.match(/FOR UPDATE/g)?.length).toBe(2)
    expect(sql).toContain("v_certificate.intake_id IS DISTINCT FROM v_intake.id")
    expect(sql).toContain("v_certificate.status <> 'valid'")
    expect(sql).toContain("ON CONFLICT (certificate_id, certificate_storage_version) DO NOTHING")
    expect(sql).not.toMatch(/UPDATE\s+(public\.)?(intakes|issued_certificates)/i)
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.record_manual_certificate_delivery_reconciliation\(uuid, uuid\)[\s\S]+FROM PUBLIC, anon, authenticated/,
    )
    expect(sql).toContain("TO service_role")
    expect(sql).toContain(
      "DROP CONSTRAINT certificate_delivery_reconciliations_recorded_by_fkey",
    )
    expect(sql).toMatch(
      /ADD CONSTRAINT certificate_delivery_reconciliations_recorded_by_fkey[\s\S]+ON DELETE RESTRICT/,
    )
    expect(sql).not.toMatch(/UPDATE\s+public\.certificate_delivery_reconciliations/i)
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.certificate_delivery_reconciliations/i)
  })
})
