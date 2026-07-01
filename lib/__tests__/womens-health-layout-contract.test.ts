import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function revealTags(source: string): string[] {
  return Array.from(source.matchAll(/<Reveal\b[\s\S]*?>/g), (match) => match[0])
}

describe("women's health landing layout contract", () => {
  it("renders page-owned reveal blocks immediately to avoid blank mobile proof bands", () => {
    const source = read("components/marketing/womens-health-landing.tsx")
    const delayedTags = revealTags(source).filter((tag) => !/\binstant\b/.test(tag))

    expect(delayedTags).toEqual([])
    expect(source).toContain("<HowItWorksInline")
    expect(source).toContain("revealInstant")
    expect(source).toContain("<DoctorProfileSection instant />")
    expect(source).toContain("<CTABanner")
  })

  it("keeps shared landing modules opt-in for instant reveal behavior", () => {
    const howItWorks = read("components/marketing/sections/how-it-works-inline.tsx")
    const doctorProfile = read("components/marketing/sections/doctor-profile-section.tsx")
    const ctaBanner = read("components/sections/cta-banner.tsx")

    expect(howItWorks).toContain("revealInstant?: boolean")
    expect(howItWorks).toContain("instant={revealInstant || i < 2}")
    expect(howItWorks).toContain("<Reveal instant={revealInstant}")

    expect(doctorProfile).toContain("instant?: boolean")
    expect(doctorProfile).toContain("<Reveal instant={instant}>")

    expect(ctaBanner).toContain("revealInstant?: boolean")
    expect(ctaBanner).toContain("<Reveal instant={revealInstant}")
  })
})
