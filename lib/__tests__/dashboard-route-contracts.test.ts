import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ADMIN_AUDIT_HREF,
  ADMIN_CERTIFICATE_TEMPLATES_HREF,
  ADMIN_CLINIC_HREF,
  ADMIN_DASHBOARD_HREF,
  ADMIN_DOCTOR_QUEUE_HREF,
  ADMIN_DOCTORS_HREF,
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_EMAIL_TEMPLATE_EDITOR_HREF,
  ADMIN_FEATURES_HREF,
  ADMIN_INTAKE_LEDGER_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  ADMIN_PATIENTS_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_RECONCILIATION_HREF,
  ADMIN_SCRIPTS_HREF,
  ADMIN_SERVICES_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_TEMPLATE_STUDIO_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildAdminAuditHref,
  buildAdminEmailHubHref,
  buildAdminIntakeHref,
  buildAdminIntakeLedgerHref,
  buildDoctorDashboardHref,
  buildDoctorDocumentBuilderHref,
  buildDoctorIntakeHref,
  buildDoctorQueueRedirectHref,
  buildStaffEmailHubHref,
  buildStaffPatientHref,
  DOCTOR_DASHBOARD_HREF,
  parseQueueStatusFilter,
  PATIENT_DASHBOARD_HREF,
  STAFF_DOCTOR_PATIENTS_HREF,
  STAFF_DOCTOR_SCRIPTS_HREF,
  STAFF_DOCTOR_SETTINGS_HREF,
  STAFF_IDENTITY_HREF,
  STAFF_QUEUE_HREF,
  STAFF_SCRIPTS_HREF,
} from "@/lib/dashboard/routes"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("dashboard route contracts", () => {
  it("uses /patient as the canonical patient dashboard", () => {
    expect(PATIENT_DASHBOARD_HREF).toBe("/patient")
  })

  it("uses the staff dashboard for doctor queue deep links", () => {
    expect(DOCTOR_DASHBOARD_HREF).toBe("/dashboard")
    expect(STAFF_QUEUE_HREF).toBe("/dashboard?status=review#doctor-queue")
    expect(buildDoctorDashboardHref({ status: "review" })).toBe("/dashboard?status=review")
    expect(buildDoctorDashboardHref({ status: "all" })).toBe("/dashboard")
  })

  it("builds admin intake detail links from the shared route helper", () => {
    expect(ADMIN_DASHBOARD_HREF).toBe("/dashboard")
    expect(ADMIN_INTAKE_LEDGER_HREF).toBe("/admin/intakes")
    expect(buildAdminIntakeLedgerHref()).toBe("/admin/intakes")
    expect(buildAdminIntakeLedgerHref({ status: "approved" })).toBe("/admin/intakes?status=approved")
    expect(ADMIN_DOCTOR_QUEUE_HREF).toBe("/dashboard?status=review#doctor-queue")
    expect(ADMIN_SCRIPTS_HREF).toBe(STAFF_SCRIPTS_HREF)
    expect(ADMIN_PATIENTS_HREF).toBe("/admin/patients")
    expect(buildAdminIntakeHref("intake-123")).toBe("/admin/intakes/intake-123")
    expect(buildAdminIntakeHref("intake 123")).toBe("/admin/intakes/intake%20123")
    expect(buildStaffPatientHref("patient 123")).toBe("/doctor/patients/patient%20123")
  })

  it("keeps ops recovery links on shared admin route constants", () => {
    expect(ADMIN_AUDIT_HREF).toBe("/admin/audit")
    expect(ADMIN_CLINIC_HREF).toBe("/admin/clinic")
    expect(ADMIN_DOCTORS_HREF).toBe("/admin/doctors")
    expect(ADMIN_SERVICES_HREF).toBe("/admin/services")
    expect(ADMIN_FEATURES_HREF).toBe("/admin/features")
    expect(ADMIN_CERTIFICATE_TEMPLATES_HREF).toBe("/admin/settings/templates")
    expect(ADMIN_TEMPLATE_STUDIO_HREF).toBe("/admin/settings/templates")
    expect(ADMIN_EMAIL_HUB_HREF).toBe("/admin/emails/hub")
    expect(ADMIN_EMAIL_TEMPLATE_EDITOR_HREF).toBe("/admin/emails/templates")
    expect(buildAdminEmailHubHref()).toBe("/admin/emails/hub")
    expect(buildAdminEmailHubHref({ tab: "queue", intakeId: "intake 123" })).toBe(
      "/admin/emails/hub?tab=queue&intake_id=intake+123",
    )
    expect(buildStaffEmailHubHref({ tab: "queue", intakeId: "intake 123" })).toBe(
      "/admin/emails/hub?tab=queue&intake_id=intake+123",
    )
    expect(buildAdminAuditHref({ search: "merge 123" })).toBe("/admin/audit?search=merge+123")
    expect(buildDoctorIntakeHref("intake 123")).toBe("/doctor/intakes/intake%20123")
    expect(buildDoctorDocumentBuilderHref("intake 123")).toBe("/doctor/intakes/intake%20123/document")
    expect(ADMIN_WEBHOOK_DLQ_HREF).toBe("/admin/webhook-dlq")
    expect(ADMIN_PARCHMENT_OPS_HREF).toBe("/admin/ops/parchment")
    expect(ADMIN_STALE_INTAKES_HREF).toBe("/admin/ops/intakes-stuck")
    expect(ADMIN_RECONCILIATION_HREF).toBe("/admin/ops/reconciliation")
    expect(ADMIN_PATIENT_MERGE_AUDIT_HREF).toBe("/admin/ops/patient-merge-audit")
    expect(ADMIN_PRESCRIBING_IDENTITY_HREF).toBe("/admin/ops/prescribing-identity")
    expect(STAFF_DOCTOR_PATIENTS_HREF).toBe("/doctor/patients")
    expect(STAFF_DOCTOR_SCRIPTS_HREF).toBe("/doctor/scripts")
    expect(STAFF_DOCTOR_SETTINGS_HREF).toBe("/doctor/settings")
    expect(STAFF_IDENTITY_HREF).toBe("/doctor/settings/identity")
  })

  it("preserves queue redirect intent and allowed pagination params", () => {
    // Phase 2 of dashboard remaster + dashboard-audit follow-up (2026-05-12):
    // `/doctor/queue` now redirects straight to `/dashboard` instead of the
    // legacy `/doctor/dashboard` alias (which 307s to the same target).
    // Avoids a redirect chain on every queue bookmark.
    expect(buildDoctorQueueRedirectHref({ status: "review", page: "2", pageSize: "25" })).toBe(
      "/dashboard?status=review&page=2&pageSize=25",
    )
    expect(buildDoctorQueueRedirectHref({ status: "bad", page: "0", pageSize: "999", noise: "x" })).toBe(
      "/dashboard",
    )
  })

  it("parses queue status filters defensively", () => {
    expect(parseQueueStatusFilter("review")).toBe("review")
    expect(parseQueueStatusFilter("pending_info")).toBe("pending_info")
    expect(parseQueueStatusFilter(["scripts", "review"])).toBe("scripts")
    expect(parseQueueStatusFilter("declined")).toBe("all")
    expect(parseQueueStatusFilter(undefined)).toBe("all")
  })

  it("keeps the staff dashboard shell tolerant of optional data gaps", () => {
    const dashboardSource = read("app/dashboard/page.tsx")
    const sidebarSource = read("components/admin/admin-sidebar.tsx")
    const authHelperSource = read("lib/auth/helpers.ts")

    expect(dashboardSource).toContain("results[5].value?.available !== false")
    expect(dashboardSource).not.toContain("getDoctorDashboardStats")
    expect(dashboardSource).not.toContain("getConversionSnapshot")
    expect(sidebarSource).toContain("STAFF_NAV_ICONS[item.icon] ?? STAFF_NAV_ICONS.dashboard")
    expect(authHelperSource).toContain("Skipping unreadable optional staff PHI field during auth hydration")
  })

  it("keeps retired admin compliance aliases on the audit route", () => {
    const nextConfigSource = read("next.config.mjs")

    expect(nextConfigSource).toContain('source: "/admin/compliance"')
    expect(nextConfigSource).toContain('destination: "/admin/audit"')
    expect(nextConfigSource).toContain('source: "/admin"')
    expect(nextConfigSource).toContain('destination: "/dashboard"')
  })
})
