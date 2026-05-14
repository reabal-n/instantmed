import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ADMIN_AUDIT_HREF,
  ADMIN_CERTIFICATE_TEMPLATES_HREF,
  ADMIN_CLINIC_HREF,
  ADMIN_DOCTORS_HREF,
  ADMIN_EMAIL_TEMPLATE_EDITOR_HREF,
  ADMIN_FEATURES_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_RECONCILIATION_HREF,
  ADMIN_SERVICES_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildAdminAuditHref,
  buildAdminIntakeHref,
  buildDoctorDocumentBuilderHref,
  buildDoctorIntakeHref,
  buildDoctorQueueRedirectHref,
  buildPatientFollowupHref,
  buildPatientIntakeHref,
  buildPatientIntakeSuccessHref,
  buildPatientMessagesHref,
  buildPatientSettingsHref,
  buildRequestServiceHref,
  buildStaffEmailHubHref,
  buildStaffLedgerHref,
  buildStaffPatientHref,
  parseQueueStatusFilter,
  PATIENT_DASHBOARD_HREF,
  PATIENT_DOCUMENTS_HREF,
  PATIENT_FOLLOWUPS_HREF,
  PATIENT_HEALTH_PROFILE_HREF,
  PATIENT_INTAKE_SUCCESS_HREF,
  PATIENT_INTAKES_HREF,
  PATIENT_MESSAGES_HREF,
  PATIENT_ONBOARDING_HREF,
  PATIENT_PRESCRIPTIONS_HREF,
  PATIENT_SETTINGS_HREF,
  REQUEST_CONSULT_HREF,
  REQUEST_HREF,
  REQUEST_MED_CERT_HREF,
  REQUEST_REPEAT_SCRIPT_HREF,
  STAFF_DOCTOR_PATIENTS_HREF,
  STAFF_DOCTOR_SCRIPTS_HREF,
  STAFF_DOCTOR_SETTINGS_HREF,
  STAFF_IDENTITY_HREF,
  STAFF_LEDGER_HREF,
  STAFF_PATIENTS_HREF,
  STAFF_QUEUE_HREF,
} from "@/lib/dashboard/routes"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

function collectSourceFiles(path: string): string[] {
  const fullPath = join(root, path)
  const stat = statSync(fullPath)
  if (stat.isFile()) return /\.(ts|tsx)$/.test(path) ? [path] : []

  return readdirSync(fullPath).flatMap((entry) => {
    const next = `${path}/${entry}`
    const nextStat = statSync(join(root, next))
    if (nextStat.isDirectory()) return collectSourceFiles(next)
    return /\.(ts|tsx)$/.test(entry) ? [next] : []
  })
}

