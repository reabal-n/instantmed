import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const sidebarSource = readFileSync(
  join(process.cwd(), "components/shared/dashboard-sidebar.tsx"),
  "utf8",
)
const mobileNavSource = readFileSync(
  join(process.cwd(), "components/ui/mobile-nav.tsx"),
  "utf8",
)
const dashboardHeaderSource = readFileSync(
  join(process.cwd(), "app/doctor/dashboard/dashboard-header.tsx"),
  "utf8",
)
const doctorQueuePageSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/page.tsx"),
  "utf8",
)
const doctorSettingsPageSource = readFileSync(
  join(process.cwd(), "app/doctor/settings/page.tsx"),
  "utf8",
)

function navLabels(source: string): string[] {
  return Array.from(source.matchAll(/label:\s*"([^"]+)"/g)).map((match) => match[1])
}

describe("doctor navigation contract", () => {
  it("keeps the doctor sidebar task-first and free of admin-only operational links", () => {
    const labels = navLabels(sidebarSource)

    expect(sidebarSource).toContain("doctorNavSections")
    expect(labels).toContain("Queue")
    expect(labels).toContain("Scripts")
    expect(labels).toContain("Patients")
    expect(labels).toContain("Analytics")
    expect(labels).toContain("Identity")
    expect(labels).toContain("Admin dashboard")
    expect(labels).not.toContain("Review Queue")
    expect(labels).not.toContain("Email Suppression")
    expect(sidebarSource).not.toContain('href: "/doctor/email-suppression"')
  })

  it("uses the same doctor labels on mobile", () => {
    expect(mobileNavSource).toContain('label: "Queue"')
    expect(mobileNavSource).toContain('label: "Scripts"')
    expect(mobileNavSource).toContain('label: "Patients"')
    expect(mobileNavSource).toContain('label: "Identity"')
    expect(mobileNavSource).not.toContain('label: "Settings"')
  })

  it("puts the highest-frequency doctor destinations in the dashboard header", () => {
    expect(dashboardHeaderSource).toContain('href="/doctor/scripts"')
    expect(dashboardHeaderSource).toContain('href="/doctor/patients"')
    expect(dashboardHeaderSource).toContain('href="/doctor/settings/identity"')
    expect(dashboardHeaderSource).not.toContain("<kbd")
    expect(dashboardHeaderSource).not.toContain("navigate")
    expect(dashboardHeaderSource).not.toContain("approve")
    expect(dashboardHeaderSource).not.toContain("decline")
  })

  it("keeps legacy doctor routes as redirects to canonical surfaces", () => {
    expect(doctorQueuePageSource).toContain("buildDoctorQueueRedirectHref")
    expect(doctorSettingsPageSource).toContain('redirect("/doctor/settings/identity")')
  })
})
