import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("guide-only article template contract", () => {
  it("does not render acquisition CTA blocks inside health guides", () => {
    const template = fs.readFileSync(
      path.join(process.cwd(), "components", "blog", "article-template.tsx"),
      "utf-8",
    )

    expect(template).not.toContain("BlogCTACard")
    expect(template).not.toContain("MidArticleCTA")
    expect(template).not.toContain("How InstantMed Can Help")
    expect(template).not.toContain("Start a consultation")
    expect(template).not.toContain("Available in")
    expect(template).not.toContain("/locations/")
  })
})
