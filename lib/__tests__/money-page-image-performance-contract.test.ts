import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"


const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

describe("money-page image performance", () => {
  it("keeps regulatory marks on the Next image optimizer", () => {
    const source = read("components/marketing/regulatory-partners.tsx")

    expect(source).not.toContain("unoptimized")
    expect(source).toContain('sizes={`${item.width}px`}')
  })

  it("keeps educational visuals lazy and sizes them to the padded mobile viewport", () => {
    const source = read("components/blog/article-visuals.tsx")

    expect(source).toContain('imageLoading = "lazy"')
    expect(source).toContain("(max-width: 640px) calc(100vw - 2rem), 768px")
    expect(source).toContain("(max-width: 640px) calc(100vw - 2rem), 620px")
    expect(source.match(/imageAspectClass/g)?.length).toBeGreaterThanOrEqual(3)
    expect(source).not.toContain("width={1280}")
    expect(source).not.toContain("height={1600}")
    expect(source).not.toContain("priority")
  })

  it("loads the brand logo eagerly only when a caller opts in", () => {
    const logo = read("components/shared/brand-logo.tsx")
    const navbar = read("components/shared/navbar.tsx")

    expect(logo).toContain("priority?: boolean")
    expect(logo).toContain("priority = false")
    expect(logo.match(/priority=\{priority\}/g)).toHaveLength(2)
    expect(navbar).toMatch(/<BrandLogo[\s\S]{0,180}\bpriority/)
  })

  it("keeps employer marks inside a fixed 80px image box", () => {
    const source = read("components/shared/employer-logo-marquee.tsx")

    expect(source.match(/sizes="80px"/g)).toHaveLength(2)
    expect(source.match(/h-6 w-20 object-contain/g)).toHaveLength(2)
    expect(source).not.toContain("h-6 w-auto")
  })
})
