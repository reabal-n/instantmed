import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const sidebarSource = readFileSync(
  join(process.cwd(), "components/shared/dashboard-sidebar.tsx"),
  "utf8",
)
const sharedIndexSource = readFileSync(
  join(process.cwd(), "components/shared/index.ts"),
  "utf8",
)
const sharedUserMenuSource = readFileSync(
  join(process.cwd(), "components/shared/navbar/user-menu.tsx"),
  "utf8",
)
const sharedMobileMenuSource = readFileSync(
  join(process.cwd(), "components/shared/navbar/mobile-menu-content.tsx"),
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
const scriptsClientSource = readFileSync(
  join(process.cwd(), "app/doctor/scripts/scripts-client.tsx"),
  "utf8",
)
const scriptsPageSource = readFileSync(
  join(process.cwd(), "app/doctor/scripts/page.tsx"),
  "utf8",
)
const doctorAnalyticsSource = readFileSync(
  join(process.cwd(), "app/doctor/analytics/analytics-client.tsx"),
  "utf8",
)
const onboardingBannerSource = readFileSync(
  join(process.cwd(), "components/doctor/onboarding-banner.tsx"),
  "utf8",
)
const clinicalNotesEditorSource = readFileSync(
  join(process.cwd(), "components/doctor/review/clinical-notes-editor.tsx"),
  "utf8",
)
const doctorIntakeDetailSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/page.tsx"),
  "utf8",
)
const doctorPatientDetailSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/page.tsx"),
  "utf8",
)
const reissueCertificateSource = readFileSync(
  join(process.cwd(), "app/actions/reissue-cert.ts"),
  "utf8",
)
const legacyDoctorEmailSuppressionSource = readFileSync(
  join(process.cwd(), "app/doctor/email-suppression/page.tsx"),
  "utf8",
)

function navLabels(source: string): string[] {
  return Array.from(source.matchAll(/label:\s*"([^"]+)"/g)).map((match) => match[1])
}