describe("dashboard route contracts", () => {
  it("uses /patient as the canonical patient dashboard", () => {
    expect(PATIENT_DASHBOARD_HREF).toBe("/patient")
  })

  it("builds patient navigation links from the shared route helper", () => {
    expect(REQUEST_HREF).toBe("/request")
    expect(REQUEST_REPEAT_SCRIPT_HREF).toBe("/request?service=repeat-script")
    expect(REQUEST_MED_CERT_HREF).toBe("/request?service=med-cert")
    expect(REQUEST_CONSULT_HREF).toBe("/request?service=consult")
    expect(buildRequestServiceHref({ service: "consult", subtype: "hair_loss" })).toBe(
      "/request?service=consult&subtype=hair_loss",
    )
    expect(PATIENT_INTAKES_HREF).toBe("/patient/intakes")
    expect(PATIENT_INTAKE_SUCCESS_HREF).toBe("/patient/intakes/success")
    expect(PATIENT_PRESCRIPTIONS_HREF).toBe("/patient/prescriptions")
    expect(PATIENT_DOCUMENTS_HREF).toBe("/patient/documents")
    expect(PATIENT_MESSAGES_HREF).toBe("/patient/messages")
    expect(PATIENT_FOLLOWUPS_HREF).toBe("/patient/followups")
    expect(PATIENT_SETTINGS_HREF).toBe("/patient/settings")
    expect(PATIENT_HEALTH_PROFILE_HREF).toBe("/patient/health-profile")
    expect(PATIENT_ONBOARDING_HREF).toBe("/patient/onboarding")
    expect(buildPatientIntakeHref("intake 123")).toBe("/patient/intakes/intake%20123")
    expect(buildPatientIntakeSuccessHref({ intakeId: "intake 123", paymentRetry: true })).toBe(
      "/patient/intakes/success?intake_id=intake+123&payment_retry=1",
    )
    expect(buildPatientMessagesHref({ intakeId: "intake 123" })).toBe("/patient/messages?intakeId=intake+123")
    expect(buildPatientFollowupHref("followup 123")).toBe("/patient/followups/followup%20123")
    expect(buildPatientSettingsHref({ tab: "preferences", anchor: "account-security" })).toBe(
      "/patient/settings?tab=preferences#account-security",
    )
  })

  it("uses the staff dashboard for doctor queue deep links", () => {
    expect(STAFF_QUEUE_HREF).toBe("/dashboard?status=review#doctor-queue")
  })

  it("builds admin intake detail links from the shared route helper", () => {
    expect(STAFF_LEDGER_HREF).toBe("/admin/intakes")
    expect(buildStaffLedgerHref()).toBe("/admin/intakes")
    expect(buildStaffLedgerHref({ status: "approved" })).toBe("/admin/intakes?status=approved")
    expect(STAFF_PATIENTS_HREF).toBe("/admin/patients")
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
    expect(ADMIN_EMAIL_TEMPLATE_EDITOR_HREF).toBe("/admin/emails/templates")
    expect(buildStaffEmailHubHref()).toBe("/admin/emails/hub")
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
    const intakeIndexSource = read("lib/data/intakes/index.ts")
    const intakeQueriesSource = read("lib/data/intakes/queries.ts")
    const sidebarSource = read("components/admin/admin-sidebar.tsx")
    const authHelperSource = read("lib/auth/helpers.ts")

    expect(dashboardSource).toContain("results[5].value?.available !== false")
    expect(dashboardSource).not.toContain("getDoctorDashboardStats")
    expect(intakeIndexSource).not.toContain("getDoctorDashboardStats")
    expect(intakeIndexSource).not.toContain("getAllIntakesByStatus")
    expect(intakeIndexSource).not.toContain("getPatientIntakeStats")
    expect(intakeIndexSource).not.toContain("getIntakeDocuments")
    expect(intakeIndexSource).not.toContain("markIntakeRefunded")
    expect(intakeIndexSource).not.toContain("createPatientNote")
    expect(intakeIndexSource).not.toContain("triggerStatusEmail")
    expect(intakeIndexSource).not.toContain("getDoctorPersonalStats")
    expect(intakeIndexSource).not.toContain("getSlaBreachIntakes")
    expect(intakeQueriesSource).not.toContain("doctor-dashboard")
    expect(dashboardSource).not.toContain("getConversionSnapshot")
    expect(sidebarSource).toContain("STAFF_NAV_ICONS[item.icon] ?? STAFF_NAV_ICONS.dashboard")
    expect(authHelperSource).toContain("Skipping unreadable optional staff PHI field during auth hydration")
  })

  it("keeps staff and patient revalidation paths on route helpers", () => {
    const source = read("lib/dashboard/revalidate-staff.ts")

    expect(source).toContain("buildAdminIntakeHref")
    expect(source).toContain("buildDoctorIntakeHref")
    expect(source).toContain("buildStaffPatientHref")
    expect(source).toContain("buildPatientIntakeHref")
    expect(source).toContain("buildPatientFollowupHref")
    expect(source).not.toContain("revalidatePath(`/admin/intakes/${id}`)")
    expect(source).not.toContain("revalidatePath(`/doctor/intakes/${id}`)")
    expect(source).not.toContain("revalidatePath(`/admin/patients/${id}`)")
    expect(source).not.toContain("revalidatePath(`/doctor/patients/${id}`)")
    expect(source).not.toContain('revalidatePath("/patient")')
    expect(source).not.toContain("revalidatePath(`/patient/intakes/${options.intakeId}`)")
    expect(source).not.toContain("revalidatePath(`/patient/followups/${options.followupId}`)")
  })

  it("keeps patient and staff UI navigation on route helpers", () => {
    const guardedFiles = [
      ...collectSourceFiles("app/patient"),
      ...collectSourceFiles("components/patient"),
      ...collectSourceFiles("lib/patient"),
      ...collectSourceFiles("app/admin"),
      ...collectSourceFiles("app/doctor"),
      ...collectSourceFiles("components/admin"),
      ...collectSourceFiles("components/doctor"),
      ...collectSourceFiles("components/operator"),
      "lib/dashboard/revalidate-staff.ts",
    ]

    const rawNavigationPattern =
      /(href=\{?["`]\/(?:patient|admin|doctor|dashboard|request)|router\.(?:push|replace)\(["`]\/(?:patient|admin|doctor|dashboard|request)|redirect\(["`]\/(?:patient|admin|doctor|dashboard|request)|revalidatePath\(["`]\/(?:patient|admin|doctor|dashboard|request))/

    const offenders = guardedFiles.flatMap((file) => {
      const source = read(file)
      return source
        .split("\n")
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => rawNavigationPattern.test(line))
        .map(({ line, lineNumber }) => `${file}:${lineNumber}: ${line.trim()}`)
    })

    expect(offenders).toEqual([])
  })

  it("keeps retired admin compliance aliases on the audit route", () => {
    const nextConfigSource = read("next.config.mjs")

    expect(nextConfigSource).toContain('source: "/admin/compliance"')
    expect(nextConfigSource).toContain('destination: "/admin/audit"')
    expect(nextConfigSource).toContain('source: "/admin"')
    expect(nextConfigSource).toContain('destination: "/dashboard"')
  })
})
