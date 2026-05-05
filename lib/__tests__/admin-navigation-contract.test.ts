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
      "Clinical queue",
      "Patients",
      "Analytics",
      "Finance",
      "Operations",
      "Settings",
    ])
  })

  it("keeps the admin dashboard hub focused on operational next actions", () => {
    expect(adminHubSource).toContain("Operational focus")
    expect(adminHubSource).not.toContain("Quick navigation")
    expect(adminHubSource).not.toContain("Doctor analytics")
    expect(adminHubSource).not.toContain("Feature flags")
    expect(adminHubSource).toContain('href: "/admin/ops/parchment"')
    expect(adminHubSource).toContain('href: "/admin/webhook-dlq"')
    expect(adminHubSource).toContain('href: "/admin/emails/hub"')
    expect(adminHubSource).not.toContain("configuration exceptions")
    expect(adminHubSource).not.toContain('href: "/admin/settings"')
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
