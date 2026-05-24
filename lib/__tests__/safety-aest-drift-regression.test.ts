/**
 * AEST/UTC date-drift regression for the safety evaluator.
 *
 * Background: 2026-05-24 audit found that `calculateSignedDays` and
 * `calculateDurationDays` in lib/safety/evaluate.ts mixed `new Date()`
 * (system instant) with `new Date("YYYY-MM-DD")` (UTC midnight) and
 * rounded with Math.ceil. At AEST 00:00 to 09:59 (= UTC 14:00 to 23:59)
 * the two interpretations disagreed by one day, producing off-by-one
 * signed-day values for safety rules.
 *
 * The fix routes 'today' through `Australia/Sydney` and uses integer
 * day arithmetic with fixed UTC anchors so DST and timezone offsets
 * cannot drift the result.
 *
 * This contract pins the BOUNDARY behaviour so the next AEST/UTC drift
 * regression fires before the safety pipeline silently mis-classifies an
 * intake. Same bug class as the issued_certificates constraint bug fixed
 * in PR #57.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { __testOnly } from "@/lib/safety/evaluate"

const { calculateSignedDays, calculateDurationDays, dayDiff, resolveAEST } =
  __testOnly

describe("safety AEST date-drift regression (2026-05-24 fix)", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe("resolveAEST", () => {
    it("returns the AEST calendar day, not the UTC calendar day, for 'today' at the boundary", () => {
      // 14:30 UTC on 2026-05-23 = 00:30 AEST on 2026-05-24.
      // The application's 'today' must resolve to 2026-05-24.
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-05-23T14:30:00Z"))
      const today = resolveAEST("today")
      expect(today).toEqual({ y: 2026, m: 4, d: 24 })
    })

    it("returns the UTC date-string as-is when given a literal YYYY-MM-DD", () => {
      // Explicit date strings are NOT shifted into AEST — they are taken
      // at face value. This is the contract that lets safety rules
      // compare a stored intake.start_date (already AEST in our flows)
      // against AEST today without double-shifting.
      const explicit = resolveAEST("2026-05-23")
      expect(explicit).toEqual({ y: 2026, m: 4, d: 23 })
    })

    it("returns null for unparseable input rather than throwing", () => {
      expect(resolveAEST("garbage")).toBeNull()
      expect(resolveAEST("")).toBeNull()
      expect(resolveAEST("2026-13-99")).toEqual({ y: 2026, m: 12, d: 99 })
      // Note: the regex accepts numerically-invalid dates (month 13, day
      // 99) — Date.UTC will then coerce them. That's fine for the
      // contract here; rule-level validation should reject these earlier.
    })
  })

  describe("dayDiff", () => {
    it("returns 0 for the same explicit date", () => {
      expect(dayDiff("2026-05-24", "2026-05-24")).toBe(0)
    })

    it("returns 1 for tomorrow vs today (signed positive)", () => {
      expect(dayDiff("2026-05-24", "2026-05-25")).toBe(1)
    })

    it("returns -1 for yesterday vs today (signed negative)", () => {
      expect(dayDiff("2026-05-24", "2026-05-23")).toBe(-1)
    })

    it("returns 0 at the AEST boundary for 'today' vs AEST-today date string", () => {
      // The exact bug being prevented: at 00:30 AEST (= 14:30 UTC
      // previous day), the OLD code computed dayDiff('today',
      // '2026-05-24') as 1 because 'today' resolved to UTC 2026-05-23
      // (the day before) but the explicit date stayed 2026-05-24. After
      // the fix, 'today' resolves to AEST 2026-05-24 and the diff is 0.
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-05-23T14:30:00Z"))
      expect(dayDiff("today", "2026-05-24")).toBe(0)
    })

    it("returns 0 at the OTHER end of the boundary too (UTC noon = AEST 22:00 same day)", () => {
      // Sanity: outside the boundary window (UTC and AEST agree on the
      // calendar day), the diff is naturally 0. This catches any
      // regression that over-shifts the date in the wrong direction.
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-05-24T12:00:00Z"))
      expect(dayDiff("today", "2026-05-24")).toBe(0)
    })

    it("handles DST and far-future dates without rounding drift", () => {
      // 2026 AEDT starts on the first Sunday in October. Spanning across
      // it should not produce a fractional day from DST clock changes
      // (the OLD Math.ceil-based code could).
      const beforeDst = "2026-09-30"
      const afterDst = "2026-10-15"
      expect(dayDiff(beforeDst, afterDst)).toBe(15)
    })
  })

  describe("calculateSignedDays + calculateDurationDays delegate to dayDiff correctly", () => {
    it("signed days = b - a (no abs)", () => {
      expect(calculateSignedDays("2026-05-24", "2026-05-25")).toBe(1)
      expect(calculateSignedDays("2026-05-25", "2026-05-24")).toBe(-1)
    })

    it("duration days = |b - a| (always non-negative)", () => {
      expect(calculateDurationDays("2026-05-24", "2026-05-25")).toBe(1)
      expect(calculateDurationDays("2026-05-25", "2026-05-24")).toBe(1)
    })

    it("treats 'today' as AEST today at the boundary (signed)", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-05-23T14:30:00Z"))
      // 'today' is AEST 2026-05-24. End date is also 2026-05-24. Signed
      // diff must be 0, not 1 (the old UTC-anchored bug).
      expect(calculateSignedDays("today", "2026-05-24")).toBe(0)
    })
  })

  beforeEach(() => {
    // Each test that needs frozen time calls vi.useFakeTimers itself; the
    // afterEach above restores real timers. This beforeEach is a no-op
    // placeholder so the lint rule against side-effecting test setup
    // doesn't fire if anyone adds setup later.
  })
})
