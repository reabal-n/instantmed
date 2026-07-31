import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const ledgerPage = read("app/admin/intakes/page.tsx")
const ledgerClient = read("app/admin/intakes/intakes-ledger-client.tsx")
const ledgerAction = read("app/admin/intakes/search-actions.ts")
const adminPatientsPage = read("app/admin/patients/page.tsx")
const doctorPatientsPage = read("app/doctor/patients/page.tsx")
const patientsClient = read("app/doctor/patients/patients-list-client.tsx")
const patientsAction = read("app/doctor/patients/search-actions.ts")
const routes = read("lib/dashboard/routes.ts")
const patientDirectory = read("lib/data/patient-directory.ts")
const patientSort = read("lib/data/patient-directory-sort.ts")

describe("private staff search contract", () => {
  it("strips incoming legacy q URLs before either staff directory reads data", () => {
    for (const source of [ledgerPage, adminPatientsPage, doctorPatientsPage]) {
      expect(source).toContain('if (typeof params.q !== "undefined")')
      expect(source).toContain("redirect(")
    }

    expect(ledgerPage.indexOf('if (typeof params.q !== "undefined")')).toBeLessThan(
      ledgerPage.indexOf("getAllIntakesForAdmin({"),
    )
    expect(adminPatientsPage.indexOf('if (typeof params.q !== "undefined")')).toBeLessThan(
      adminPatientsPage.indexOf("getPatientDirectoryPage({"),
    )
    expect(doctorPatientsPage.indexOf('if (typeof params.q !== "undefined")')).toBeLessThan(
      doctorPatientsPage.indexOf("getPatientDirectoryPage({"),
    )
  })

  it("keeps identifiers out of ledger and patient navigation builders", () => {
    const ledgerBuilder = routes.slice(
      routes.indexOf("export function buildStaffLedgerHref"),
      routes.indexOf("export function buildAdminIntakeHref"),
    )
    expect(ledgerBuilder).not.toContain(" q?:")
    expect(ledgerBuilder).not.toContain('params.set("q"')
    expect(patientSort).not.toContain('params.set("q"')
    expect(ledgerClient).not.toContain('params.set("q"')
    expect(patientsClient).not.toContain('params.set("q"')
  })

  it("uses authenticated, rate-limited POST actions for both search surfaces", () => {
    expect(ledgerClient).toContain("searchAdminLedgerAction")
    expect(patientsClient).toContain("searchPatientDirectoryAction")
    expect(ledgerAction).toContain('requireRoleOrNull(["admin", "support"])')
    expect(ledgerAction).toContain("checkServerActionRateLimit")
    expect(patientsAction).toContain('requireRoleOrNull(["doctor", "admin"])')
    expect(patientsAction).toContain("checkServerActionRateLimit")
  })

  it("re-derives support masking and doctor patient scope inside the server boundary", () => {
    expect(ledgerAction).toContain('auth.profile.role === "support" ? "support" : "admin"')
    expect(ledgerAction).toContain("viewerRole,")
    expect(patientsAction).toContain("hasAdminAccess(auth.profile) ? undefined : auth.profile.id")
    expect(patientsAction).not.toMatch(/doctorId\s*:\s*input/)
  })

  it("does not log provider messages that can echo patient-search predicates", () => {
    const profileQueryFailure = patientDirectory.slice(
      patientDirectory.indexOf("const { data, error, count } = await query.range"),
      patientDirectory.indexOf("const rawPatients"),
    )

    expect(profileQueryFailure).toContain("errorCode: error.code")
    expect(profileQueryFailure).not.toContain("error.message")
  })
})
