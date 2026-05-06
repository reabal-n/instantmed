import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { buildDoctorDashboardHref } from "@/lib/dashboard/routes"
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
  it("keeps the default admin page request-first, with the pulse as secondary context", () => {
    const page = readProjectFile("app/admin/page.tsx")
    const pulseSource = readProjectFile("lib/data/admin-pulse.ts")

    expect(page).toContain("getAdminPulseData")
    expect(page).toContain("<AdminPulse pulse={pulse} />")
    expect(page).toContain("Requests first")
    expect(page.indexOf("<AdminDashboardClient")).toBeLessThan(page.indexOf("<AdminPulse"))
    expect(page).not.toContain("<AdminHubZones")
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

    expect(routes).toContain("ADMIN_ANALYTICS_HREF")
    expect(routes).toContain("ADMIN_EMAIL_HUB_HREF")
    expect(sidebar).not.toContain('href: "/admin/analytics"')
    expect(sidebar).not.toContain('href: "/admin/finance"')
    expect(sidebar).not.toContain('href: "/admin/ops"')
    expect(hubZones).not.toContain('href: "/admin/ops"')
    expect(hubZones).not.toContain('href: "/admin/webhook-dlq"')
    expect(hubZones).toContain("ADMIN_PARCHMENT_OPS_HREF")
    expect(ledger).toContain("buildAdminIntakeHref")
    expect(ledger).not.toContain("`/admin/intakes/${intake.id}`")
  })

  it("splits the admin ledger into clinical handoff and admin operations before the full table", () => {
    const ledger = readProjectFile("app/admin/admin-dashboard-client.tsx")

    expect(ledger).toContain("getAdminWorkLaneForStatus")
    expect(ledger).toContain("ADMIN_WORK_LANE_FILTER_OPTIONS")
    expect(ledger).toContain("ADMIN_INTAKE_STATUS_FILTER_OPTIONS")
    expect(ledger).toContain("matchesAdminWorkLaneFilter")
    expect(ledger).toContain("matchesAdminStatusFilter")
    expect(ledger).toContain("getServicePresentation")
    expect(ledger).toContain("matchesAdminServiceFilter")
    expect(ledger).toContain("Clinical handoff")
    expect(ledger).toContain("Admin operations")
    expect(ledger).not.toContain("Doctor work")
    expect(ledger).toContain('AdminWorkLaneFilterValue>(() =>')
    expect(ledger).toContain('"clinical" : "all"')
    expect(ledger.indexOf("Clinical handoff")).toBeLessThan(ledger.indexOf("Search by name"))
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
      label: "Switch to doctor mode for scripts",
      href: buildDoctorDashboardHref({ status: "scripts" }),
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
