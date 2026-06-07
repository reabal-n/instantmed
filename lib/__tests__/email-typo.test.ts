import { describe, expect, it } from "vitest"

import { detectEmailTypo, getEmailTypoMessage } from "@/lib/validation/email-typo"

describe("detectEmailTypo", () => {
  it("flags the gamil.com gmail typo (the one seen in production) with a high-confidence suggestion", () => {
    const result = detectEmailTypo("jane@gamil.com")
    expect(result.hasTypo).toBe(true)
    expect(result.suggested).toBe("jane@gmail.com")
    expect(result.confidence).toBe("high")
  })

  it("flags other common provider typos", () => {
    expect(detectEmailTypo("a@gmial.com").suggested).toBe("a@gmail.com")
    expect(detectEmailTypo("a@hotmial.com").suggested).toBe("a@hotmail.com")
    expect(detectEmailTypo("a@yahooo.com").suggested).toBe("a@yahoo.com")
  })

  it("flags a .con TLD typo as medium confidence", () => {
    const result = detectEmailTypo("a@company.con")
    expect(result.hasTypo).toBe(true)
    expect(result.suggested).toBe("a@company.com")
    expect(result.confidence).toBe("medium")
  })

  it("does not flag a valid email", () => {
    expect(detectEmailTypo("jane@gmail.com").hasTypo).toBe(false)
    expect(detectEmailTypo("jane@instantmed.com.au").hasTypo).toBe(false)
  })

  it("does not flag an empty or incomplete email", () => {
    expect(detectEmailTypo("").hasTypo).toBe(false)
    expect(detectEmailTypo("jane").hasTypo).toBe(false)
  })

  it("preserves the local part (case-normalised domain only)", () => {
    expect(detectEmailTypo("First.Last+tag@gamil.com").suggested).toBe("first.last+tag@gmail.com")
  })
})

describe("getEmailTypoMessage", () => {
  it("renders a 'Did you mean' prompt for a typo", () => {
    expect(getEmailTypoMessage(detectEmailTypo("jane@gamil.com"))).toBe("Did you mean jane@gmail.com?")
  })

  it("returns null when there is no typo", () => {
    expect(getEmailTypoMessage(detectEmailTypo("jane@gmail.com"))).toBeNull()
  })
})
