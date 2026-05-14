import { describe, expect, it } from "vitest"

import {
  doctorNavSections,
  operatorNavSections,
  type StaffNavSection,
  supportNavSections,
} from "@/lib/dashboard/staff-navigation"
import {
  getStaffNavHrefPath,
  getStaffNavHrefStatus,
  hasStatusFilteredDashboardItems,
  isStaffNavItemActive,
} from "@/lib/dashboard/staff-navigation-active"

function activeLabelsFor(
  sections: StaffNavSection[],
  pathname: string,
  currentStatus: string | null,
): string[] {
  const allHrefs = sections.flatMap((section) => section.items.map((item) => item.href))
  const statusFilteredDashboard = hasStatusFilteredDashboardItems(allHrefs)

  return sections
    .flatMap((section) => section.items)
    .filter((item) => isStaffNavItemActive({
      pathname,
      href: item.href,
      currentStatus,
      statusFilteredDashboard,
      allHrefs,
    }))
    .map((item) => item.label)
}

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

  it("keeps only the most specific nested ops nav item active", () => {
    const allHrefs = [
      "/admin/ops",
      "/admin/ops/parchment",
      "/admin/ops/prescribing-identity",
    ]

    expect(isStaffNavItemActive({
      pathname: "/admin/ops/parchment",
      href: "/admin/ops",
      currentStatus: null,
      allHrefs,
    })).toBe(false)
    expect(isStaffNavItemActive({
      pathname: "/admin/ops/parchment",
      href: "/admin/ops/parchment",
      currentStatus: null,
      allHrefs,
    })).toBe(true)
    expect(isStaffNavItemActive({
      pathname: "/admin/ops/prescribing-identity/blocked",
      href: "/admin/ops/prescribing-identity",
      currentStatus: null,
      allHrefs,
    })).toBe(true)
  })

  it("keeps admin patient nav active on the shared clinical patient file", () => {
    expect(isStaffNavItemActive({
      pathname: "/doctor/patients/123",
      href: "/admin/patients",
      currentStatus: null,
    })).toBe(true)
    expect(isStaffNavItemActive({
      pathname: "/doctor/patients/123",
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
      "/dashboard?status=scripts#doctor-queue",
    ])).toBe(true)
  })

  it("keeps each rendered staff sidebar to one active item", () => {
    const cases: Array<{
      sections: StaffNavSection[]
      pathname: string
      status: string | null
      expected: string[]
    }> = [
      { sections: operatorNavSections, pathname: "/dashboard", status: null, expected: ["Dashboard"] },
      { sections: operatorNavSections, pathname: "/dashboard", status: "review", expected: ["Review"] },
      { sections: operatorNavSections, pathname: "/dashboard", status: "scripts", expected: ["Scripts"] },
      { sections: operatorNavSections, pathname: "/doctor/patients/123", status: null, expected: ["Patients"] },
      { sections: operatorNavSections, pathname: "/admin/ops/parchment", status: null, expected: ["Ops"] },
      { sections: doctorNavSections, pathname: "/dashboard", status: null, expected: ["Queue"] },
      { sections: doctorNavSections, pathname: "/dashboard", status: "review", expected: ["Queue"] },
      { sections: doctorNavSections, pathname: "/dashboard", status: "scripts", expected: ["Scripts"] },
      { sections: supportNavSections, pathname: "/admin/ops/parchment", status: null, expected: ["Operations"] },
    ]

    for (const item of cases) {
      const activeLabels = activeLabelsFor(item.sections, item.pathname, item.status)

      expect(activeLabels, `${item.pathname}?status=${item.status ?? ""}`).toEqual(item.expected)
      expect(activeLabels.length).toBeLessThanOrEqual(1)
    }
  })
})
