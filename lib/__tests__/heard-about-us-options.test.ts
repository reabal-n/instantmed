import { describe, expect, it } from "vitest"

import {
  HEARD_ABOUT_US_OPTIONS,
  HEARD_ABOUT_US_VALUES,
  heardAboutUsLabel,
  heardAboutUsSchema,
  isHeardAboutUsValue,
} from "@/lib/analytics/heard-about-us"

describe("heard-about-us options", () => {
  it("exposes the AU-tuned dark-channel option set", () => {
    expect(HEARD_ABOUT_US_VALUES).toEqual(["ai", "search", "friend", "forum", "ad", "other"])
  })

  it("keeps `other` last so new options append cleanly", () => {
    expect(HEARD_ABOUT_US_VALUES[HEARD_ABOUT_US_VALUES.length - 1]).toBe("other")
  })

  it("has a unique value and a non-empty label for every option", () => {
    const values = HEARD_ABOUT_US_OPTIONS.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
    for (const option of HEARD_ABOUT_US_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0)
      expect(option.emoji.length).toBeGreaterThan(0)
    }
  })

  it("validates known values and rejects unknown ones via the Zod enum", () => {
    expect(heardAboutUsSchema.safeParse("ai").success).toBe(true)
    expect(heardAboutUsSchema.safeParse("friend").success).toBe(true)
    expect(heardAboutUsSchema.safeParse("tiktok").success).toBe(false)
    expect(heardAboutUsSchema.safeParse("").success).toBe(false)
  })

  it("guards values with isHeardAboutUsValue", () => {
    expect(isHeardAboutUsValue("search")).toBe(true)
    expect(isHeardAboutUsValue("nope")).toBe(false)
    expect(isHeardAboutUsValue(undefined)).toBe(false)
    expect(isHeardAboutUsValue(42)).toBe(false)
  })

  it("maps values to labels and falls back to the raw value", () => {
    expect(heardAboutUsLabel("ai")).toBe("ChatGPT or other AI")
    expect(heardAboutUsLabel("unknown-token")).toBe("unknown-token")
  })

  it("keeps the Zod enum and the option list in lockstep", () => {
    expect([...heardAboutUsSchema.options].sort()).toEqual(
      HEARD_ABOUT_US_OPTIONS.map((o) => o.value).sort(),
    )
  })
})
