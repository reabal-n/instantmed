import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("future doctor scope contract", () => {
  it("keeps the patient-directory data layer scoped for non-admin doctors", () => {
    const source = read("lib/data/patient-directory.ts")

    expect(source).toContain("doctorId?: string")
    expect(source).toContain("getDoctorAccessiblePatientIds(doctorId, supabase)")
    expect(source).toContain('query.in("id", accessiblePatientIds)')
    expect(source).toContain("accessiblePatientIds?.length === 0")
  })

  it("passes doctor scope from the doctor patient directory page", () => {
    const source = read("app/doctor/patients/page.tsx")

    expect(source).toContain("hasAdminAccess(auth.profile) ? undefined : auth.profile.id")
    expect(source).toContain("doctorId:")
  })

  it("blocks non-admin doctors from direct patient-profile and drawer API access outside scope", () => {
    const detailSource = read("app/doctor/patients/[id]/page.tsx")
    const summarySource = read("app/api/doctor/patients/[patientId]/summary/route.ts")
    const healthProfileSource = read("app/api/doctor/patients/[patientId]/health-profile/route.ts")

    expect(detailSource).toContain("doctorCanAccessPatient(options.doctorId, patientIds, supabase)")
    expect(detailSource).toContain("Doctor attempted to access patient outside their scope")
    expect(detailSource).toContain("canAccessMergedPatient")
    expect(summarySource).toContain("doctorCanAccessPatient(authResult.profile.id, patientId)")
    expect(summarySource).toContain('NextResponse.json({ error: "Not found" }, { status: 404 })')
    expect(healthProfileSource).toContain("doctorCanAccessPatient(authResult.profile.id, patientId)")
    expect(healthProfileSource).toContain('NextResponse.json({ error: "Not found" }, { status: 404 })')
  })

  it("scopes /api/search patient results to a non-admin doctor's accessible patients", () => {
    const source = read("app/api/search/route.ts")

    // The shared guard supplies the caller profile and rejects closed-account
    // tombstones before search touches patient rows.
    expect(source).toContain("await getApiAuth()")
    // Non-admin doctors are constrained to patients they have a relationship with;
    // admins remain unscoped. Without this, any doctor could enumerate the full roster.
    expect(source).toContain("hasAdminAccess(")
    expect(source).toContain("getDoctorAccessiblePatientIds(")
    expect(source).toContain('.in("id"')
  })

  it("keeps analytics out of the future-doctor operating surface", () => {
    const nextConfigSource = read("next.config.mjs")

    expect(existsSync(join(root, "app/doctor/analytics/page.tsx"))).toBe(false)
    expect(nextConfigSource).toContain('source: "/doctor/analytics", destination: "/dashboard"')
    expect(nextConfigSource).not.toContain('source: "/doctor/analytics", destination: "/admin/analytics"')
  })

  it("defines concrete doctor-patient relationship sources and excludes the unclaimed queue", () => {
    const source = read("lib/doctor/patient-access.ts")

    expect(source).toContain("deliberately excludes the global unclaimed queue")
    expect(source).toContain("claimed_by.eq")
    expect(source).toContain("reviewing_doctor_id.eq")
    expect(source).toContain("reviewed_by.eq")
    expect(source).toContain('.from("script_tasks")')
    expect(source).toContain('.from("issued_certificates")')
    expect(source).toContain('.from("patient_notes")')
  })
})
