import { describe, expect, it } from "vitest"

import {
  compareAdminWorkItems,
  getAdminWorkLaneForStatus,
} from "@/lib/dashboard/admin-work-lanes"

describe("admin work lanes", () => {
  it("routes statuses into doctor, admin, done, and other lanes", () => {
    expect(getAdminWorkLaneForStatus("awaiting_script")).toBe("doctor")
    expect(getAdminWorkLaneForStatus("paid")).toBe("doctor")
    expect(getAdminWorkLaneForStatus("pending_info")).toBe("admin")
    expect(getAdminWorkLaneForStatus("checkout_failed")).toBe("admin")
    expect(getAdminWorkLaneForStatus("completed")).toBe("done")
    expect(getAdminWorkLaneForStatus("draft")).toBe("other")
  })

  it("keeps urgent doctor/admin work above old completed history", () => {
    const ordered = [
      { status: "completed", created_at: "2026-05-05T00:00:00.000Z" },
      { status: "awaiting_script", created_at: "2026-05-04T00:00:00.000Z" },
      { status: "pending_info", created_at: "2026-05-06T00:00:00.000Z" },
    ].sort(compareAdminWorkItems)

    expect(ordered.map((item) => item.status)).toEqual([
      "awaiting_script",
      "pending_info",
      "completed",
    ])
  })
})
