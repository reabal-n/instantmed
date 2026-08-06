import { describe, expect, it } from "vitest"

import { isPriorityReviewOffered } from "@/lib/request/priority-review-window"

/**
 * Quiet hours: the priority upsell is hidden 00:00–08:59 Australia/Sydney.
 * Instants below are expressed in UTC and chosen to land on both sides of the
 * boundary in BOTH offsets — AEST (UTC+10, winter) and AEDT (UTC+11, summer) —
 * so a DST regression cannot pass silently.
 */
describe("priority review quiet hours (Australia/Sydney)", () => {
  // August = AEST (UTC+10)
  it("offers at 09:00 AEST and later", () => {
    expect(isPriorityReviewOffered(new Date("2026-08-02T23:00:00Z"))).toBe(true) // 09:00
    expect(isPriorityReviewOffered(new Date("2026-08-03T03:59:00Z"))).toBe(true) // 13:59
    expect(isPriorityReviewOffered(new Date("2026-08-03T13:59:00Z"))).toBe(true) // 23:59
  })

  it("hides 00:00–08:59 AEST", () => {
    expect(isPriorityReviewOffered(new Date("2026-08-02T14:00:00Z"))).toBe(false) // 00:00
    expect(isPriorityReviewOffered(new Date("2026-08-02T18:30:00Z"))).toBe(false) // 04:30
    expect(isPriorityReviewOffered(new Date("2026-08-02T22:59:00Z"))).toBe(false) // 08:59
  })

  // January = AEDT (UTC+11)
  it("offers at 09:00 AEDT and later", () => {
    expect(isPriorityReviewOffered(new Date("2026-01-01T22:00:00Z"))).toBe(true) // 09:00
    expect(isPriorityReviewOffered(new Date("2026-01-02T12:59:00Z"))).toBe(true) // 23:59
  })

  it("hides 00:00–08:59 AEDT", () => {
    expect(isPriorityReviewOffered(new Date("2026-01-01T13:00:00Z"))).toBe(false) // 00:00
    expect(isPriorityReviewOffered(new Date("2026-01-01T21:59:00Z"))).toBe(false) // 08:59
  })
})
