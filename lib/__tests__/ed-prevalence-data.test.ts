import { describe, it, expect } from "vitest"
import {
  ED_PREVALENCE_BY_DECADE,
  getPrevalenceForAge,
  getDecadeLabel,
} from "@/lib/marketing/ed-prevalence-data"

describe("ED prevalence data", () => {
  it("covers every adult decade from 20s to 70s+", () => {
    const decades = Object.keys(ED_PREVALENCE_BY_DECADE)
    expect(decades).toContain("20s")
    expect(decades).toContain("30s")
    expect(decades).toContain("40s")
    expect(decades).toContain("50s")
    expect(decades).toContain("60s")
    expect(decades).toContain("70s+")
  })

  it("rates increase monotonically with age", () => {
    const rates = [
      ED_PREVALENCE_BY_DECADE["20s"].rate,
      ED_PREVALENCE_BY_DECADE["30s"].rate,
      ED_PREVALENCE_BY_DECADE["40s"].rate,
      ED_PREVALENCE_BY_DECADE["50s"].rate,
      ED_PREVALENCE_BY_DECADE["60s"].rate,
      ED_PREVALENCE_BY_DECADE["70s+"].rate,
    ]
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1]!)
    }
  })

  it("all rates are plausible (between 1% and 85%)", () => {
    for (const entry of Object.values(ED_PREVALENCE_BY_DECADE)) {
      expect(entry.rate).toBeGreaterThanOrEqual(1)
      expect(entry.rate).toBeLessThanOrEqual(85)
    }
  })

  it("all entries cite a source", () => {
    for (const entry of Object.values(ED_PREVALENCE_BY_DECADE)) {
      expect(entry.source).toBeTruthy()
      expect(entry.source.length).toBeGreaterThan(5)
    }
  })
})

describe("getPrevalenceForAge", () => {
  it("maps ages 20–29 to 20s", () => {
    expect(getPrevalenceForAge(20).decade).toBe("20s")
    expect(getPrevalenceForAge(29).decade).toBe("20s")
  })
  it("maps ages 30–39 to 30s", () => {
    expect(getPrevalenceForAge(30).decade).toBe("30s")
    expect(getPrevalenceForAge(39).decade).toBe("30s")
  })
  it("maps ages 70+ to 70s+", () => {
    expect(getPrevalenceForAge(70).decade).toBe("70s+")
    expect(getPrevalenceForAge(85).decade).toBe("70s+")
  })
  it("clamps below 20 to 20s", () => {
    expect(getPrevalenceForAge(18).decade).toBe("20s")
  })
})

describe("getDecadeLabel", () => {
  it("returns human readable labels", () => {
    expect(getDecadeLabel("20s")).toContain("20")
    expect(getDecadeLabel("70s+")).toMatch(/70|seventies/i)
  })
})
