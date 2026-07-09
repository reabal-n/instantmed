import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const settingsSource = readFileSync(
  join(process.cwd(), "app/admin/settings/page.tsx"),
  "utf8",
)
const nextConfigSource = readFileSync(join(process.cwd(), "next.config.mjs"), "utf8")
const sidebarSource = readFileSync(
  join(process.cwd(), "components/admin/admin-sidebar.tsx"),
  "utf8",
)
const adminIntakesLedgerSource = readFileSync(
  join(process.cwd(), "app/admin/intakes/intakes-ledger-client.tsx"),
  "utf8",
)
const intakesQueriesSource = readFileSync(
  join(process.cwd(), "lib/data/intakes/queries.ts"),
  "utf8",
)
const patientHandoffSource = readFileSync(
  join(process.cwd(), "lib/doctor/patient-handoff.ts"),
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
const analyticsClientSource = readFileSync(
  join(process.cwd(), "app/admin/analytics/analytics-client.tsx"),
  "utf8",
)
const analyticsPageSource = readFileSync(
  join(process.cwd(), "app/admin/analytics/page.tsx"),
  "utf8",
)
const auditClientSource = readFileSync(
  join(process.cwd(), "app/admin/audit/audit-client.tsx"),
  "utf8",
)
const dashboardRoutesSource = readFileSync(
  join(process.cwd(), "lib/dashboard/routes.ts"),
  "utf8",
)
const certificateIdentitySource = readFileSync(
  join(process.cwd(), "app/admin/settings/templates/certificate-details-client.tsx"),
  "utf8",
)
const dashboardRedirectSource = readFileSync(
  join(process.cwd(), "app/dashboard/page.tsx"),
  "utf8",
)
const adminLayoutSource = readFileSync(
  join(process.cwd(), "app/admin/layout.tsx"),
  "utf8",
)
const operatorShellSource = readFileSync(
  join(process.cwd(), "components/operator/operator-shell.tsx"),
  "utf8",
)
const staffNavigationSource = readFileSync(
  join(process.cwd(), "lib/dashboard/staff-navigation.ts"),
  "utf8",
)
const intakeDetailClientSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-client.tsx"),
  "utf8",
)
const intakeDetailAnswersSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-answers.tsx"),
  "utf8",
)
const intakeDetailDraftsSource = readFileSync(
  join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-drafts.tsx"),
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

function findAdminPageFiles(dir = join(process.cwd(), "app/admin")): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) return findAdminPageFiles(fullPath)
    return entry.name === "page.tsx" ? [fullPath] : []
  })
}

