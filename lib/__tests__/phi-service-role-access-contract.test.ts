import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

function beforeServiceRole(source: string): string {
  const index = source.indexOf("createServiceRoleClient()")
  expect(index).toBeGreaterThan(-1)
  return source.slice(0, index)
}

describe("PHI service-role access contracts", () => {
  it("keeps doctor certificate downloads behind staff auth and issuing-doctor/admin checks", () => {
    const source = readProjectFile("app/api/doctor/certificates/[intakeId]/download/route.ts")
    const preServiceRole = beforeServiceRole(source)

    expect(preServiceRole).toContain("applyRateLimit(request, \"standard\")")
    expect(preServiceRole).toContain("requireApiRole([\"doctor\", \"admin\"])")
    expect(source).toContain("hasAdminAccess(authResult.profile)")
    expect(source).toContain("certificate.doctor_id === authResult.profile.id")
    expect(source.indexOf("certificate.doctor_id === authResult.profile.id")).toBeLessThan(
      source.indexOf("const supabase = createServiceRoleClient()"),
    )
    expect(source).toContain("logCertificateEvent")
    expect(source).toContain("doctor_certificate_download")
    expect(source).toContain("Failed to audit certificate download")
    expect(source).toContain("\"Cache-Control\": \"private, no-store\"")
    expect(source).toContain("Certificate is not accessible to this doctor")
  })

  it("keeps patient document downloads behind auth, rate limits, and patient ownership checks", () => {
    const source = readProjectFile("app/api/patient/documents/[intakeId]/download/route.ts")
    const preServiceRole = beforeServiceRole(source)

    expect(preServiceRole).toContain("applyRateLimit(request, \"upload\"")
    expect(preServiceRole).toContain("getApiAuth()")
    expect(source).toContain("intakeData.patient_id !== profile.id")
    expect(source.indexOf("intakeData.patient_id !== profile.id")).toBeLessThan(
      source.indexOf("const supabase = createServiceRoleClient()"),
    )
    expect(source).not.toContain("patient_id: patientId")
  })

  it("keeps patient messages scoped to the authenticated patient before returning PHI", () => {
    const source = readProjectFile("app/api/patient/messages/route.ts")
    const preServiceRole = beforeServiceRole(source)

    expect(preServiceRole).toContain("applyRateLimit(request, \"sensitive\")")
    expect(preServiceRole).toContain("getApiAuth()")
    expect(source).toContain("const patientId = authResult.profile.id")
    expect(source).toContain(".eq(\"patient_id\", patientId)")
  })

  it("keeps retry-payment scoped to patient role and owned invoice/intake rows", () => {
    const source = readProjectFile("app/api/patient/retry-payment/route.ts")
    const preServiceRole = beforeServiceRole(source)

    expect(preServiceRole).toContain("applyRateLimit(request, \"sensitive\")")
    expect(preServiceRole).toContain("authResult.profile.role !== \"patient\"")
    expect(source).toContain(".eq(\"customer_id\", authResult.profile.id)")
    expect(source).toContain(".eq(\"patient_id\", patientId)")
  })

  it("keeps doctor patient summaries behind staff auth and explicit patient-access checks", () => {
    const source = readProjectFile("app/api/doctor/patients/[patientId]/summary/route.ts")

    expect(source).toContain("requireApiRole([\"doctor\", \"admin\"])")
    expect(source).toContain("doctorCanAccessPatient")
    expect(source.indexOf("doctorCanAccessPatient")).toBeLessThan(
      source.indexOf("return NextResponse.json"),
    )
  })

  it("keeps Parchment recovery actions staff-only, rate-limited, and eligibility-gated", () => {
    const source = readProjectFile("app/actions/parchment.ts")

    expect(source).toContain("checkServerActionRateLimit(`parchment:sso:${authResult.profile.id}`, \"admin\")")
    expect(source).toContain("isParchmentClaimSatisfied(intake, authResult.profile.id)")
    expect(source).toContain("checkParchmentPrescribingCapability")
    expect(source).toContain("getParchmentPatientIdentityIssues(patient, answers)")
    expect(source).toContain("checkServerActionRateLimit(`parchment:sync-retry:${authResult.profile.id}`, \"sensitive\")")
    expect(source).toContain("requireRoleOrNull([\"admin\"])")
  })
})
