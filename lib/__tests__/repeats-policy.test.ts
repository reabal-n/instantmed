import { describe, expect, it } from "vitest"

import {
  DEFAULT_REPEATS,
  getRepeatsExpectation,
  REFILL_REMINDER_WINDOW_MAX_DAYS,
  REFILL_REMINDER_WINDOW_MIN_DAYS,
  STANDARD_SUPPLY_MONTHS,
} from "@/lib/clinical/repeats-policy"

describe("repeats-policy constants", () => {
  it("defaults to 2 repeats / ~3 months", () => {
    expect(DEFAULT_REPEATS).toBe(2)
    expect(STANDARD_SUPPLY_MONTHS).toBe(3)
  })

  it("reminder window lands ~week 10-11, before a 3-month supply runs out", () => {
    expect(REFILL_REMINDER_WINDOW_MIN_DAYS).toBeLessThan(REFILL_REMINDER_WINDOW_MAX_DAYS)
    // before ~90-day depletion, after ~2 months
    expect(REFILL_REMINDER_WINDOW_MIN_DAYS).toBeGreaterThanOrEqual(60)
    expect(REFILL_REMINDER_WINDOW_MAX_DAYS).toBeLessThanOrEqual(89)
  })
})

describe("getRepeatsExpectation", () => {
  it("shows the daily-medicine line for repeat-script, prescription, and hair loss", () => {
    for (const [service, subtype] of [
      ["repeat-script", undefined],
      ["prescription", undefined],
      ["consult", "hair_loss"],
    ] as const) {
      const copy = getRepeatsExpectation(service, subtype)
      expect(copy).toBeTruthy()
      expect(copy).toContain("2 repeats")
      expect(copy).toContain("3 months")
    }
  })

  it("shows ED without a months-of-supply claim (on-demand)", () => {
    const copy = getRepeatsExpectation("consult", "ed")
    expect(copy).toBeTruthy()
    expect(copy).toContain("2 repeats")
    expect(copy).not.toContain("months")
  })

  it("returns null where repeats don't apply", () => {
    expect(getRepeatsExpectation("med-cert")).toBeNull()
    expect(getRepeatsExpectation("consult", "womens_health")).toBeNull()
    expect(getRepeatsExpectation("consult", "weight_loss")).toBeNull()
    expect(getRepeatsExpectation("consult")).toBeNull() // bare consult, no subtype
  })

  it("every shown line keeps doctor discretion and avoids a guarantee", () => {
    for (const [service, subtype] of [
      ["repeat-script", undefined],
      ["consult", "ed"],
      ["consult", "hair_loss"],
    ] as const) {
      const copy = getRepeatsExpectation(service, subtype)!
      expect(copy.toLowerCase()).toContain("doctor's decision")
      expect(copy.toLowerCase()).toContain("if your doctor approves")
      expect(copy.toLowerCase()).not.toContain("guarantee")
    }
  })
})
