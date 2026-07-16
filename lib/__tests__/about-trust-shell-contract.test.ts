import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("about trust and sticky CTA shell", () => {
  it("observes the real hero CTA instead of an empty anchor", () => {
    const shell = read("components/marketing/shared/informational-page-shell.tsx")
    const about = read("app/about/about-client.tsx")

    expect(shell).toContain("heroCTARef: React.RefObject<HTMLDivElement>")
    expect(shell).toContain("children({ analytics, prefersReducedMotion, handleFAQOpen, heroCTARef })")
    expect(shell).not.toContain("Invisible anchor for sticky CTA")
    expect(about).toContain("{({ analytics, heroCTARef }) =>")
    expect(about).toContain("ref={heroCTARef}")
  })

  it("keeps launched services, availability, and privacy claims current", () => {
    const about = read("app/about/about-client.tsx")
    const guide = read("components/marketing/sections/about-guide-section.tsx")

    expect(about).toMatch(/women's health|UTI assessment/i)
    expect(about).toContain('value: "24/7"')
    expect(about).not.toContain("Women's health and weight management are planned for later")
    expect(about).not.toContain("We don't sell or share your data with third parties")
    expect(guide).not.toContain("never leaves the country")
    expect(guide).toContain("we don't share it with marketers")
  })
})
