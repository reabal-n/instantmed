import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const blogPageSource = readFileSync(join(process.cwd(), "app", "blog", "[slug]", "page.tsx"), "utf8")
const ogRouteSource = readFileSync(join(process.cwd(), "app", "api", "og", "route.tsx"), "utf8")

describe("blog social image generation", () => {
  it("builds blog Open Graph images from the local article visual registry", () => {
    expect(blogPageSource).toContain("getArticleVisualsForRender(slug)")
    expect(blogPageSource).toContain('type: "blog"')
    expect(blogPageSource).toContain("socialVisual")
    expect(blogPageSource).toContain("/api/og?")
    expect(blogPageSource).toContain("twitter")
  })

  it("keeps the OG renderer locked to safe local or InstantMed-hosted images", () => {
    expect(ogRouteSource).toContain("resolveSafeImageUrl")
    expect(ogRouteSource).toContain('searchParams.get("image")')
    expect(ogRouteSource).toContain('parsed.hostname === "instantmed.com.au"')
    expect(ogRouteSource).toContain('parsed.hostname.endsWith(".vercel.app")')
  })

  it("renders a dedicated educational blog-card layout instead of generic acquisition badges", () => {
    expect(ogRouteSource).toContain('type === "blog" && imageUrl')
    expect(ogRouteSource).toContain("Doctor reviewed guide")
    expect(ogRouteSource).toContain("Educational only")
    expect(ogRouteSource).toContain("objectFit: \"contain\"")
  })
})
