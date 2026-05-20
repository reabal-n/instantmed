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
    // never appear here. The shared "Requests" label is allowed (Phase 8,
    // refund-only access — page itself returns only ledger metadata).
    expect(labels).not.toContain("Queue")
    expect(labels).not.toContain("Review queue")
    expect(labels).not.toContain("Review")
    expect(labels).not.toContain("Scripts")
    expect(labels).not.toContain("Certificates")
    expect(labels).not.toContain("Patients")
    expect(labels).not.toContain("Analytics")
    expect(labels).not.toContain("Finance")
    expect(labels).not.toContain("Doctors")
    expect(labels).not.toContain("Intakes")
  })

  it("keeps admin as the only role with the full clinical and operating nav", () => {
    const adminLabels = allLabels(getStaffNav(adminProfile))
    const doctorLabels = allLabels(getStaffNav(doctorProfile))

    expect(adminLabels).toEqual([
      "Dashboard",
      "Requests",
      "Review",
      "Scripts",
      "Patients",
      "Analytics",
      "Payments",
      "Ops",
      "Setup",
    ])
    expect(doctorLabels).toEqual(["Queue", "Scripts", "Patients", "Identity"])
    expect(doctorLabels).not.toContain("Requests")
    expect(doctorLabels).not.toContain("Analytics")
    expect(doctorLabels).not.toContain("Payments")
    expect(doctorLabels).not.toContain("Ops")
    expect(doctorLabels).not.toContain("Settings")
  })

  it("does not link to PHI-heavy admin surfaces", () => {
    const hrefs = allHrefs(supportNavSections)
    // The full patient directory shows un-redacted names + clinical history;
    // support is never routed there. Phase 8 (2026-05-20) opened the intake
    // ledger to support so they can process refund tickets, but the ledger
    // shows only payment/refund metadata (no clinical answers, Medicare, or
    // address fields) — the PHI gate stays on the intake detail page.
    expect(hrefs).not.toContain("/admin/patients")
    expect(hrefs).not.toContain("/admin/analytics")
    expect(hrefs).not.toContain("/admin/finance")
    expect(hrefs).not.toContain("/admin/doctors")
    expect(hrefs).not.toContain("/dashboard")
    expect(hrefs).not.toContain("/admin/emails/hub")
    expect(hrefs).not.toContain("/admin/settings")
  })

  it("keeps support nav scoped to the refund + recovery surfaces", () => {
    const hrefs = allHrefs(supportNavSections)
    // Phase 7: bounded ops cockpit. Phase 8 (2026-05-20): refund ledger.
    expect(hrefs).toEqual(["/admin/ops", "/admin/intakes"])
    expect(hrefs).toContain("/admin/ops")
    expect(hrefs).toContain("/admin/intakes")
    expect(hrefs).not.toContain("/admin/ops/prescribing-identity")
    expect(hrefs).not.toContain("/admin/webhook-dlq")
    expect(hrefs).not.toContain("/admin/ops/parchment")
    expect(hrefs).not.toContain("/admin/emails/hub")
    expect(hrefs).not.toContain("/admin/settings")
  })

  it("pins the Phase 7 rationale in a stable comment so the trim isn't reverted", () => {
    // Phase 7 of dashboard remaster (2026-05-12) intentionally removed the
    // patient directory entry from the support nav. Keep a marker so the
    // intent is recoverable if anyone wonders why the support nav looks
    // bare relative to doctor / admin.
    expect(navSource).toContain("Phase 7 of dashboard remaster")
    expect(navSource).toContain("bounded recovery cockpit")
    expect(navSource).toContain("masked PHI / redacted payload")
  })

  it("allows support through only the selected ops route gates", () => {
    const supportRouteSources = [
      "app/admin/layout.tsx",
      "app/admin/ops/page.tsx",
      "app/admin/webhook-dlq/page.tsx",
      "app/admin/ops/parchment/page.tsx",
      "app/admin/ops/prescribing-identity/page.tsx",
    ].map((file) => readFileSync(join(root, file), "utf8")).join("\n")

    expect(supportRouteSources).toContain('requireRole(["admin", "support"]')
    expect(supportRouteSources).toContain("navSections={navSections}")
    expect(supportRouteSources).toContain("getStaffNav")

    const adminOnlySources = [
      "app/admin/emails/hub/page.tsx",
      "app/admin/settings/page.tsx",
      "app/admin/patients/page.tsx",
      "app/admin/finance/page.tsx",
      "app/admin/analytics/page.tsx",
    ].map((file) => readFileSync(join(root, file), "utf8")).join("\n")

    expect(adminOnlySources).toContain('requireRole(["admin"]')
    expect(adminOnlySources).not.toContain('requireRole(["admin", "support"]')

    // Phase 8 (2026-05-20): the intake ledger is the one historically
    // admin-only page that opened to support so they can work refund
    // tickets. PHI stays gated on the intake detail page.
    const ledgerSource = readFileSync(join(root, "app/admin/intakes/page.tsx"), "utf8")
    expect(ledgerSource).toContain('requireRole(["admin", "support"]')
  })

  it("keeps support ops views masked and payload-redacted", () => {
    const webhookRouteSource = readFileSync(join(root, "app/api/admin/webhook-dlq/route.ts"), "utf8")
    const identitySource = readFileSync(join(root, "app/admin/ops/prescribing-identity/page.tsx"), "utf8")
    const parchmentSource = readFileSync(join(root, "app/admin/ops/parchment/page.tsx"), "utf8")

    expect(webhookRouteSource).toContain("redactWebhookDlqEntryForSupport")
    expect(identitySource).toContain("maskPatientName")
    expect(identitySource).toContain("isSupportOnly")
    expect(parchmentSource).toContain("isSupportOnly")
    expect(parchmentSource).toContain("Support view")
  })

  it("does not ship a global patient/intake palette search endpoint", () => {
    expect(() => readFileSync(join(root, "app/api/admin/palette-search/route.ts"), "utf8")).toThrow()
  })

  it("keeps support sidebar counts operational-only", () => {
    const staffCountsSource = readFileSync(join(root, "app/api/admin/staff-nav-counts/route.ts"), "utf8")

    expect(staffCountsSource).toContain("hasStaffAccess(authResult.profile)")
    expect(staffCountsSource).toContain("hasSupportAccess(authResult.profile)")
    expect(staffCountsSource).toContain("prescribingIdentityPatients: counts.prescribingIdentityPatients")
    expect(staffCountsSource).toContain("...EMPTY_STAFF_NAV_COUNTS")
    expect(staffCountsSource).not.toContain("profile.role !== \"admin\"")
  })

  it("pins the database RLS boundary for support role", () => {
    const migrationSource = readFileSync(
      join(root, "supabase/migrations/20260512140546_harden_support_role_rls_boundary.sql"),
      "utf8",
    )

    expect(migrationSource).toContain("Unsafe support RLS policy found")
    expect(migrationSource).toContain("'intake_answers'")
    expect(migrationSource).toContain("'patient_health_profiles'")
    expect(migrationSource).toContain("'prescriptions'")
    expect(migrationSource).toContain("COALESCE(qual, '') ILIKE '%support%'")
  })
})
