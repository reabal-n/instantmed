import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"

import { validateCertificateStartDate } from "@/lib/medical-certificates/date-policy"

const CERTIFICATE_DATE_WRITERS = [
  "app/actions/reissue-cert.ts",
  "app/actions/request-date-correction.ts",
  "app/api/med-cert/render/route.ts",
  "app/api/med-cert/preview/route.ts",
  "lib/clinical/execute-cert-approval.ts",
  "lib/request/validation.ts",
  "lib/validation/med-cert-schema.ts",
]

describe("medical certificate policy contract", () => {
  it("keeps every certificate date writer on the shared date policy", () => {
    for (const path of CERTIFICATE_DATE_WRITERS) {
      const source = readFileSync(path, "utf8")
      expect(source, path).toContain("@/lib/medical-certificates/date-policy")
      expect(source, path).toMatch(/validateCertificate(?:StartDate|DateRange)/)
    }
  })

  it("keeps the issued certificate table guarded against future start dates", () => {
    const migration = readFileSync(
      "supabase/migrations/20260501060000_guard_med_cert_future_start_dates.sql",
      "utf8",
    )

    expect(migration).toContain("issued_certificates_start_date_not_future")
    expect(migration).toContain("start_date <= CURRENT_DATE")
    expect(migration).toContain("NOT VALID")
  })

  it("allows historical correction paths while still blocking future starts", () => {
    expect(validateCertificateStartDate("2020-01-01", { maxBackdateDays: null }).valid).toBe(true)
    expect(validateCertificateStartDate("2099-01-01", { maxBackdateDays: null }).valid).toBe(false)
  })

  it("keeps doctor review surfaces from returning raw Medicare numbers", () => {
    const reviewSurfaces = [
      "app/api/doctor/intakes/[id]/review-data/route.ts",
      "app/doctor/intakes/[id]/page.tsx",
    ]

    for (const path of reviewSurfaces) {
      const source = readFileSync(path, "utf8")
      expect(source, path).toContain("maskMedicare(")
      expect(source, path).not.toContain('intake.patient.medicare_number ?? "Not provided"')
    }
  })

  it("does not send certificate credentials or patient email values to analytics/log metadata", () => {
    const sensitiveSurfaces = [
      "components/patient/certificate-credentials.tsx",
      "app/verify/verify-client.tsx",
      "app/patient/intakes/[id]/client.tsx",
      "app/actions/resend-certificate.ts",
      "app/actions/resend-certificate-admin.ts",
      "app/actions/reissue-cert.ts",
    ]

    for (const path of sensitiveSurfaces) {
      const source = readFileSync(path, "utf8")
      expect(source, path).not.toContain("code: value")
      expect(source, path).not.toContain("ref: value")
      expect(source, path).not.toContain("verification_code:")
      expect(source, path).not.toContain('capture("certificate_verified", { code:')
      expect(source, path).not.toContain('capture("verification_link_copied", { code:')
      expect(source, path).not.toContain('log.info("Certificate resent successfully", { intakeId, to: patient.email })')
      expect(source, path).not.toContain("to: patient.email,\n          resentBy")
    }
  })

  it("does not persist verification codes in approval email metadata", () => {
    const source = readFileSync("lib/clinical/execute-cert-approval.ts", "utf8")
    const patientEmailSend = source.match(
      /const emailResult = await sendEmail\(\{[\s\S]*?emailType: "med_cert_patient"[\s\S]*?tags:/,
    )

    const metadataBlock = patientEmailSend?.[0].match(/metadata: \{[\s\S]*?\},\n\s{4}tags:/)

    expect(metadataBlock?.[0] ?? "missing approval email metadata block").not.toContain("verification_code")
    expect(metadataBlock?.[0] ?? "missing approval email metadata block").not.toContain("verificationCode")
  })
})