function findDoctorPageFiles(dir = join(process.cwd(), "app/doctor")): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return findDoctorPageFiles(fullPath)
    return entry.name === "page.tsx" ? [fullPath] : []
  })
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
    expect(labels).not.toContain("Shortcuts")
    expect(labels).not.toContain("Export CSV")
    expect(sidebarSource).not.toContain('href: "/doctor/email-suppression"')
    expect(sidebarSource).not.toContain("/api/doctor/export")
    expect(sidebarSource).not.toContain("KeyboardShortcutsModal")
    expect(sharedIndexSource).not.toContain("MobileDashboardNav")
  })

  it("uses the same doctor labels on mobile", () => {
    expect(mobileNavSource).toContain('label: "Queue"')
    expect(mobileNavSource).toContain('label: "Scripts"')
    expect(mobileNavSource).toContain('label: "Patients"')
    expect(mobileNavSource).toContain('label: "Identity"')
    expect(mobileNavSource).toContain('label: "Admin dashboard"')
    expect(mobileNavSource).toContain("isAdmin")
    expect(mobileNavSource).not.toContain('label: "Certificates"')
    expect(mobileNavSource).not.toContain('label: "Settings"')
  })

  it("keeps the dashboard header focused on queue state, not duplicated sidebar routes", () => {
    expect(dashboardHeaderSource).toContain('title="Queue"')
    expect(dashboardHeaderSource).toContain('description="Clinical cases awaiting review"')
    expect(dashboardHeaderSource).not.toContain('title="Review Queue"')
    expect(dashboardHeaderSource).not.toContain('href="/doctor/scripts"')
    expect(dashboardHeaderSource).not.toContain('href="/doctor/patients"')
    expect(dashboardHeaderSource).not.toContain('href="/doctor/settings/identity"')
    expect(dashboardHeaderSource).toContain("setDoctorAvailabilityAction")
    expect(dashboardHeaderSource).toContain("Available")
    expect(dashboardHeaderSource).not.toContain("<kbd")
    expect(dashboardHeaderSource).not.toContain("navigate")
    expect(dashboardHeaderSource).not.toContain("approve")
    expect(dashboardHeaderSource).not.toContain("decline")
  })

  it("keeps legacy shared doctor menus aligned with the current doctor sitemap", () => {
    const sharedDoctorNav = [sharedUserMenuSource, sharedMobileMenuSource].join("\n")

    expect(sharedDoctorNav).toContain("/doctor/scripts")
    expect(sharedDoctorNav).toContain("/doctor/patients")
    expect(sharedDoctorNav).toContain("/doctor/settings/identity")
    expect(sharedDoctorNav).not.toContain("/doctor/intakes")
    expect(sharedMobileMenuSource).not.toContain('label: "Admin"')
  })

  it("does not eagerly prefetch every dashboard route from the persistent sidebar", () => {
    expect(sidebarSource).toContain("prefetch={false}")
    expect(sidebarSource).not.toContain("router.prefetch")
    expect(sidebarSource).not.toContain("prefetch={true}")
  })

  it("keeps the scripts screen quiet when there are no tasks", () => {
    expect(scriptsClientSource).toContain('title="Scripts"')
    expect(scriptsClientSource).toContain('description="Prescriptions waiting for Parchment send confirmation"')
    expect(scriptsClientSource).not.toContain('title="Script To-Do"')
    expect(scriptsPageSource).toContain("pageSize: 25")
    expect(scriptsClientSource).toContain("const PAGE_SIZE = 25")
    expect(scriptsClientSource).toContain("hasScriptActivity")
    expect(scriptsClientSource).toContain("{hasScriptActivity && (")
  })

  it("keeps legacy doctor routes as redirects to canonical surfaces", () => {
    expect(doctorQueuePageSource).toContain("buildDoctorQueueRedirectHref")
    expect(doctorSettingsPageSource).toContain('redirect("/doctor/settings/identity")')
    expect(legacyDoctorEmailSuppressionSource).toContain('redirect("/admin/emails/suppression")')
    expect(legacyDoctorEmailSuppressionSource).not.toContain("Email Suppression | InstantMed")
  })

  it("keeps portal surfaces free of decorative progress motion", () => {
    const portalSource = [
      doctorAnalyticsSource,
      onboardingBannerSource,
      clinicalNotesEditorSource,
    ].join("\n")

    expect(portalSource).not.toContain("transition-[width] duration-500")
    expect(portalSource).not.toContain("transition-[width] duration-300")
    expect(portalSource).not.toContain("bg-amber-400 animate-pulse")
  })

  it("requires doctor or admin role for clinical detail pages", () => {
    expect(doctorIntakeDetailSource).toContain('requireRole(["doctor", "admin"]')
    expect(doctorIntakeDetailSource).not.toContain("getAuthenticatedUserWithProfile")
    expect(doctorPatientDetailSource).toContain('requireRole(["doctor", "admin"]')
    expect(doctorPatientDetailSource).not.toContain('redirectTo: "/doctor/dashboard"')
    expect(reissueCertificateSource).toContain('requireRoleOrNull(["doctor", "admin"]')
  })

  it("keeps doctor data pages explicitly gated for doctor or admin users", () => {
    const redirectOnlyPages = new Set([
      join(process.cwd(), "app/doctor/page.tsx"),
      join(process.cwd(), "app/doctor/queue/page.tsx"),
      join(process.cwd(), "app/doctor/settings/page.tsx"),
      join(process.cwd(), "app/doctor/email-suppression/page.tsx"),
    ])

    for (const pageFile of findDoctorPageFiles()) {
      if (redirectOnlyPages.has(pageFile)) continue

      const source = readFileSync(pageFile, "utf8")
      expect(source, pageFile).toContain('requireRole(["doctor", "admin"]')
      expect(source, pageFile).not.toContain("getAuthenticatedUserWithProfile")
    }
  })
})
