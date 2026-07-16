import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildCertificateDocumentSentRepairPlan,
  type CertificateDocumentSentRepairSummary,
} from "@/lib/admin/certificate-document-sent-repair"

const helperSource = readFileSync(
  join(process.cwd(), "lib/admin/certificate-document-sent-repair.ts"),
  "utf8",
)
const actionSource = readFileSync(
  join(process.cwd(), "app/actions/certificate-document-sent-repair.ts"),
  "utf8",
)

const baseEmail = {
  id: "email-1",
  intake_id: "intake-1",
  status: "sent",
  sent_at: "2026-06-29T00:10:00Z",
  created_at: "2026-06-29T00:09:00Z",
  updated_at: "2026-06-29T00:10:30Z",
}

const baseIntake = {
  id: "intake-1",
  category: "medical_certificate",
  status: "approved",
  document_sent_at: null,
  generated_document_type: null,
  exclude_from_reporting: false,
}

const baseCertificate = {
  id: "cert-1",
  intake_id: "intake-1",
  status: "valid",
  created_at: "2026-06-29T00:08:00Z",
}

describe("certificate document_sent_at repair", () => {
  it("selects only sent certificate emails for approved or completed med-cert intakes with valid certificates", () => {
    const plan = buildCertificateDocumentSentRepairPlan({
      emails: [
        baseEmail,
        { ...baseEmail, id: "email-existing", intake_id: "intake-existing" },
        { ...baseEmail, id: "email-rx", intake_id: "intake-rx" },
        { ...baseEmail, id: "email-paid", intake_id: "intake-paid" },
        { ...baseEmail, id: "email-failed", intake_id: "intake-failed", status: "failed" },
        { ...baseEmail, id: "email-revoked", intake_id: "intake-revoked" },
        { ...baseEmail, id: "email-excluded", intake_id: "intake-excluded" },
      ],
      intakes: [
        baseIntake,
        { ...baseIntake, id: "intake-existing", document_sent_at: "2026-06-29T00:11:00Z" },
        { ...baseIntake, id: "intake-rx", category: "prescription" },
        { ...baseIntake, id: "intake-paid", status: "paid" },
        { ...baseIntake, id: "intake-failed" },
        { ...baseIntake, id: "intake-revoked" },
        { ...baseIntake, id: "intake-excluded", exclude_from_reporting: true },
      ],
      certificates: [
        baseCertificate,
        { ...baseCertificate, id: "cert-existing", intake_id: "intake-existing" },
        { ...baseCertificate, id: "cert-rx", intake_id: "intake-rx" },
        { ...baseCertificate, id: "cert-paid", intake_id: "intake-paid" },
        { ...baseCertificate, id: "cert-failed", intake_id: "intake-failed" },
        { ...baseCertificate, id: "cert-revoked", intake_id: "intake-revoked", status: "revoked" },
        { ...baseCertificate, id: "cert-excluded", intake_id: "intake-excluded" },
      ],
    })

    expect(plan.candidates).toEqual([
      {
        intakeId: "intake-1",
        certificateId: "cert-1",
        emailOutboxId: "email-1",
        documentSentAt: "2026-06-29T00:10:00Z",
      },
    ])
    expect(plan.skippedCount).toBe(5)
  })

  it("uses the latest sent email evidence for each intake", () => {
    const plan = buildCertificateDocumentSentRepairPlan({
      emails: [
        {
          ...baseEmail,
          id: "older-email",
          sent_at: "2026-06-29T00:01:00Z",
          created_at: "2026-06-29T00:00:00Z",
          updated_at: "2026-06-29T00:01:30Z",
        },
        {
          ...baseEmail,
          id: "newer-email",
          sent_at: null,
          created_at: "2026-06-29T00:03:00Z",
          updated_at: "2026-06-29T00:04:00Z",
        },
      ],
      intakes: [baseIntake],
      certificates: [baseCertificate],
    })

    expect(plan.candidates).toHaveLength(1)
    expect(plan.candidates[0]).toMatchObject({
      emailOutboxId: "newer-email",
      documentSentAt: "2026-06-29T00:04:00Z",
    })
  })

  it("keeps the action response aggregate-only", () => {
    const summary: CertificateDocumentSentRepairSummary = {
      dryRun: false,
      windowDays: 14,
      limit: 50,
      candidateCount: 3,
      updatedCount: 2,
      skippedCount: 1,
      failedCount: 0,
      queryFailed: false,
    }

    expect(JSON.stringify(summary)).not.toMatch(
      /@|to_email|patient_email|full_name|patient_name|storage_path|pdf_storage_path|signed_url|attachment|intakeId|certificateId|emailOutboxId/i,
    )
  })

  it("queries the same safe evidence as the ops invariant and avoids raw certificate fields", () => {
    expect(helperSource).toContain('.from("email_outbox")')
    expect(helperSource).toContain('.eq("email_type", "med_cert_patient")')
    expect(helperSource).toContain('.eq("status", "sent")')
    expect(helperSource).toContain("filterSeededE2EIntakes")
    expect(helperSource).toContain('.eq("category", "medical_certificate")')
    expect(helperSource).toContain('.in("status", [...REPAIRABLE_INTAKE_STATUSES])')
    expect(helperSource).toContain('.eq("status", "valid")')
    expect(helperSource).not.toMatch(/to_email|patient_email|patient_name|storage_path|pdf_storage_path|signed_url/i)
  })

  it("keeps the nullable reporting guard out of the PostgREST PATCH or filter", () => {
    const updateLoopStart = helperSource.indexOf("for (const candidate of plan.candidates)")
    const updateLoopEnd = helperSource.indexOf("return summary", updateLoopStart)
    const updateLoopSource = helperSource.slice(updateLoopStart, updateLoopEnd)

    expect(updateLoopSource).not.toContain(
      '.or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false")',
    )
    expect(updateLoopSource).toContain('.is("exclude_from_reporting", null)')
    expect(updateLoopSource).toContain('.eq("exclude_from_reporting", false)')
  })

  it("keeps the repair action admin-only, rate-limited, audited, and staff-revalidated", () => {
    expect(actionSource).toContain('requireRoleOrNull(["admin"])')
    expect(actionSource).toContain("checkServerActionRateLimit")
    expect(actionSource).toContain("repairCertificateDocumentSentAt")
    expect(actionSource).toContain("logAuditEvent")
    expect(actionSource).toContain('action_type: "certificate_document_sent_at_repair"')
    expect(actionSource).toContain('status: result.queryFailed ? "failed" : "repaired"')
    expect(actionSource).toContain("revalidateStaff({ ops: true })")
    expect(actionSource).not.toMatch(/to_email|patient_email|patient_name|storage_path|pdf_storage_path|signed_url/i)
  })
})
