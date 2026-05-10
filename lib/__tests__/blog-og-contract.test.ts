import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const blogPageSource = readFileSync(join(process.cwd(), "app", "blog", "[slug]", "page.tsx"), "utf8")
const ogRouteSource = readFileSync(join(process.cwd(), "app", "api", "og", "route.tsx"), "utf8")

describe("blog social image generation", () => {
  it("builds stable blog Open Graph images with a cache-busted social-card URL", () => {
    expect(blogPageSource).toContain('type: "blog"')
    expect(blogPageSource).toContain('variant: "stable-card-v2"')
    expect(blogPageSource).toContain("/api/og?")
    expect(blogPageSource).toContain("twitter")
  })

  it("does not pass WebP article visuals into the edge OG renderer", () => {
    expect(blogPageSource).not.toContain("image: socialVisual")
    expect(blogPageSource).not.toContain('searchParams.get("image")')
    expect(ogRouteSource).not.toContain("<img")
    expect(ogRouteSource).not.toContain("objectFit")
  })

  it("renders a dedicated educational blog-card layout without embedding unsupported WebP assets", () => {
    expect(ogRouteSource).toContain('type === "blog"')
    expect(ogRouteSource).toContain("Doctor reviewed guide")
    expect(ogRouteSource).toContain("Educational only")
    expect(ogRouteSource).toContain("What this guide covers")
    expect(ogRouteSource).toContain("Doctor-reviewed educational article")
  })
})
