import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const blogVisualSpec = readFileSync(join(process.cwd(), "e2e", "blog.visual.spec.ts"), "utf8")

describe("blog visual regression coverage", () => {
  it("captures desktop and mobile visual-guide screenshots for the top guide pages", () => {
    expect(blogVisualSpec).toContain("TOP_GUIDE_VISUAL_TARGETS")
    expect(blogVisualSpec).toContain("repeat-prescription-online-australia")
    expect(blogVisualSpec).toContain("online-prescription-australia")
    expect(blogVisualSpec).toContain("sick-leave-certificate-online-australia")
    expect(blogVisualSpec).toContain("online-doctor-sydney")
    expect(blogVisualSpec).toContain("desktop")
    expect(blogVisualSpec).toContain("mobile")
    expect(blogVisualSpec).toContain("toHaveScreenshot")
  })

  it("fails when visible article images are broken instead of relying on screenshot diffs alone", () => {
    expect(blogVisualSpec).toContain("expectImageLoaded")
    expect(blogVisualSpec).toContain("naturalWidth > 0")
    expect(blogVisualSpec).toContain('section[aria-label="Visual guide"]')
  })
})
