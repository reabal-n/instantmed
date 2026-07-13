import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// Phase 1.2 of dashboard remaster (2026-05-11): the doctor sidebar is now
// `components/admin/admin-sidebar.tsx` (via OperatorShell + getStaffNav),
// not the retired `components/shared/dashboard-sidebar.tsx`. Doctor-side
// contract assertions read admin-sidebar.tsx.
const sidebarSource = readFileSync(
  join(process.cwd(), "components/admin/admin-sidebar.tsx"),
  "utf8",
)
const doctorLayoutSource = readFileSync(
  join(process.cwd(), "app/doctor/layout.tsx"),
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
const nextConfigSource = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8")
// Phase 2 of dashboard remaster (2026-05-12): the doctor dashboard moved to
// the canonical /dashboard surface. Legacy doctor entrypoints now redirect at
// the Next config layer, so there are no duplicate React page stubs.
const dashboardHeaderSource = readFileSync(
  join(process.cwd(), "app/dashboard/page.tsx"),
  "utf8",
)
const doctorAvailabilityToggleSource = readFileSync(
  join(process.cwd(), "components/doctor/doctor-availability-toggle.tsx"),
  "utf8",
)
const doctorSettingsPageSource = readFileSync(
  join(process.cwd(), "app/doctor/settings/page.tsx"),
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
const staffNavigationSource = readFileSync(
  join(process.cwd(), "lib/dashboard/staff-navigation.ts"),
  "utf8",
)

function navLabels(source: string): string[] {
  return Array.from(source.matchAll(/label:\s*"([^"]+)"/g)).map((match) => match[1])
}

function navSourceBlock(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start)
  const endIndex = end ? source.indexOf(end) : source.length
  return source.slice(startIndex, endIndex > startIndex ? endIndex : source.length)
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
    const doctorNavSource = navSourceBlock(
      staffNavigationSource,
      "export const doctorNavSections",
      "export const doctorOperatorNavItems",
    )
    // Phase 1 of dashboard remaster (2026-05-11) added the role-aware
    // `getStaffNav`/`supportNavSections` block after `doctorOperatorNavItems`.
    // Stop the doctor-side slice at the new section marker so doctor-nav
    // assertions don't accidentally pick up support labels.
    const operatorNavSource = navSourceBlock(
      staffNavigationSource,
      "export const doctorOperatorNavItems",
      "// ── Canonical role-aware nav",
    )
    const labels = navLabels(`${doctorNavSource}\n${operatorNavSource}`)

    // Doctor layout renders the unified AdminSidebar with role-aware nav from
    // getStaffNav(profile). Verify the wiring is intact.
    expect(doctorLayoutSource).toContain("OperatorShell")
    expect(doctorLayoutSource).toContain("getStaffNav")
    expect(doctorLayoutSource).toContain("getDoctorOnboardingStatus")
    expect(onboardingBannerSource).not.toContain("/api/doctor/onboarding-status")
    expect(doctorLayoutSource).toContain("hideMobileHamburger")
    expect(sidebarSource).toContain("operatorNavSections")
    expect(sidebarSource).toContain("navSections")
    expect(labels).toContain("Queue")
    // "Scripts" was consolidated away 2026-07-12: it deep-linked to the same
    // /dashboard queue with the scripts tab active; the in-page tab strip owns
    // that filter. Do not re-add a status-filter deep-link as a nav item.
    expect(labels).not.toContain("Scripts")
    expect(labels).toContain("Patients")
    expect(labels).toContain("Identity")
    expect(labels).toContain("Operations")
    expect(labels).not.toContain("Analytics")
    expect(labels).not.toContain("Review Queue")
    expect(labels).not.toContain("Email Suppression")
    expect(labels).not.toContain("Shortcuts")
    expect(labels).not.toContain("Export CSV")
    expect(sidebarSource).not.toContain('href: "/doctor/email-suppression"')
    expect(sidebarSource).not.toContain("/api/doctor/export")
    expect(sidebarSource).not.toContain("KeyboardShortcutsModal")
    // Phase 1.2: legacy patient-only DashboardSidebar export is retired.
    expect(existsSync(join(process.cwd(), "components/shared/dashboard-sidebar.tsx"))).toBe(false)
  })

  it("uses the same doctor labels on mobile", () => {
    const doctorNavSource = navSourceBlock(
      staffNavigationSource,
      "export const doctorNavSections",
      "export const doctorOperatorNavItems",
    )
    const operatorNavSource = navSourceBlock(
      staffNavigationSource,
      "export const doctorOperatorNavItems",
      "// ── Canonical role-aware nav",
    )

    expect(mobileNavSource).toContain("doctorNavSections")
    expect(mobileNavSource).toContain("doctorOperatorNavItems")
    expect(navLabels(`${doctorNavSource}\n${operatorNavSource}`)).toEqual([
      "Queue",
      "Patients",
      "Identity",
      "Operations",
    ])
    // The admin-only "Operations" extra must open the ops cockpit — pointing
    // it at /dashboard duplicated the Queue entry (two mobile items, one page).
    expect(operatorNavSource).toContain('{ href: STAFF_OPS_HREF, label: "Operations"')
    expect(mobileNavSource).toContain("isAdmin")
    expect(mobileNavSource).toContain("useSearchParams")
    expect(mobileNavSource).toContain("getStaffNavHrefStatus")
    expect(mobileNavSource).not.toContain('label: "Certificates"')
    expect(mobileNavSource).not.toContain('label: "Settings"')
  })

  it("keeps the dashboard header focused on queue state, not duplicated sidebar routes", () => {
    // Phase 2 contract: the unified dashboard header surfaces availability +
    // system health. It does not re-render the sidebar routes inline.
    expect(dashboardHeaderSource).toContain('title="Dashboard"')
    expect(dashboardHeaderSource).not.toContain('title="Review Queue"')
    expect(dashboardHeaderSource).not.toContain('href="/doctor/scripts"')
    expect(dashboardHeaderSource).not.toContain('href="/doctor/patients"')
    expect(dashboardHeaderSource).not.toContain('href="/doctor/settings/identity"')
    expect(dashboardHeaderSource).toContain("DoctorAvailabilityToggle")
    expect(dashboardHeaderSource).toContain("SystemHealthPill")
    expect(doctorAvailabilityToggleSource).toContain("setDoctorAvailabilityAction")
    expect(doctorAvailabilityToggleSource).toContain("Available")
    // No big keyboard hint card on the header — keep it quiet.
    expect(dashboardHeaderSource).not.toContain("<kbd")
  })

  it("keeps legacy shared doctor menus aligned with the current doctor sitemap", () => {
    const sharedDoctorNav = [sharedUserMenuSource, sharedMobileMenuSource].join("\n")

    expect(sharedDoctorNav).toContain("STAFF_DOCTOR_SCRIPTS_HREF")
    expect(sharedDoctorNav).toContain("STAFF_DOCTOR_PATIENTS_HREF")
    expect(sharedDoctorNav).toContain("STAFF_IDENTITY_HREF")
    expect(sharedUserMenuSource).toContain("useSearchParams")
    expect(sharedUserMenuSource).toContain('dashboardStatus === "scripts"')
    expect(sharedUserMenuSource).toContain('dashboardStatus !== "scripts"')
    expect(sharedDoctorNav).not.toContain("/doctor/intakes")
    expect(sharedDoctorNav).not.toContain("/doctor/scripts")
    expect(sharedMobileMenuSource).not.toContain('label: "Admin"')
  })

  it("never full-prefetches PHI route payloads from the persistent sidebar", () => {
    // Privacy invariant: the sidebar must not force FULL route prefetch —
    // prefetch={true} / router.prefetch would pull the dynamic PHI page
    // payload into the browser cache on hover/viewport. Default (auto)
    // prefetch is allowed and deliberate: on our force-dynamic staff routes it
    // prefetches only the shared layout down to the nearest loading.tsx
    // boundary (the skeleton), never the PHI payload — that skeleton warming
    // is what makes sidebar navigation feel instant. prefetch={false} was
    // stricter than the privacy requirement and made every click sit frozen
    // for a full server round-trip (2026-07-12 lag fix).
    expect(sidebarSource).not.toContain("router.prefetch")
    expect(sidebarSource).not.toContain("prefetch={true}")
    expect(sidebarSource).not.toContain("prefetch={false}")
  })

  it("keeps scripts work inside the unified dashboard instead of a second page", () => {
    expect(existsSync(join(process.cwd(), "app/doctor/scripts/page.tsx"))).toBe(false)
    // 2026-07-12 consolidation: scripts is an in-page dashboard tab, not a nav
    // item — the nav no longer references the scripts deep-link at all. The
    // redirect for old bookmarks/links stays.
    expect(staffNavigationSource).not.toContain("STAFF_DOCTOR_SCRIPTS_HREF")
    expect(staffNavigationSource).not.toContain('href: "/doctor/scripts"')
    expect(nextConfigSource).toContain('source: "/doctor/scripts"')
    expect(nextConfigSource).toContain('destination: "/dashboard?status=scripts#doctor-queue"')
    expect(dashboardHeaderSource).toContain("QueueClient")
  })

  it("keeps legacy doctor routes as redirects to canonical surfaces", () => {
    expect(nextConfigSource).toContain('source: "/doctor", destination: "/dashboard"')
    expect(nextConfigSource).toContain('source: "/doctor/dashboard", destination: "/dashboard"')
    expect(nextConfigSource).toContain('source: "/doctor/queue", destination: "/dashboard?status=review#doctor-queue"')
    expect(nextConfigSource).toContain('source: "/doctor/certificates", destination: "/dashboard"')
    expect(nextConfigSource).toContain('source: "/doctor/scripts", destination: "/dashboard?status=scripts#doctor-queue"')
    expect(doctorSettingsPageSource).toContain('requireRole(["doctor", "admin"]')
    expect(doctorSettingsPageSource).toContain("STAFF_IDENTITY_HREF")
    expect(doctorSettingsPageSource).toContain("redirect(STAFF_IDENTITY_HREF)")
    expect(doctorSettingsPageSource).not.toContain('redirect("/admin/settings/doctor-identity")')
    expect(nextConfigSource).toContain('source: "/doctor/email-suppression"')
    expect(nextConfigSource).toContain('destination: "/admin/emails/suppression"')
  })

  it("keeps doctor analytics pruned to a redirect, not a second dashboard", () => {
    expect(existsSync(join(process.cwd(), "app/doctor/analytics/page.tsx"))).toBe(false)
    expect(nextConfigSource).toContain('source: "/doctor/analytics", destination: "/dashboard"')
    expect(nextConfigSource).not.toContain('source: "/doctor/analytics", destination: "/admin/analytics"')
  })

  it("keeps portal surfaces free of decorative progress motion", () => {
    const portalSource = [
      onboardingBannerSource,
      clinicalNotesEditorSource,
    ].join("\n")

    expect(portalSource).not.toContain("transition-[width] duration-500")
    expect(portalSource).not.toContain("transition-[width] duration-300")
    expect(portalSource).not.toContain("bg-amber-400 animate-pulse")
  })

  it("keeps the dashboard onboarding prompts compact enough for a bounded viewport", () => {
    // Phase 2 of dashboard remaster (2026-05-12): the doctor dashboard moved
    // to /dashboard. The legacy /doctor/dashboard route is now redirect-only.
    // Compactness assertions apply to the new surface.
    const dashboardPageSource = readFileSync(
      join(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    )
    const doctorLayoutSource = readFileSync(
      join(process.cwd(), "app/doctor/layout.tsx"),
      "utf8",
    )

    expect(onboardingBannerSource).toContain('data-testid="doctor-onboarding-banner"')
    expect(onboardingBannerSource).toContain("sm:grid-cols-[auto_minmax(0,1fr)_auto]")
    expect(onboardingBannerSource).not.toContain("mx-4 mb-4")
    // Bounded layout via OperatorPage + OperatorScrollArea.
    expect(dashboardPageSource).toContain("OperatorPage")
    expect(dashboardPageSource).toContain("OperatorScrollArea")
    expect(doctorLayoutSource).toContain("lg:py-5")
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
      join(process.cwd(), "app/doctor/settings/page.tsx"),
    ])

    for (const pageFile of findDoctorPageFiles()) {
      if (redirectOnlyPages.has(pageFile)) continue

      const source = readFileSync(pageFile, "utf8")
      expect(source, pageFile).toContain('requireRole(["doctor", "admin"]')
      expect(source, pageFile).not.toContain("getAuthenticatedUserWithProfile")
    }
  })
})
