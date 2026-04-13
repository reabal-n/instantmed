import { describe, expect,it } from "vitest"

import { computeFollowupMilestones } from "@/lib/data/followups"

describe("computeFollowupMilestones", () => {
  it("returns three milestones at +3, +6, +12 months", () => {
    const approvedAt = new Date("2026-04-09T10:00:00Z")
    const milestones = computeFollowupMilestones(approvedAt)
    expect(milestones).toHaveLength(3)
    expect(milestones[0].milestone).toBe("month_3")
    // date-fns addMonths operates in local time - just verify the date portion
    expect(milestones[0].dueAt.toISOString()).toMatch(/^2026-07-09T/)
    expect(milestones[1].milestone).toBe("month_6")
    expect(milestones[1].dueAt.toISOString()).toMatch(/^2026-10-09T/)
    expect(milestones[2].milestone).toBe("month_12")
    expect(milestones[2].dueAt.toISOString()).toMatch(/^2027-04-09T/)
  })

  it("handles end-of-month edge case (Jan 31 → Apr 30)", () => {
    const milestones = computeFollowupMilestones(new Date("2026-01-31T00:00:00Z"))
    // date-fns addMonths clamps to last valid day of target month
    expect(milestones[0].dueAt.toISOString().startsWith("2026-04-30")).toBe(true)
  })
})
