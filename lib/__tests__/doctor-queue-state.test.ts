import { describe, expect, it } from "vitest"

import { removeCompletedIntakeFromQueue } from "@/lib/doctor/queue-state"

const row = (id: string) => ({ id, label: `case-${id}` })

describe("removeCompletedIntakeFromQueue", () => {
  it("removes the completed intake and selects the next row at the same index", () => {
    const result = removeCompletedIntakeFromQueue([row("a"), row("b"), row("c")], "b")

    expect(result.remaining.map((item) => item.id)).toEqual(["a", "c"])
    expect(result.nextIntake?.id).toBe("c")
  })

  it("selects the previous row when the completed intake was last", () => {
    const result = removeCompletedIntakeFromQueue([row("a"), row("b")], "b")

    expect(result.remaining.map((item) => item.id)).toEqual(["a"])
    expect(result.nextIntake?.id).toBe("a")
  })

  it("does not change the queue when the completed intake is missing", () => {
    const intakes = [row("a")]
    const result = removeCompletedIntakeFromQueue(intakes, "missing")

    expect(result.remaining).toBe(intakes)
    expect(result.nextIntake).toBeNull()
  })
})
