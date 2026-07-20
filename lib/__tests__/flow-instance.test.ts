import { describe, expect, it } from "vitest"

import {
  ensureFlowInstanceId,
  normalizeFlowInstanceId,
} from "@/lib/analytics/flow-instance"

describe("privacy-safe flow instance identifiers", () => {
  it("creates opaque UUID v4 identifiers without encoded context", () => {
    const first = ensureFlowInstanceId(null)
    const second = ensureFlowInstanceId(null)

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(second).not.toBe(first)
  })

  it("normalizes only valid UUID v4 values", () => {
    expect(
      normalizeFlowInstanceId(" 11111111-1111-4111-8111-111111111111 "),
    ).toBe("11111111-1111-4111-8111-111111111111")
    expect(
      normalizeFlowInstanceId("11111111-1111-1111-8111-111111111111"),
    ).toBeNull()
    expect(normalizeFlowInstanceId("patient@example.com")).toBeNull()
    expect(normalizeFlowInstanceId(null)).toBeNull()
  })
})
