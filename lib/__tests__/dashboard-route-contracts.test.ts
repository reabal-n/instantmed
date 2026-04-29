import { describe, expect, it } from "vitest"

import {
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
