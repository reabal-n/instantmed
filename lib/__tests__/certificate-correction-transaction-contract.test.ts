import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const migrationSource = readFileSync(
  join(root, "supabase/migrations/20260710173000_atomic_certificate_corrections.sql"),
  "utf8",
)
const actionSource = readFileSync(join(root, "app/actions/reissue-cert.ts"), "utf8")

describe("certificate correction transaction contract", () => {
  it("locks the live row and commits its row switch with the durable audit event", () => {
    expect(migrationSource).toContain("CREATE OR REPLACE FUNCTION public.commit_certificate_correction")
    expect(migrationSource).toContain("SET search_path = pg_catalog, public")
    expect(migrationSource).toContain("FOR UPDATE")
    expect(migrationSource).toContain("FROM public.certificate_audit_log AS audit")
    expect(migrationSource).toContain("v_correction_count >= 3")
    expect(migrationSource).toContain("UPDATE public.issued_certificates")
    expect(migrationSource).toContain("UPDATE public.intake_documents")
    expect(migrationSource).toContain("document_type = 'med_cert'")
    expect(migrationSource).toContain("certificate_number = v_certificate.certificate_number")
    expect(migrationSource).toContain("storage_path = p_expected_storage_path")
    expect(migrationSource).toContain("GET DIAGNOSTICS v_document_rows = ROW_COUNT")
    expect(migrationSource).toContain("v_document_rows <> 1")
    expect(migrationSource).toContain("INSERT INTO public.certificate_audit_log")
    expect(migrationSource).toContain("'reissue_reason', 'doctor_correction'")
    expect(migrationSource).toContain("email_sent_at = NULL")
    expect(migrationSource).toContain("email_delivery_id = NULL")
    expect(migrationSource).toContain("email_retry_count = 0")
    expect(migrationSource).toContain("email_opened_at = NULL")
    expect(migrationSource).toContain("resend_count = 0")
    expect(migrationSource).toContain("document_sent_at = NULL")
    expect(migrationSource.indexOf("UPDATE public.intake_documents")).toBeLessThan(
      migrationSource.indexOf("INSERT INTO public.certificate_audit_log"),
    )
  })

  it("keeps raw patient identity fields out of the correction audit payload", () => {
    const payloadStart = migrationSource.indexOf("'reissue_reason', 'doctor_correction'")
    const payloadEnd = migrationSource.indexOf("\n    )\n  );", payloadStart)
    const auditPayload = migrationSource.slice(payloadStart, payloadEnd)

    expect(auditPayload).toContain("'patient_name_changed'")
    expect(auditPayload).toContain("'patient_dob_changed'")
    expect(auditPayload).toContain("'previous_pdf_hash'")
    expect(auditPayload).toContain("'new_pdf_hash'")
    expect(auditPayload).not.toContain("'patient_name',")
    expect(auditPayload).not.toContain("'patient_dob',")
    expect(auditPayload).not.toContain("correction_reason")
    expect(auditPayload).toContain("'previous_storage_path'")
  })

  it("restricts the RPC and uses versioned storage with compensating cleanup", () => {
    expect(migrationSource).toContain(") FROM PUBLIC;")
    expect(migrationSource).toContain(") FROM anon;")
    expect(migrationSource).toContain(") FROM authenticated;")
    expect(migrationSource).toContain(") TO service_role;")

    expect(actionSource).toContain("certificates/corrections/${cert.id}/${crypto.randomUUID()}.pdf")
    expect(actionSource).toContain("upsert: false")
    expect(actionSource).toContain("commitCertificateCorrection({")
    expect(actionSource).toContain("removeUncommittedCorrection")
    expect(actionSource).not.toContain("logCertificateEvent(\n      cert.id,\n      \"superseded\"")
  })

  it("CAS-approves an optional pending correction event inside the same transaction", () => {
    expect(migrationSource).toContain("p_pending_correction_event_id uuid DEFAULT NULL")
    expect(migrationSource).toContain("event.metadata->>'status' = 'pending'")
    expect(migrationSource).toContain("FOR UPDATE")
    expect(migrationSource).toContain("v_correction_event_rows <> 1")
    expect(migrationSource).toContain("'date_correction_approved'")
    expect(migrationSource).toContain("'date_correction_requested'")
  })

  it("rejects correction writes without an attributable clinical actor", () => {
    expect(migrationSource).toContain("p_actor_id IS NULL")
    expect(migrationSource).toContain("p_actor_role IS NULL")
    expect(migrationSource).toContain("p_actor_role NOT IN ('doctor', 'admin')")
  })
})
