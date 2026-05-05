import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const settingsSource = readFileSync(
  join(process.cwd(), "app/admin/settings/page.tsx"),
  "utf8",
)
const sidebarSource = readFileSync(
  join(process.cwd(), "components/admin/admin-sidebar.tsx"),
  "utf8",
)
const adminHubSource = readFileSync(
  join(process.cwd(), "components/admin/admin-hub-zones.tsx"),
  "utf8",
)
const adminDashboardClientSource = readFileSync(
  join(process.cwd(), "app/admin/admin-dashboard-client.tsx"),
  "utf8",
)
const opsParchmentSource = readFileSync(
  join(process.cwd(), "app/admin/ops/parchment/page.tsx"),
  "utf8",
)
const financeClientSource = readFileSync(
  join(process.cwd(), "app/admin/finance/finance-client.tsx"),
  "utf8",
)
const parchmentConformanceSource = readFileSync(
  join(process.cwd(), "app/admin/parchment-conformance/parchment-conformance-client.tsx"),
  "utf8",
)
const dashboardRoutesSource = readFileSync(
  join(process.cwd(), "lib/dashboard/routes.ts"),
  "utf8",
)

function navLabels(source: string): string[] {
  return Array.from(source.matchAll(/label:\s*"([^"]+)"/g)).map((match) => match[1])
}

describe("admin navigation contract", () => {
  it("keeps settings focused on configuration instead of incident response", () => {
    expect(settingsSource).not.toContain('redirect("/admin/features")')
    expect(settingsSource).toContain('href: "/admin/features"')
    expect(settingsSource).toContain('href: "/admin/settings/templates"')
    expect(settingsSource).toContain('href: "/admin/content"')
    expect(settingsSource).not.toContain("Operational controls")
    expect(settingsSource).not.toContain('href: "/admin/webhook-dlq"')
    expect(settingsSource).not.toContain('href: "/admin/audit"')
    expect(settingsSource).not.toContain('href: "/admin/errors"')
    expect(settingsSource).not.toContain('href: "/admin/refunds"')
    expect(settingsSource).not.toContain('href: "/admin/parchment-conformance"')
  })

  it("keeps the sidebar focused and avoids duplicate or vendor-specific labels", () => {
    const labels = navLabels(sidebarSource)

    expect(labels.filter((label) => label === "Analytics")).toHaveLength(1)
    expect(sidebarSource).not.toContain("emailNavItems")
    expect(sidebarSource).not.toContain("analyticsNavItems")
    expect(sidebarSource).not.toContain("systemNavItems")
    expect(labels).toEqual([
      "Dashboard",
      "Intake ledger",
      "Analytics",
      "Finance",
      "Operations",
      "Settings",
    ])
    expect(sidebarSource).not.toContain('href: "/doctor/dashboard"')
    expect(sidebarSource).not.toContain('href: "/doctor/patients"')
    expect(sidebarSource).not.toContain('href: "/doctor/scripts"')
    expect(sidebarSource).toContain("prefetch={false}")
  })

  it("keeps the admin dashboard hub focused on operational next actions", () => {
    expect(adminHubSource).toContain("Operational focus")
    expect(adminHubSource).not.toContain("Quick navigation")
    expect(adminHubSource).not.toContain("Doctor analytics")
    expect(adminHubSource).not.toContain("Feature flags")
    expect(adminHubSource).toContain('href: "/admin/ops/parchment"')
    expect(adminHubSource).toContain('href: "/admin/webhook-dlq"')
    expect(adminHubSource).toContain('href: "/admin/emails/hub"')
    expect(adminHubSource).not.toContain('href: "/doctor')
    expect(adminHubSource).not.toContain("DOCTOR_QUEUE_REVIEW_HREF")
    expect(adminHubSource).not.toContain("configuration exceptions")
    expect(adminHubSource).not.toContain('href: "/admin/settings"')
  })

  it("keeps admin operations recovery links inside admin-owned routes", () => {
    const opsClientSource = readFileSync(
      join(process.cwd(), "app/admin/ops/ops-client.tsx"),
      "utf8",
    )

    expect(opsClientSource).not.toContain('href="/doctor')
    expect(opsClientSource).not.toContain("DOCTOR_QUEUE_REVIEW_HREF")
    expect(opsClientSource).toContain("ADMIN_STALE_INTAKES_HREF")
    expect(opsClientSource).toContain("ADMIN_PATIENT_MERGE_AUDIT_HREF")
    expect(dashboardRoutesSource).toContain('ADMIN_STALE_INTAKES_HREF = "/admin/ops/intakes-stuck"')
    expect(dashboardRoutesSource).toContain('ADMIN_PATIENT_MERGE_AUDIT_HREF = "/admin/ops/patient-merge-audit"')
  })

  it("keeps admin intake navigation on admin-owned routes", () => {
    const adminRouteSources = [
      adminDashboardClientSource,
      opsParchmentSource,
      readFileSync(join(process.cwd(), "app/admin/ops/sla/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "app/admin/ops/patient-merge-audit/page.tsx"), "utf8"),
    ].join("\n")

    expect(adminRouteSources).toContain("/admin/intakes")
    expect(adminRouteSources).toContain("/admin/patients")
    expect(adminRouteSources).not.toContain("/doctor/intakes")
    expect(adminRouteSources).not.toContain("/doctor/patients")
    expect(readFileSync(join(process.cwd(), "app/admin/intakes/[id]/page.tsx"), "utf8")).toContain("DoctorIntakeDetailPage")
    expect(readFileSync(join(process.cwd(), "app/admin/patients/[id]/page.tsx"), "utf8")).toContain("DoctorPatientDetailPage")
  })

  it("does not send failed admin role checks back into the doctor portal", () => {
    const adminPageSources = [
      "app/admin/audit/page.tsx",
      "app/admin/compliance/page.tsx",
      "app/admin/emails/suppression/page.tsx",
      "app/admin/features/page.tsx",
      "app/admin/finance/page.tsx",
      "app/admin/finance/revenue/page.tsx",
      "app/admin/refunds/page.tsx",
      "app/admin/settings/page.tsx",
      "app/admin/settings/encryption/page.tsx",
      "app/admin/webhook-dlq/page.tsx",
    ].map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n")

    expect(adminPageSources).not.toContain('redirectTo: "/doctor/dashboard"')
    expect(adminPageSources).toContain('redirectTo: "/admin"')
  })

  it("routes vendor and money recovery links through their owning dashboards", () => {
    expect(opsParchmentSource).toContain('href="/admin/parchment-conformance"')
    expect(financeClientSource).toContain('href="/admin/refunds"')
  })

  it("makes Parchment recording evidence boundaries explicit", () => {
    expect(parchmentConformanceSource).toContain("Record Prescriber/Admin in Parchment")
    expect(parchmentConformanceSource).toContain("Record iframe in InstantMed")
    expect(parchmentConformanceSource).toContain("Record webhook across both systems")
    expect(parchmentConformanceSource).toContain("supporting evidence")
    expect(parchmentConformanceSource).not.toContain(
      "Use this admin-only helper for the remaining Parchment user-management videos",
    )
  })
})