describe("admin navigation contract", () => {
  it("keeps settings focused on configuration instead of incident response", () => {
    const encryptionPageSource = readFileSync(
      join(process.cwd(), "app/admin/settings/encryption/page.tsx"),
      "utf8",
    )

    expect(settingsSource).not.toContain('redirect("/admin/features")')
    expect(nextConfigSource).not.toContain('source: "/admin/settings", destination: "/admin/features"')
    expect(settingsSource).toContain("ADMIN_FEATURES_HREF")
    expect(settingsSource).toContain("ADMIN_CERTIFICATE_DETAILS_HREF")
    expect(settingsSource).toContain("STAFF_IDENTITY_HREF")
    expect(settingsSource).toContain("Your prescribing identity")
    expect(settingsSource).toContain("Clinic setup")
    expect(settingsSource).toContain("ADMIN_CLINIC_HREF")
    expect(settingsSource).toContain("ADMIN_DOCTORS_HREF")
    expect(settingsSource).toContain("ADMIN_SERVICES_HREF")
    expect(settingsSource).toContain("Delivery controls live in Email delivery")
    expect(settingsSource).toContain("Recovery work lives in Ops")
    expect(settingsSource).not.toContain("ADMIN_EMAIL_TEMPLATE_EDITOR_HREF")
    expect(settingsSource).not.toContain('href: "/admin/content"')
    expect(settingsSource).not.toContain("Operational controls")
    expect(settingsSource).not.toContain('href: "/admin/webhook-dlq"')
    expect(settingsSource).not.toContain('href: "/admin/audit"')
    expect(settingsSource).not.toContain('href: "/admin/errors"')
    expect(settingsSource).not.toContain('href: "/admin/refunds"')
    expect(settingsSource).not.toContain('href: "/admin/parchment-conformance"')
    expect(settingsSource).not.toContain('href: "/admin/settings/encryption"')
    expect(encryptionPageSource).toContain("Incident-only diagnostic route")
  })

  it("keeps certificate setup truthful for static PDF templates", () => {
    expect(settingsSource).toContain("Certificate details")
    expect(settingsSource).toContain("Clinic details and PDF preview for generated medical certificates.")
    expect(certificateIdentitySource).toContain('title="Certificate details"')
    expect(certificateIdentitySource).toContain("Email templates live in Email delivery.")
    expect(certificateIdentitySource).toContain("ADMIN_CLINIC_HREF")
    expect(certificateIdentitySource).toContain("Edit clinic details")
    expect(certificateIdentitySource).not.toContain("saveClinicIdentityAction")
    expect(certificateIdentitySource).not.toContain("uploadClinicLogoAction")
    expect(certificateIdentitySource).not.toContain("Save changes")
    expect(certificateIdentitySource).not.toContain('TabsTrigger value="template"')
    expect(certificateIdentitySource).not.toContain("Template Layout")
    expect(certificateIdentitySource).not.toContain("Layout Options")
    expect(certificateIdentitySource).not.toContain("Display Options")
    expect(certificateIdentitySource).not.toContain("updateLayoutConfig")
    expect(certificateIdentitySource).not.toContain("updateOptionsConfig")
    expect(certificateIdentitySource).not.toContain("onCheckedChange")
  })

  it("keeps the sidebar focused and avoids duplicate or vendor-specific labels", () => {
    const operatorNavSource = navSourceBlock(
      staffNavigationSource,
      "export const operatorNavSections",
      "export const doctorNavSections",
    )
    const labels = navLabels(operatorNavSource)

    expect(labels.filter((label) => label === "Overview")).toHaveLength(1)
    expect(sidebarSource).not.toContain("emailNavItems")
    expect(sidebarSource).not.toContain("analyticsNavItems")
    expect(sidebarSource).not.toContain("systemNavItems")
    expect(labels).toEqual([
      "Dashboard",
      "Ledger",
      "Review",
      "Scripts",
      "Patients",
      "Overview",
      "Ops",
      "Setup",
    ])
    expect(sidebarSource).toContain("operatorNavSections")
    expect(sidebarSource).toContain("Expand staff navigation")
    expect(sidebarSource).toContain("Collapse staff navigation")
    expect(sidebarSource).toContain("STAFF_SIDEBAR_EXPANDED_STORAGE_KEY")
    expect(sidebarSource).toContain("isStaffNavItemActive")
    expect(sidebarSource).toContain("statusFilteredDashboard")
    expect(sidebarSource).toContain("shouldNoopCurrentNavigation")
    expect(sidebarSource).toContain("event.metaKey")
    expect(sidebarSource).toContain("event.ctrlKey")
    expect(sidebarSource).toContain("current={isStaffNavHrefCurrent")
    expect(sidebarSource).toContain('open ? "translate-x-0" : "-translate-x-full"')
    expect(sidebarSource).toContain('open ? "opacity-100" : "pointer-events-none opacity-0"')
    expect(sidebarSource).toContain('aria-current={active ? "page" : undefined}')
    expect(sidebarSource).not.toContain("clinicalNavItems")
    expect(sidebarSource).not.toContain("Clinical mode")
    expect(operatorNavSource).toContain("STAFF_QUEUE_HREF")
    expect(dashboardRoutesSource).not.toContain("ADMIN_DOCTOR_QUEUE_HREF")
    expect(operatorNavSource).toContain("STAFF_SCRIPTS_HREF")
    expect(operatorNavSource).toContain("STAFF_PATIENTS_HREF")
    expect(operatorNavSource).toContain('badgeKey: "scriptsToWrite"')
    expect(operatorNavSource).toContain('badgeKey: "prescribingIdentityPatients"')
    expect(sidebarSource).toContain("useLiveStaffNavCounts")
    expect(sidebarSource).toContain('from "@/lib/dashboard/use-staff-nav-counts"')
    expect(operatorNavSource).not.toContain('href: "/doctor/dashboard"')
    expect(sidebarSource).not.toContain('href: "/doctor/patients"')
    expect(sidebarSource).not.toContain('href: "/doctor/scripts"')
    expect(sidebarSource).toContain("prefetch={false}")
    expect(adminLayoutSource).toContain("OperatorShell")
    expect(operatorShellSource).toContain("AdminSidebar")
    expect(operatorShellSource).toContain("MobileAdminNav")
  })

  it("keeps the staff dashboard free of a second admin hub above the queue", () => {
    expect(existsSync(join(process.cwd(), "components/admin/admin-hub-zones.tsx"))).toBe(false)
    expect(dashboardRedirectSource).not.toContain("AdminHubZones")
    expect(dashboardRedirectSource).toContain("OwnerOperatorSetupCard")
    expect(dashboardRedirectSource).toContain("StaffReadinessPanel")
    expect(dashboardRedirectSource).toContain("QueueClient")
    expect(dashboardRoutesSource).toContain('ADMIN_PARCHMENT_OPS_HREF = "/admin/ops/parchment"')
    expect(dashboardRoutesSource).toContain('ADMIN_WEBHOOK_DLQ_HREF = "/admin/webhook-dlq"')
    expect(dashboardRoutesSource).not.toContain("ADMIN_EMAIL_HUB_HREF")
    expect(dashboardRoutesSource).toContain('ADMIN_EMAIL_TEMPLATE_EDITOR_HREF = "/admin/emails/templates"')
    expect(dashboardRoutesSource).toContain('ADMIN_CERTIFICATE_DETAILS_HREF = "/admin/settings/templates"')
    expect(dashboardRoutesSource).not.toContain("ADMIN_PATIENTS_HREF")
  })

  it("keeps setup subpages anchored to the setup hub", () => {
    const clinicClient = readFileSync(join(process.cwd(), "app/admin/clinic/clinic-client.tsx"), "utf8")
    const servicesClient = readFileSync(join(process.cwd(), "app/admin/services/services-client.tsx"), "utf8")
    const featuresClient = readFileSync(join(process.cwd(), "app/admin/features/features-client.tsx"), "utf8")

    for (const source of [clinicClient, servicesClient, featuresClient]) {
      expect(source).toContain("STAFF_SETTINGS_HREF")
      expect(source).not.toContain("STAFF_DASHBOARD_HREF")
    }
  })

  it("keeps service catalogue changes governed instead of open-ended CRUD", () => {
    const servicesClient = readFileSync(join(process.cwd(), "app/admin/services/services-client.tsx"), "utf8")
    const servicesTable = readFileSync(join(process.cwd(), "app/admin/services/services-table.tsx"), "utf8")
    const serviceForm = readFileSync(join(process.cwd(), "app/admin/services/service-form-dialog.tsx"), "utf8")
    const adminSettingsActions = readFileSync(join(process.cwd(), "app/actions/admin-settings.ts"), "utf8")
    const servicesData = readFileSync(join(process.cwd(), "lib/data/services.ts"), "utf8")

    expect(servicesClient).not.toContain("createServiceAction")
    expect(servicesClient).not.toContain("deleteServiceAction")
    expect(servicesClient).not.toContain("Add Service")
    expect(servicesTable).not.toContain("Trash2")
    expect(servicesTable).not.toContain("GripVertical")
    expect(servicesTable).not.toContain("onDelete")
    expect(serviceForm).not.toContain("isCreating")
    expect(serviceForm).not.toContain("Create New Service")
    expect(adminSettingsActions).not.toContain("createServiceAction")
    expect(adminSettingsActions).not.toContain("deleteServiceAction")
    expect(adminSettingsActions).not.toContain("updateServiceOrderAction")
    expect(servicesData).not.toContain("createService(")
    expect(servicesData).not.toContain("deleteService(")
    expect(servicesData).not.toContain("updateServiceOrder(")
  })

  it("surfaces patient handoff gaps in admin without returning raw intake answers", () => {
    // Ledger surfaces stale + status state via the cockpit/cases primitives
    // (CaseTable renders StatusDot + the isStale flag on CaseRow). Full
    // handoff copy still lives on the intake detail decision strip, not in
    // the ledger row, so the ledger keeps each line scannable.
    expect(adminIntakesLedgerSource).toContain("isStale")
    expect(adminIntakesLedgerSource).toContain("CaseTable")
    expect(intakesQueriesSource).toContain("buildPatientHandoffSummary")
    expect(intakesQueriesSource).toContain("getPatientSnapshotOptionsForCase")
    expect(intakesQueriesSource).toContain("answers: null")
    expect(intakesQueriesSource).toContain("Do not return raw")
    expect(patientHandoffSource).toContain("Missing doctor handoff fields")
    expect(patientHandoffSource).toContain("Fix before review")
  })

  it("keeps admin operations recovery links inside admin-owned routes", () => {
    const opsClientSource = readFileSync(
      join(process.cwd(), "app/admin/ops/ops-client.tsx"),
      "utf8",
    )
    const opsPageSource = readFileSync(
      join(process.cwd(), "app/admin/ops/page.tsx"),
      "utf8",
    )
    const opsFailuresSource = readFileSync(
      join(process.cwd(), "lib/admin/ops-failures.ts"),
      "utf8",
    )

    expect(opsClientSource).not.toContain('href="/doctor')
    expect(opsClientSource).not.toContain("DOCTOR_QUEUE_REVIEW_HREF")
    expect(opsPageSource).toContain("ADMIN_WEBHOOK_DLQ_HREF")
    expect(opsFailuresSource).toContain("ADMIN_STALE_INTAKES_HREF")
    expect(dashboardRoutesSource).toContain('ADMIN_STALE_INTAKES_HREF = "/admin/ops/intakes-stuck"')
    expect(dashboardRoutesSource).toContain('ADMIN_PATIENT_MERGE_AUDIT_HREF = "/admin/ops/patient-merge-audit"')
  })

  it("keeps admin intake navigation on admin-owned routes", () => {
    const adminRouteSources = [
      adminIntakesLedgerSource,
      opsParchmentSource,
      readFileSync(join(process.cwd(), "app/admin/ops/patient-merge-audit/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "app/admin/patients/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "components/shared/ops/reconciliation-client.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "components/shared/ops/intakes-stuck-client.tsx"), "utf8"),
    ].join("\n")

    expect(adminRouteSources).toContain("buildAdminIntakeHref")
    expect(adminRouteSources).toContain("STAFF_PATIENTS_HREF")
    expect(adminRouteSources).toContain("buildStaffPatientHref")
    // Strip import statements before checking for /doctor/* path strings.
    // Admin pages can legitimately import shared components from app/doctor/
    // (e.g. IntakeRefundDialog is the canonical refund button per CLAUDE.md
    // "Easy refund (2026-05-20)" and lives at app/doctor/intakes/[id]/).
    // The intent of this assertion is to block admin pages from NAVIGATING
    // users to /doctor/* routes, not from importing shared components.
    const adminRouteSourcesNonImport = adminRouteSources
      .split("\n")
      .filter((line) => !/^\s*import\b/.test(line))
      .join("\n")
    expect(adminRouteSourcesNonImport).not.toContain("/doctor/intakes")
    expect(adminRouteSourcesNonImport).not.toContain("/doctor/patients")
    const adminIntakeDetailSource = readFileSync(join(process.cwd(), "app/admin/intakes/[id]/page.tsx"), "utf8")

    expect(adminIntakeDetailSource).not.toContain("DoctorIntakeDetailPage")
    expect(adminIntakeDetailSource).toContain("IntakeDetailClient")
    expect(adminIntakeDetailSource).toContain("PanelProvider")
    expect(adminIntakeDetailSource).toContain("compact")
    expect(adminIntakeDetailSource).toContain("Back to work")
    expect(adminIntakeDetailSource).toContain("Copy summary")
    expect(adminIntakeDetailSource).toContain("Operator request summary")
    expect(adminIntakeDetailSource).not.toContain("Switch to doctor mode")
    expect(adminIntakeDetailSource).not.toContain("Open doctor workflow")
    expect(adminIntakeDetailSource).toContain('requireRole(["admin"]')
    // Phase 4 of dashboard remaster (2026-05-12): /admin/patients/[id] now
    // redirects at the Next config layer. The duplicate 471-line admin patient
    // detail page (4-stat tile row + 3-card layout) was retired.
    expect(nextConfigSource).toContain('source: "/admin/patients/:id"')
    expect(nextConfigSource).toContain('destination: "/doctor/patients/:id"')
    expect(nextConfigSource).not.toContain("Switch to doctor file")
    expect(nextConfigSource).not.toContain("Switch to doctor mode")
    expect(nextConfigSource).not.toContain("Continue as doctor")
    expect(nextConfigSource).not.toContain("Prescribe as doctor")
    expect(existsSync(join(process.cwd(), "app/admin/admin-dashboard-client.tsx"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/admin/intakes/intakes-ledger-client.tsx"))).toBe(true)
  })

  it("keeps compact intake review as a three-lane decision cockpit", () => {
    expect(intakeDetailClientSource).toContain('section="patient"')
    expect(intakeDetailClientSource).toContain('section="request"')
    expect(intakeDetailClientSource).toContain('section="history"')
    expect(intakeDetailClientSource).toContain("xl:grid-cols-[minmax(270px,0.72fr)_minmax(0,1.14fr)_minmax(320px,0.84fr)]")
    expect(intakeDetailAnswersSource).toContain("Patient details")
    expect(intakeDetailAnswersSource).toContain("Request summary")
    expect(intakeDetailDraftsSource).toContain("AI drafts")
    expect(intakeDetailDraftsSource).toContain("Repeat prescription checklist")
  })

  it("keeps nested admin ops pages admin-only", () => {
    const nestedOpsSources = [
      readFileSync(join(process.cwd(), "app/admin/ops/reconciliation/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "app/admin/ops/intakes-stuck/page.tsx"), "utf8"),
    ].join("\n")

    expect(nestedOpsSources).toContain('requireRole(["admin"]')
    expect(nestedOpsSources).not.toContain('requireRole(["doctor", "admin"]')
  })

  it("lets failed admin role checks use the central role-aware redirects", () => {
    const adminPageSources = [
      "app/admin/audit/page.tsx",
      "app/admin/emails/suppression/page.tsx",
      "app/admin/features/page.tsx",
      "app/admin/finance/page.tsx",
      "app/admin/refunds/page.tsx",
      "app/admin/settings/page.tsx",
      "app/admin/settings/encryption/page.tsx",
      "app/admin/webhook-dlq/page.tsx",
    ].map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n")

    expect(adminPageSources).not.toContain('redirectTo: "/doctor/dashboard"')
    expect(adminPageSources).not.toContain('redirectTo: "/admin"')
    expect(adminLayoutSource).not.toContain('redirectTo: "/"')
    expect(nextConfigSource).toContain('source: "/admin"')
    expect(nextConfigSource).toContain('destination: "/dashboard"')
    expect(findAdminPageFiles()).not.toContain(join(process.cwd(), "app/admin/page.tsx"))
  })

  it("routes the generic dashboard entrypoint to the canonical /dashboard surface", () => {
    // Phase 2 of dashboard remaster (2026-05-12) made /dashboard the real
    // staff dashboard (no longer a role-aware redirect stub). The redirects
    // moved up to /admin and the legacy doctor URLs which 307 here.
    expect(dashboardRedirectSource).toContain("StaffDashboardPage")
    expect(dashboardRedirectSource).toContain('requireRole(["admin", "doctor", "support"]')
    expect(dashboardRedirectSource).toContain("hasAdminAccess")
    expect(dashboardRedirectSource).toContain("hasSupportAccess")
    expect(dashboardRedirectSource).toContain("SystemHealthPill")
    expect(dashboardRedirectSource).toContain("QueueClient")
    // Legacy URLs forward to /dashboard.
    expect(nextConfigSource).toContain('source: "/admin"')
    expect(nextConfigSource).toContain('destination: "/dashboard"')
    expect(nextConfigSource).toContain('source: "/doctor/dashboard", destination: "/dashboard"')
  })

  it("keeps admin data pages explicitly admin-gated at page level", () => {
    const supportShellPages = new Set([
      // Phase 7: bounded support ops pages deliberately allow support through
      // the admin shell while keeping PHI-heavy admin data pages locked.
      join(process.cwd(), "app/admin/ops/page.tsx"),
      join(process.cwd(), "app/admin/ops/parchment/page.tsx"),
      join(process.cwd(), "app/admin/ops/prescribing-identity/page.tsx"),
      join(process.cwd(), "app/admin/webhook-dlq/page.tsx"),
      // Phase 8 (2026-05-20): the intake ledger opens to support so they can
      // see refund state + drill into a case to issue a refund. The page
      // shows ledger metadata only — clinical answers, Medicare details, and
      // structured address fields are never returned by `getAllIntakesForAdmin`.
      join(process.cwd(), "app/admin/intakes/page.tsx"),
    ])

    // 2026-05-21: /admin/patients opens to doctors with the same scoping
    // /doctor/patients applies (doctorId param → only patients they've
    // touched). Admins see everything. Both roles use the same client.
    const doctorAdminSharedPages = new Set([
      join(process.cwd(), "app/admin/patients/page.tsx"),
    ])

    for (const pageFile of findAdminPageFiles()) {
      if (supportShellPages.has(pageFile)) {
        const source = readFileSync(pageFile, "utf8")
        // Pages in the support shell must explicitly include support in the
        // role gate (not just allow it implicitly).
        expect(source, pageFile).toContain('requireRole(["admin", "support"]')
        expect(source, pageFile).not.toContain('requireRole(["doctor", "admin"]')
        continue
      }

      if (doctorAdminSharedPages.has(pageFile)) {
        const source = readFileSync(pageFile, "utf8")
        expect(source, pageFile).toContain('requireRole(["admin", "doctor"]')
        expect(source, pageFile).toContain("hasAdminAccess")
        continue
      }

      const source = readFileSync(pageFile, "utf8")
      expect(source, pageFile).toContain('requireRole(["admin"]')
      expect(source, pageFile).not.toContain('requireRole(["doctor", "admin"]')
    }
  })

  it("maps every active admin page to a lean operator workflow", () => {
    const adminWorkflowPages = {
      cockpit: [
        "app/admin/intakes/[id]/page.tsx",
        "app/admin/intakes/page.tsx",
        "app/admin/patients/page.tsx",
      ],
      ops: [
        "app/admin/audit/page.tsx",
        "app/admin/ops/intakes-stuck/page.tsx",
        "app/admin/ops/page.tsx",
        "app/admin/ops/parchment/page.tsx",
        "app/admin/ops/patient-merge-audit/page.tsx",
        "app/admin/ops/prescribing-identity/page.tsx",
        "app/admin/ops/reconciliation/page.tsx",
        "app/admin/webhook-dlq/page.tsx",
      ],
      money: [
        "app/admin/finance/page.tsx",
        "app/admin/refunds/page.tsx",
      ],
      emailDelivery: [
        "app/admin/emails/hub/page.tsx",
        "app/admin/emails/suppression/page.tsx",
        "app/admin/emails/templates/page.tsx",
      ],
      setup: [
        "app/admin/clinic/page.tsx",
        "app/admin/doctors/page.tsx",
        "app/admin/features/page.tsx",
        "app/admin/services/page.tsx",
        "app/admin/settings/page.tsx",
        "app/admin/settings/templates/page.tsx",
      ],
      analytics: [
        "app/admin/analytics/page.tsx",
      ],
      incidentOnly: [
        "app/admin/settings/encryption/page.tsx",
      ],
    }
    const adminPages = findAdminPageFiles()
      .map((file) => file.replace(process.cwd() + "/", ""))
      .sort()
    const mappedPages = Object.values(adminWorkflowPages).flat().sort()

    expect(adminPages).toEqual(mappedPages)
    expect(adminWorkflowPages.ops).toContain("app/admin/audit/page.tsx")
    expect(adminWorkflowPages.incidentOnly).toEqual(["app/admin/settings/encryption/page.tsx"])
  })

  it("keeps analytics as a compact operator summary instead of a chart workspace", () => {
    expect(analyticsClientSource).toContain("Revenue")
    expect(analyticsClientSource).toContain("Where patients came from")
    expect(analyticsClientSource).toContain("Conversion")
    expect(analyticsClientSource).toContain("Queue health")
    expect(analyticsClientSource).toContain("at a glance")
    expect(analyticsClientSource).not.toContain("Visits")
    expect(analyticsClientSource).not.toContain("Paid intakes")
    expect(analyticsClientSource).not.toContain("Approval rate")
    expect(analyticsClientSource).not.toContain("Scripts pending")
    expect(analyticsClientSource).not.toContain("useSearchParams")
    expect(analyticsClientSource).not.toContain("LazyAreaChart")
    expect(analyticsClientSource).not.toContain("LazyBarChart")
    expect(analyticsClientSource).not.toContain("ResponsiveContainer")
    expect(analyticsPageSource).not.toContain("dailyData")
    expect(analyticsPageSource).not.toContain("getDoctorDashboardStats")
    expect(financeClientSource).toContain("href={STAFF_ANALYTICS_HREF}")
    expect(financeClientSource).not.toContain("ADMIN_ANALYTICS_HREF")
    expect(financeClientSource).not.toContain("?tab=revenue")
  })

  it("keeps payment pressure labels explicit about checkout recovery", () => {
    const paymentPressureBlock = navSourceBlock(
      financeClientSource,
      "Payment pressure",
      "Service mix",
    )

    expect(paymentPressureBlock).toContain('label="Failed checkout"')
    expect(paymentPressureBlock).toContain("Failed checkout</Link>")
    expect(paymentPressureBlock).not.toContain('label="Failed"')
  })

  it("keeps audit history as an ops-owned evidence surface, not a dashboard mode", () => {
    expect(auditClientSource).toContain("OperatorPageHeader")
    expect(auditClientSource).toContain("title=\"Audit history\"")
    expect(auditClientSource).toContain("backHref={STAFF_OPS_HREF}")
    expect(auditClientSource).toContain("Compliance history")
    expect(auditClientSource).not.toContain("Audit summary")
    expect(readFileSync(join(process.cwd(), "app/admin/audit/page.tsx"), "utf8")).not.toContain("getAuditLogStatsAction")
    expect(readFileSync(join(process.cwd(), "app/actions/admin-config.ts"), "utf8")).not.toContain("getAuditLogStatsAction")
    expect(auditClientSource).not.toContain("STAFF_DASHBOARD_HREF")
    expect(auditClientSource).not.toContain("Audit Log")
    expect(auditClientSource).not.toContain("Total Events")
  })

  it("keeps doctor identity as one shared staff page with an admin compatibility redirect", () => {
    expect(dashboardRoutesSource).not.toContain("ADMIN_DOCTOR_IDENTITY_HREF")
    expect(nextConfigSource).toContain('source: "/admin/settings/doctor-identity"')
    expect(nextConfigSource).toContain('destination: "/doctor/settings/identity"')
    expect(existsSync(join(process.cwd(), "app/admin/settings/doctor-identity/page.tsx"))).toBe(false)
  })

  it("keeps future doctor setup as an admin checklist without leaking admin controls", () => {
    const doctorsClientSource = readFileSync(
      join(process.cwd(), "app/admin/doctors/doctors-client.tsx"),
      "utf8",
    )

    expect(doctorsClientSource).toContain("Doctor onboarding checklist")
    expect(doctorsClientSource).toContain("No admin controls")
    expect(doctorsClientSource).toContain("AHPRA")
    expect(doctorsClientSource).toContain("Provider number")
    expect(doctorsClientSource).toContain("Signature")
    expect(doctorsClientSource).toContain("Parchment")
    expect(doctorsClientSource).toContain("MFA")
  })

  it("routes vendor and money recovery links through their owning dashboards", () => {
    expect(opsParchmentSource).not.toContain('href="/admin/parchment-conformance"')
    expect(nextConfigSource).toContain('source: "/admin/parchment-conformance"')
    expect(nextConfigSource).toContain('destination: "/admin/ops/parchment"')
    expect(nextConfigSource).toContain('source: "/admin/content"')
    expect(nextConfigSource).toContain('destination: "/admin/settings"')
    expect(nextConfigSource).toContain('source: "/admin/errors"')
    expect(nextConfigSource).toContain('destination: "/admin/ops"')
    expect(nextConfigSource).toContain('source: "/admin/emails/analytics"')
    expect(nextConfigSource).toContain('destination: "/admin/emails/hub"')
    expect(nextConfigSource).toContain('source: "/admin/emails/preview"')
    expect(nextConfigSource).toContain('destination: "/admin/emails/templates"')
    expect(nextConfigSource).toContain('source: "/admin/emails/outbox"')
    expect(nextConfigSource).toContain('destination: "/admin/emails/hub?tab=queue"')
    expect(nextConfigSource).toContain('source: "/admin/finance/revenue"')
    expect(nextConfigSource).toContain('destination: "/admin/finance"')
    expect(nextConfigSource).toContain('source: "/admin/doctors/performance"')
    expect(nextConfigSource).toContain('source: "/admin/business-kpi"')
    expect(nextConfigSource).toContain('destination: "/admin/analytics"')
    expect(nextConfigSource).toContain('destination: "/admin/doctors"')
    expect(opsParchmentSource).toContain("Production prescribing gate")
    expect(opsParchmentSource).toContain("getParchmentProductionReadiness")
    expect(opsParchmentSource).toContain("function isUuid")
    expect(opsParchmentSource).toContain("PatientLink patientProfileId={event.patientProfileId}")
    expect(opsParchmentSource).toContain("PatientLink patientProfileId={failure.patientProfileId}")
    expect(financeClientSource).toContain("ADMIN_REFUNDS_HREF")
  })

  it("keeps payment webhook recovery copy separate from Parchment recovery copy", () => {
    const opsClientSource = readFileSync(
      join(process.cwd(), "app/admin/ops/ops-client.tsx"),
      "utf8",
    )

    expect(opsClientSource).toContain("Payment failures")
    expect(opsClientSource).not.toContain("Payment DLQ")
    expect(opsClientSource).not.toContain("Recent payment DLQ events")
    expect(opsClientSource).not.toContain("Stripe Webhooks")
    expect(opsClientSource).not.toContain("Stripe DLQ")
    expect(opsClientSource).not.toContain("animate-pulse")
  })

  it("keeps pruned admin pages out of the active route tree", () => {
    const adminPages = findAdminPageFiles().map((file) => file.replace(process.cwd() + "/", ""))

    expect(adminPages).not.toContain("app/admin/email-test/page.tsx")
    expect(adminPages).not.toContain("app/admin/compliance/page.tsx")
    expect(adminPages).not.toContain("app/admin/parchment-conformance/page.tsx")
    expect(adminPages).not.toContain("app/admin/content/page.tsx")
    expect(adminPages).not.toContain("app/admin/errors/page.tsx")
    expect(adminPages).not.toContain("app/admin/emails/analytics/page.tsx")
    expect(adminPages).not.toContain("app/admin/emails/preview/page.tsx")
    expect(adminPages).not.toContain("app/admin/emails/page.tsx")
    expect(adminPages).not.toContain("app/admin/doctors/performance/page.tsx")
    expect(adminPages).not.toContain("app/admin/finance/revenue/page.tsx")
    expect(nextConfigSource).toContain('source: "/admin/compliance"')
    expect(nextConfigSource).toContain('destination: "/admin/audit"')
    expect(nextConfigSource).toContain('source: "/admin/email-test"')
    expect(nextConfigSource).toContain('destination: "/admin/emails/hub"')
    expect(nextConfigSource).toContain('source: "/admin/emails"')
    expect(nextConfigSource).toContain('source: "/admin/ops/doctors"')
    expect(nextConfigSource).toContain('destination: "/admin/doctors"')
    expect(nextConfigSource).toContain('source: "/admin/ops/sla"')
    expect(nextConfigSource).toContain('destination: "/admin/analytics"')
  })
})
