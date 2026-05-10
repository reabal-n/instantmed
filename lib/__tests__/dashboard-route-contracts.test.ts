import { describe, expect, it } from "vitest"

import {
  ADMIN_AUDIT_HREF,
  ADMIN_DASHBOARD_HREF,
  ADMIN_DOCTOR_QUEUE_HREF,
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_INTAKE_LEDGER_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  ADMIN_PATIENTS_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_SCRIPTS_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildAdminDashboardHref,
  buildAdminIntakeHref,
  buildDoctorDashboardHref,
  buildDoctorQueueRedirectHref,
  DOCTOR_DASHBOARD_HREF,
  DOCTOR_QUEUE_REVIEW_HREF,
  parseQueueStatusFilter,
  PATIENT_DASHBOARD_HREF,
} from "@/lib/dashboard/routes"

describe("dashboard route contracts", () => {
  it("uses /patient as the canonical patient dashboard", () => {
    expect(PATIENT_DASHBOARD_HREF).toBe("/patient")
  })

  it("uses doctor dashboard status params for queue deep links", () => {
    expect(DOCTOR_DASHBOARD_HREF).toBe("/doctor/dashboard")
    expect(DOCTOR_QUEUE_REVIEW_HREF).toBe("/doctor/dashboard?status=review")
    expect(buildDoctorDashboardHref({ status: "review" })).toBe("/doctor/dashboard?status=review")
    expect(buildDoctorDashboardHref({ status: "all" })).toBe("/doctor/dashboard")
  })

  it("builds admin intake detail links from the shared route helper", () => {
    expect(ADMIN_DASHBOARD_HREF).toBe("/admin")
    expect(ADMIN_INTAKE_LEDGER_HREF).toBe("/admin/intakes")
    expect(ADMIN_DOCTOR_QUEUE_HREF).toBe("/admin?status=review#doctor-queue")
    expect(ADMIN_SCRIPTS_HREF).toBe("/admin?status=scripts#doctor-queue")
    expect(ADMIN_PATIENTS_HREF).toBe("/admin/patients")
    expect(buildAdminDashboardHref({ status: "scripts", anchor: "doctor-queue" })).toBe(
      "/admin?status=scripts#doctor-queue",
    )
    expect(buildAdminIntakeHref("intake-123")).toBe("/admin/intakes/intake-123")
    expect(buildAdminIntakeHref("intake 123")).toBe("/admin/intakes/intake%20123")
  })

  it("keeps ops recovery links on shared admin route constants", () => {
    expect(ADMIN_AUDIT_HREF).toBe("/admin/audit")
    expect(ADMIN_EMAIL_HUB_HREF).toBe("/admin/emails/hub")
    expect(ADMIN_WEBHOOK_DLQ_HREF).toBe("/admin/webhook-dlq")
    expect(ADMIN_PARCHMENT_OPS_HREF).toBe("/admin/ops/parchment")
    expect(ADMIN_STALE_INTAKES_HREF).toBe("/admin/ops/intakes-stuck")
    expect(ADMIN_PATIENT_MERGE_AUDIT_HREF).toBe("/admin/ops/patient-merge-audit")
    expect(ADMIN_PRESCRIBING_IDENTITY_HREF).toBe("/admin/ops/prescribing-identity")
  })

  it("preserves queue redirect intent and allowed pagination params", () => {
    expect(buildDoctorQueueRedirectHref({ status: "review", page: "2", pageSize: "25" })).toBe(
      "/doctor/dashboard?status=review&page=2&pageSize=25",
    )
    expect(buildDoctorQueueRedirectHref({ status: "bad", page: "0", pageSize: "999", noise: "x" })).toBe(
      "/doctor/dashboard",
    )
  })

  it("parses queue status filters defensively", () => {
    expect(parseQueueStatusFilter("review")).toBe("review")
    expect(parseQueueStatusFilter("pending_info")).toBe("pending_info")
    expect(parseQueueStatusFilter(["scripts", "review"])).toBe("scripts")
    expect(parseQueueStatusFilter("declined")).toBe("all")
    expect(parseQueueStatusFilter(undefined)).toBe("all")
  })
})
