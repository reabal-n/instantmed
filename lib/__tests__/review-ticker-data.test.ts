import { describe, it, expect } from "vitest"
import {
  formatTickerEntry,
  type TickerEntry,
} from "@/lib/marketing/review-ticker-data"

describe("formatTickerEntry — named format (med cert, hair loss)", () => {
  const entry: TickerEntry = { name: "Sarah", city: "Melbourne", minutesAgo: 23 }

  it("includes the first name", () => {
    expect(formatTickerEntry(entry, "named", "certificate")).toContain("Sarah")
  })

  it("includes the city", () => {
    expect(formatTickerEntry(entry, "named", "certificate")).toContain("Melbourne")
  })

  it("includes the time", () => {
    expect(formatTickerEntry(entry, "named", "certificate")).toContain("23 min")
  })
})

describe("formatTickerEntry — anonymous format (ED)", () => {
  const entry: TickerEntry = { name: "Sarah", city: "Melbourne", minutesAgo: 23 }

  it("does NOT include the first name", () => {
    expect(formatTickerEntry(entry, "anonymous", "treatment")).not.toContain("Sarah")
  })

  it("still includes the city", () => {
    expect(formatTickerEntry(entry, "anonymous", "treatment")).toContain("Melbourne")
  })

  it("still includes the time", () => {
    expect(formatTickerEntry(entry, "anonymous", "treatment")).toContain("23 min")
  })

  it("uses neutral person reference", () => {
    const str = formatTickerEntry(entry, "anonymous", "treatment")
    expect(str.toLowerCase()).toMatch(/patient|someone/)
  })
})
