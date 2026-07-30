import { describe, expect, it } from "vitest"

import {
  ADMIN_INTAKE_STATUS_FILTER_OPTIONS,
  ADMIN_WORK_LANE_FILTER_OPTIONS,
  getAdminWorkLaneForStatus,
} from "@/lib/dashboard/admin-work-lanes"

describe("admin work lanes", () => {
  it("routes statuses into clinical, recovery, done, and other lanes", () => {
    expect(getAdminWorkLaneForStatus("awaiting_script")).toBe("clinical")
    expect(getAdminWorkLaneForStatus("paid")).toBe("clinical")
    expect(getAdminWorkLaneForStatus("pending_info")).toBe("clinical")
    expect(getAdminWorkLaneForStatus("checkout_failed")).toBe("recovery")
    expect(getAdminWorkLaneForStatus("completed")).toBe("done")
    expect(getAdminWorkLaneForStatus("draft")).toBe("other")
  })

  it("exposes compact server-query lane options", () => {
    expect(ADMIN_WORK_LANE_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      "all",
      "clinical",
      "recovery",
      "done",
    ])
    expect(ADMIN_WORK_LANE_FILTER_OPTIONS.map((option) => option.label)).toEqual([
      "All requests",
      "Clinical",
      "Payment & recovery",
      "Completed",
    ])

  })

  it("exposes status filters through values, not duplicated labels", () => {
    expect(ADMIN_INTAKE_STATUS_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      "all",
      "paid",
      "in_review",
      "pending_info",
      "pending_payment",
      "checkout_failed",
      "awaiting_script",
      "approved",
      "declined",
      "completed",
      "cancelled",
    ])
  })
})
