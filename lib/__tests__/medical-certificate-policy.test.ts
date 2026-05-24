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

  it("keeps the issued certificate table guarded with the AEST + forward-window expression", () => {
    // Active constraint is defined in the 20260524090000 migration which
    // supersedes both the original UTC version (20260501060000) and the
    // AEST-anchored same-day version (20260524080000). The current shape
    // allows forward-dating up to 14 days (med certs commonly cover an
    // upcoming planned absence) while still preventing arbitrarily-future
    // inserts. See lib/medical-certificates/date-policy.ts for the matching
    // application-layer cap (CERTIFICATE_MAX_FORWARD_DAYS_DEFAULT).
    const migration = readFileSync(
      "supabase/migrations/20260524090000_allow_forward_dated_med_certs.sql",
      "utf8",
    )

    expect(migration).toContain("issued_certificates_start_date_not_future")
    expect(migration).toContain("Australia/Sydney")
    expect(migration).toContain("NOT VALID")
    // Defensive: ensure the constraint expression is timezone-anchored AND
    // allows the 14-day forward window. Reverting to raw CURRENT_DATE would
    // re-introduce both the UTC/AEST drift bug and the no-forward-dates bug.
    expect(migration).not.toMatch(/start_date <= CURRENT_DATE/)
    expect(migration).toMatch(/\)::date\) \+ 14/)
  })

  it("allows historical correction paths and forward dating within the cap", () => {
    expect(validateCertificateStartDate("2020-01-01", { maxBackdateDays: null }).valid).toBe(true)

    // Forward-dating: tomorrow is allowed (default +14 day window).
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    expect(validateCertificateStartDate(tomorrow, { maxBackdateDays: null }).valid).toBe(true)

    // 2099 is well past +14 days, must still be blocked.
    expect(validateCertificateStartDate("2099-01-01", { maxBackdateDays: null }).valid).toBe(false)
  })

  it("treats AEST today as valid even when the UTC clock is still on yesterday", () => {
    // Regression for the 11 e2e failures + production edge case caught on
    // 2026-05-23 evening: at 14:00 UTC, Sydney rolls into the next calendar
    // day. The validator + the DB constraint must agree that AEST-today is
    // *not* in the future, otherwise doctors working in the AEST early
    // morning cannot approve a "today" certificate.
    //
    // Frozen at 2026-05-23 14:30 UTC = 2026-05-24 00:30 AEST.
    const nowAtBoundary = new Date("2026-05-23T14:30:00Z")

    // AEST today (the day after UTC today at this moment) MUST validate.
    expect(
      validateCertificateStartDate("2026-05-24", {
        maxBackdateDays: null,
        now: nowAtBoundary,
      }).valid,
    ).toBe(true)

    // AEST tomorrow is within the +14-day window — also valid by the new
    // forward-dating policy (was previously blocked, killing tomorrow-cert
    // conversions and surfaced as the original revenue regression).
    expect(
      validateCertificateStartDate("2026-05-25", {
        maxBackdateDays: null,
        now: nowAtBoundary,
      }).valid,
    ).toBe(true)

    // Past the +14-day cap must still be blocked.
    expect(
      validateCertificateStartDate("2099-01-01", {
        maxBackdateDays: null,
        now: nowAtBoundary,
      }).valid,
    ).toBe(false)
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
    // Phase 3 of dashboard remaster (2026-05-12): resend-certificate-admin
    // was merged into resend-certificate (one file, two named exports:
    // resendCertificate + resendCertificateAsStaff).
    const sensitiveSurfaces = [
      "components/patient/certificate-credentials.tsx",
      "app/verify/verify-client.tsx",
      "app/patient/intakes/[id]/client.tsx",
      "app/actions/resend-certificate.ts",
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
