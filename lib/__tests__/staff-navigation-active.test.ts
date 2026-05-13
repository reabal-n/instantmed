import { describe, expect, it } from "vitest"

import {
  getStaffNavHrefPath,
  getStaffNavHrefStatus,
  hasStatusFilteredDashboardItems,
  isStaffNavItemActive,
} from "@/lib/dashboard/staff-navigation-active"

describe("staff navigation active matching", () => {
  it("parses path and status from dashboard anchors", () => {
    const href = "/dashboard?status=review#doctor-queue"

    expect(getStaffNavHrefPath(href)).toBe("/dashboard")
    expect(getStaffNavHrefStatus(href)).toBe("review")
  })

  it("keeps status-filtered dashboard items mutually exclusive", () => {
    const statusFilteredDashboard = true

    expect(isStaffNavItemActive({
      pathname: "/dashboard",
      href: "/dashboard",
      currentStatus: "review",
      statusFilteredDashboard,
    })).toBe(false)
    expect(isStaffNavItemActive({
      pathname: "/dashboard",
      href: "/dashboard?status=review#doctor-queue",
      currentStatus: "review",
      statusFilteredDashboard,
    })).toBe(true)
    expect(isStaffNavItemActive({
      pathname: "/dashboard",
      href: "/dashboard?status=scripts#doctor-queue",
      currentStatus: "review",
      statusFilteredDashboard,
    })).toBe(false)
  })

  it("keeps doctor queue highlighted on dashboard status filters when there is no status sibling", () => {
    expect(isStaffNavItemActive({
      pathname: "/dashboard",
      href: "/dashboard",
      currentStatus: "review",
      statusFilteredDashboard: false,
    })).toBe(true)
  })

  it("matches nested admin sections without lighting unrelated siblings", () => {
    expect(isStaffNavItemActive({
      pathname: "/admin/patients/123",
      href: "/admin/patients",
      currentStatus: null,
    })).toBe(true)
    expect(isStaffNavItemActive({
      pathname: "/admin/patients/123",
      href: "/admin/intakes",
      currentStatus: null,
    })).toBe(false)
  })

  it("detects whether a nav set has dashboard status siblings", () => {
    expect(hasStatusFilteredDashboardItems([
      "/dashboard",
      "/dashboard?status=review#doctor-queue",
    ])).toBe(true)
    expect(hasStatusFilteredDashboardItems([
      "/dashboard",
      "/doctor/scripts",
    ])).toBe(false)
  })
})
