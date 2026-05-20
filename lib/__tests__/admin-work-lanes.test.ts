import { describe, expect, it } from "vitest"

import {
  ADMIN_INTAKE_STATUS_FILTER_OPTIONS,
  ADMIN_WORK_LANE_FILTER_OPTIONS,
  getAdminWorkLaneForStatus,
  matchesAdminStatusFilter,
  matchesAdminWorkLaneFilter,
} from "@/lib/dashboard/admin-work-lanes"

describe("admin work lanes", () => {
  it("routes statuses into clinical, admin, done, and other lanes", () => {
    expect(getAdminWorkLaneForStatus("awaiting_script")).toBe("clinical")
    expect(getAdminWorkLaneForStatus("paid")).toBe("clinical")
    expect(getAdminWorkLaneForStatus("pending_info")).toBe("admin")
    expect(getAdminWorkLaneForStatus("checkout_failed")).toBe("admin")
    expect(getAdminWorkLaneForStatus("completed")).toBe("done")
    expect(getAdminWorkLaneForStatus("draft")).toBe("other")
  })

  it("exposes compact filter options and matches by lane", () => {
    expect(ADMIN_WORK_LANE_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      "all",
      "clinical",
      "admin",
      "done",
    ])
    expect(ADMIN_WORK_LANE_FILTER_OPTIONS.map((option) => option.label)).toEqual([
      "All",
      "Clinical handoff",
      "Admin ops",
      "Done",
    ])

    expect(matchesAdminWorkLaneFilter("awaiting_script", "clinical")).toBe(true)
    expect(matchesAdminWorkLaneFilter("pending_info", "admin")).toBe(true)
    expect(matchesAdminWorkLaneFilter("completed", "done")).toBe(true)
    expect(matchesAdminWorkLaneFilter("draft", "all")).toBe(true)
    expect(matchesAdminWorkLaneFilter("paid", "admin")).toBe(false)
  })

  it("exposes status filters through values, not duplicated labels", () => {
    expect(ADMIN_INTAKE_STATUS_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      "all",
      "paid",
      "in_review",
      "pending_info",
      "awaiting_script",
      "approved",
      "declined",
      "completed",
    ])

    expect(matchesAdminStatusFilter("pending_info", "pending_info")).toBe(true)
    expect(matchesAdminStatusFilter("paid", "all")).toBe(true)
    expect(matchesAdminStatusFilter("paid", "completed")).toBe(false)
  })
})
