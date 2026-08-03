import { describe, expect, it } from "vitest"

import { isOvernightInSydney } from "@/lib/email/overnight-window"

/**
 * Overnight = 22:00–06:59 Australia/Sydney. Instants are UTC, chosen to land
 * on both sides of both boundaries in AEST (UTC+10, winter) and AEDT (UTC+11,
 * summer) so a DST regression cannot pass silently.
 */
describe("isOvernightInSydney", () => {
  // August = AEST (UTC+10)
  it("AEST boundaries", () => {
    expect(isOvernightInSydney(new Date("2026-08-03T11:59:00Z"))).toBe(false) // 21:59
    expect(isOvernightInSydney(new Date("2026-08-03T12:00:00Z"))).toBe(true) // 22:00
    expect(isOvernightInSydney(new Date("2026-08-02T14:00:00Z"))).toBe(true) // 00:00
    expect(isOvernightInSydney(new Date("2026-08-02T20:59:00Z"))).toBe(true) // 06:59
    expect(isOvernightInSydney(new Date("2026-08-02T21:00:00Z"))).toBe(false) // 07:00
    expect(isOvernightInSydney(new Date("2026-08-03T02:00:00Z"))).toBe(false) // 12:00
  })

  // January = AEDT (UTC+11)
  it("AEDT boundaries", () => {
    expect(isOvernightInSydney(new Date("2026-01-01T10:59:00Z"))).toBe(false) // 21:59
    expect(isOvernightInSydney(new Date("2026-01-01T11:00:00Z"))).toBe(true) // 22:00
    expect(isOvernightInSydney(new Date("2026-01-01T13:00:00Z"))).toBe(true) // 00:00
    expect(isOvernightInSydney(new Date("2026-01-01T19:59:00Z"))).toBe(true) // 06:59
    expect(isOvernightInSydney(new Date("2026-01-01T20:00:00Z"))).toBe(false) // 07:00
  })
})
