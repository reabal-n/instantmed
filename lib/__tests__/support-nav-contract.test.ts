import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { getStaffNav, supportNavSections } from "@/lib/dashboard/staff-navigation"
import type { Profile } from "@/types/db"

const root = process.cwd()
const navSource = readFileSync(join(root, "lib/dashboard/staff-navigation.ts"), "utf8")

const supportProfile = { role: "support" } as Pick<Profile, "role">
const doctorProfile = { role: "doctor" } as Pick<Profile, "role">
const adminProfile = { role: "admin" } as Pick<Profile, "role">

function allLabels(sections: ReturnType<typeof getStaffNav>): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.label))
}

function allHrefs(sections: ReturnType<typeof getStaffNav>): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.href))
}

describe("support nav contract", () => {
  it("renders the support nav only for support-role profiles", () => {
    expect(getStaffNav(supportProfile)).toEqual(supportNavSections)
    expect(getStaffNav(doctorProfile)).not.toEqual(supportNavSections)
    expect(getStaffNav(adminProfile)).not.toEqual(supportNavSections)
  })

  it("does not include any clinical entry points in the support nav", () => {
    const labels = allLabels(supportNavSections)
    // Support is non-clinical operations only; these clinical labels must
    // never appear here.
    expect(labels).not.toContain("Queue")
    expect(labels).not.toContain("Review queue")
    expect(labels).not.toContain("Scripts")
    expect(labels).not.toContain("Certificates")
    expect(labels).not.toContain("Patients")
    expect(labels).not.toContain("Analytics")
    expect(labels).not.toContain("Finance")
    expect(labels).not.toContain("Doctors")
    expect(labels).not.toContain("Intakes")
  })

  it("does not link to PHI-heavy admin surfaces", () => {
    const hrefs = allHrefs(supportNavSections)
    // The full patient directory shows un-redacted names; support must not
    // be routed there even as a misleading link. Phase 4 of dashboard
    // remaster collapsed `/admin/patients/[id]` to a redirect to the
    // doctor profile (which has its own role gate), so even if the link
    // existed it would fail closed, but we want the nav to match the
    // access boundary.
    expect(hrefs).not.toContain("/admin/patients")
    expect(hrefs).not.toContain("/admin/intakes")
    expect(hrefs).not.toContain("/admin/analytics")
    expect(hrefs).not.toContain("/admin/finance")
    expect(hrefs).not.toContain("/admin/doctors")
    expect(hrefs).not.toContain("/dashboard")
  })

  it("surfaces the operational recovery and identity chase-up paths", () => {
    const hrefs = allHrefs(supportNavSections)
    expect(hrefs).toContain("/admin/ops")
    expect(hrefs).toContain("/admin/ops/prescribing-identity")
    expect(hrefs).toContain("/admin/emails/hub")
    expect(hrefs).toContain("/admin/webhook-dlq")
    expect(hrefs).toContain("/admin/ops/parchment")
  })

  it("pins the Phase 7 rationale in a stable comment so the trim isn't reverted", () => {
    // Phase 7 of dashboard remaster (2026-05-12) intentionally removed the
    // patient directory entry from the support nav. Keep a marker so the
    // intent is recoverable if anyone wonders why the support nav looks
    // bare relative to doctor / admin.
    expect(navSource).toContain("Phase 7 of dashboard remaster")
    expect(navSource).toContain("masked PHI")
  })
})
