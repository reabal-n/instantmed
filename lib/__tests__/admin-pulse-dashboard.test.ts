import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { buildAdminDashboardHref } from "@/lib/dashboard/routes"
import {
  type AdminPulseDecisionInput,
  resolveAdminPulseAction,
  resolveAdminPulseMood,
} from "@/lib/data/admin-pulse"

const baseInput: AdminPulseDecisionInput = {
  queueSize: 0,
  scriptsPending: 0,
  pendingInfo: 0,
  oldestInQueueMinutes: null,
  paidToday: 0,
  failedEmails24h: 0,
  openSupportTickets: 0,
  activeDisputes: 0,
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("admin pulse dashboard", () => {
  it("keeps the default admin page as a unified staff cockpit", () => {
    const page = readProjectFile("app/admin/page.tsx")
    const ledgerPage = readProjectFile("app/admin/intakes/page.tsx")
    const pulseSource = readProjectFile("lib/data/admin-pulse.ts")

    expect(page).toContain("OperatorPage")
    expect(page).toContain('title="Staff cockpit"')
    expect(page).toContain("Approve requests, write scripts, and open patient profiles from one place.")
    expect(page).toContain("getDoctorDashboardStats")
    expect(page).toContain("getDoctorQueue")
    expect(page).toContain("<AdminHubZones")
    expect(page).toContain("<QueueClient")
    expect(page).toContain("<PanelProvider")
    expect(page).toContain("compactShell")
    expect(page).toContain("DoctorAvailabilityToggle")
    expect(page).toContain('id="doctor-queue"')
    expect(ledgerPage).toContain("<PanelProvider")
    expect(ledgerPage).toContain('title="Intake ledger"')
    expect(ledgerPage).toContain("getAllIntakesForAdmin")
    expect(ledgerPage).toContain("<AdminDashboardClient")
    expect(page).not.toContain("getAdminPulseData")
    expect(page).not.toContain("<AdminPulse")
    expect(page).not.toContain("<YesterdayWidget")
    expect(pulseSource).toContain("getIntakeMonitoringStats")
    expect(pulseSource).toContain("getDoctorDashboardStats")
    expect(pulseSource).not.toContain("getBusinessKPIData")
  })

  it("uses the dashboard route canon for admin navigation links", () => {
    const routes = readProjectFile("lib/dashboard/routes.ts")
    const sidebar = readProjectFile("components/admin/admin-sidebar.tsx")
    const hubZones = readProjectFile("components/admin/admin-hub-zones.tsx")
    const ledger = readProjectFile("app/admin/admin-dashboard-client.tsx")
    const staffNavigation = readProjectFile("lib/dashboard/staff-navigation.ts")

    expect(routes).toContain("ADMIN_ANALYTICS_HREF")
    expect(routes).toContain("ADMIN_EMAIL_HUB_HREF")
    expect(sidebar).toContain("operatorNavSections")
    expect(staffNavigation).toContain("ADMIN_ANALYTICS_HREF")
    expect(staffNavigation).toContain("ADMIN_FINANCE_HREF")
    expect(staffNavigation).toContain("ADMIN_OPS_HREF")
    expect(staffNavigation).toContain("ADMIN_DOCTOR_QUEUE_HREF")
    expect(staffNavigation).toContain("ADMIN_SCRIPTS_HREF")
    expect(staffNavigation).toContain("ADMIN_PATIENTS_HREF")
    expect(staffNavigation).toContain("StaffNavCounts")
    expect(sidebar).toContain("NavBadge")
    expect(sidebar).toContain("useLiveStaffNavCounts")
    expect(sidebar).not.toContain('href: "/admin/analytics"')
    expect(sidebar).not.toContain('href: "/admin/finance"')
    expect(sidebar).not.toContain('href: "/admin/ops"')
    expect(sidebar).not.toContain('href: "/doctor/dashboard"')
    expect(hubZones).not.toContain('href: "/admin/ops"')
    expect(hubZones).not.toContain('href: "/admin/webhook-dlq"')
    expect(hubZones).toContain("ADMIN_PARCHMENT_OPS_HREF")
    expect(ledger).toContain("buildAdminIntakeHref")
    expect(ledger).not.toContain("`/admin/intakes/${intake.id}`")
  })

  it("keeps the admin ledger search-first instead of another dashboard", () => {
    const ledger = readProjectFile("app/admin/admin-dashboard-client.tsx")

    expect(ledger).toContain("getAdminWorkLaneForStatus")
    expect(ledger).toContain("ADMIN_WORK_LANE_FILTER_OPTIONS")
    expect(ledger).toContain("ADMIN_INTAKE_STATUS_FILTER_OPTIONS")
    expect(ledger).toContain("matchesAdminWorkLaneFilter")
    expect(ledger).toContain("matchesAdminStatusFilter")
    expect(ledger).toContain("getServicePresentation")
    expect(ledger).toContain("matchesAdminServiceFilter")
    expect(ledger).toContain("Find anything")
    expect(ledger).toContain("Search the recent request ledger, then open the case.")
    expect(ledger).toContain("Search patient, request ID, phone, email, suburb")
    expect(ledger).toContain("IntakeResultRow")
    expect(ledger).toContain("usePanel")
    expect(ledger).toContain("openIntakeReview")
    expect(ledger).toContain("IntakeReviewPanel")
    expect(ledger).toContain('event.key === "ArrowDown"')
    expect(ledger).toContain('event.key === "Enter"')
    expect(ledger).toContain("Full case")
    expect(ledger).not.toContain("Clinical handoff")
    expect(ledger).not.toContain("Admin operations")
    expect(ledger).not.toContain("Work queue")
    expect(ledger).not.toContain("<Table")
    expect(ledger).not.toContain("function WorkLane")
    expect(ledger).not.toContain("workLaneCounts")
    expect(ledger).not.toContain("Doctor work")
    expect(ledger).toContain('AdminWorkLaneFilterValue>(() =>')
    expect(ledger).toContain('"clinical" : "all"')
    expect(ledger.indexOf("Find anything")).toBeLessThan(ledger.indexOf('placeholder="Search patient'))
  })

  it("keeps the embedded clinical queue compact and action-first", () => {
    const queueFilters = readProjectFile("app/doctor/queue/queue-filters.tsx")
    const queueTable = readProjectFile("app/doctor/queue/queue-table.tsx")
    const queueClient = readProjectFile("app/doctor/queue/queue-client.tsx")
    const intakeQueries = readProjectFile("lib/data/intakes/queries.ts")
    const hubZones = readProjectFile("components/admin/admin-hub-zones.tsx")
    const intakeReviewPanel = readProjectFile("components/doctor/intake-review-panel.tsx")
    const intakeReviewCockpit = readProjectFile("components/doctor/review/intake-review-cockpit.tsx")
    const patientDecisionStrip = readProjectFile("components/doctor/patient-decision-strip.tsx")
    const patientProfilePanel = readProjectFile("components/doctor/patient-profile-panel.tsx")
    const caseSummary = readProjectFile("lib/doctor/case-summary.ts")
    const requestInfoCard = readProjectFile("components/doctor/review/request-info-card.tsx")
    const clinicalCaseReview = readProjectFile("components/doctor/clinical-case-review.tsx")

    expect(queueFilters).toContain("Review and scripts")
    expect(queueFilters).toContain("Open next case")
    expect(queueFilters).toContain("Search patient, profile, ref, Medicare, email, phone")
    expect(queueFilters).toContain("Scripts to write")
    expect(queueFilters).toContain("!compactShell &&")
    expect(queueTable).toContain("getCompactPatientDescription")
    expect(queueTable).toContain("getCompactNextActionLabel")
    expect(queueTable).toContain("Write script")
    expect(queueTable).toContain("Review script")
    expect(queueTable).toContain("Fix identity")
    expect(queueTable).toContain("ADMIN_PRESCRIBING_IDENTITY_HREF")
    expect(queueTable).toContain('compactShell ? "Risk" : "Flagged"')
    expect(queueTable).toContain("!compactShell && isReturning")
    expect(queueClient).toContain("handleReviewNext")
    expect(queueClient).toContain("sortForReviewNext")
    expect(queueClient).toContain("Case done. Opening next.")
    expect(queueClient).toContain("r.reference_number?.toLowerCase()")
    expect(queueClient).toContain("r.patient.email?.toLowerCase()")
    expect(queueClient).toContain("r.patient.phone?.replace")
    expect(intakeQueries).toContain("reference_number,")
    expect(hubZones).toContain('stat.value > 0 ? stat.value : "Clear"')
    expect(hubZones).toContain("<details")
    expect(hubZones).toContain("group-open:rotate-180")
    expect(intakeReviewPanel).toContain("PatientDecisionStrip")
    expect(intakeReviewPanel).toContain("PatientProfilePanel")
    expect(intakeReviewPanel).toContain("profileMode")
    expect(intakeReviewPanel).toContain("<IntakeReviewCockpit")
    expect(intakeReviewCockpit).toContain("xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]")
    expect(intakeReviewCockpit).toContain("<RequestInfoCard compact hideFullAnswers")
    expect(intakeReviewCockpit).toContain("<ReviewBlockersStrip")
    expect(intakeReviewPanel).not.toContain("<PatientInfoCard")
    expect(patientDecisionStrip).toContain("Patient details for this decision")
    expect(patientDecisionStrip).toContain("buildStaffCaseSummary")
    expect(patientDecisionStrip).toContain("Last request")
    expect(patientDecisionStrip).toContain("Identity ready")
    expect(caseSummary).toContain("Notes ready")
    expect(caseSummary).toContain("resolveStaffCaseActionLabel")
    expect(patientProfilePanel).toContain("Patient profile")
    expect(patientProfilePanel).toContain("Open full record")
    expect(patientProfilePanel).toContain("/api/doctor/patients/${snapshot.id}/summary")
    expect(patientProfilePanel).toContain("Clinical history")
    expect(requestInfoCard).toContain("hideFullAnswers")
    expect(clinicalCaseReview).toContain("showFullAnswers")
  })

  it("keeps patient profile access in-panel across staff workflows", () => {
    const ledger = readProjectFile("app/admin/admin-dashboard-client.tsx")
    const queueTable = readProjectFile("app/doctor/queue/queue-table.tsx")
    const scriptsClient = readProjectFile("app/doctor/scripts/scripts-client.tsx")
    const scriptTasks = readProjectFile("lib/data/script-tasks.ts")
    const commandPalette = readProjectFile("components/operator/staff-command-palette.tsx")

    expect(ledger).toContain("PatientProfilePanel")
    expect(ledger).toContain("StaffCommandPalette")
    expect(ledger).toContain("Staff search")
    expect(ledger).toContain("buildStaffCaseSummary")
    expect(ledger).toContain("label: \"Action\"")
    expect(ledger).toContain("label: \"Profile\"")
    expect(ledger).toContain("label: \"Message\"")
    expect(ledger).toContain("isQuietRow")
    expect(ledger).toContain("profileMode=\"admin\"")
    expect(queueTable).toContain("PatientProfilePanel")
    expect(queueTable).not.toContain("router.push(patientSnapshot.profileHref)")
    expect(scriptsClient).toContain("PatientProfilePanel")
    expect(scriptsClient).toContain("openPatientProfile")
    expect(scriptTasks).toContain("intake:intakes(patient_id)")
    expect(commandPalette).toContain("metaKey || event.ctrlKey")
    expect(commandPalette).toContain("onSelect?.()")
  })

  it("prioritises the clinical next action before soft admin work", () => {
    const input: AdminPulseDecisionInput = {
      ...baseInput,
      queueSize: 3,
      scriptsPending: 1,
      pendingInfo: 4,
      failedEmails24h: 1,
    }

    expect(resolveAdminPulseMood(input)).toBe("busy")
    expect(resolveAdminPulseAction(input)).toMatchObject({
      label: "Open scripts queue",
      href: buildAdminDashboardHref({ status: "scripts", anchor: "doctor-queue" }),
      tone: "warning",
    })
  })

  it("escalates hard trust issues above the normal queue", () => {
    const input: AdminPulseDecisionInput = {
      ...baseInput,
      queueSize: 2,
      activeDisputes: 1,
    }

    expect(resolveAdminPulseMood(input)).toBe("attention")
    expect(resolveAdminPulseAction(input)).toMatchObject({
      label: "Check the payment dispute",
      tone: "danger",
    })
  })

  it("stays calm when nothing needs founder attention", () => {
    expect(resolveAdminPulseMood(baseInput)).toBe("calm")
    expect(resolveAdminPulseAction(baseInput)).toMatchObject({
      label: "Open the intake ledger",
      tone: "success",
    })
  })
})
