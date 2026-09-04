import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

function findMdxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return findMdxFiles(absolutePath)
    return entry.isFile() && entry.name.endsWith(".mdx") ? [absolutePath] : []
  })
}

function staticLinkDestinations(source: string): string[] {
  const destinations: string[] = []

  for (const match of source.matchAll(/\]\(\s*(?:<([^>]+)>|([^\s)]+))/g)) {
    destinations.push(match[1] ?? match[2])
  }

  for (const match of source.matchAll(/\bhref\s*=\s*(?:\{\s*)?["'`]([^"'`]+)["'`](?:\s*\})?/g)) {
    destinations.push(match[1])
  }

  return destinations
}

function instantMedPath(destination: string): string | null {
  if (destination.startsWith("/")) return destination.split(/[?#]/, 1)[0]

  try {
    const url = new URL(destination)
    if (!["instantmed.com.au", "www.instantmed.com.au"].includes(url.hostname)) return null
    return url.pathname
  } catch {
    return null
  }
}

function isGuideAcquisitionDestination(destination: string): boolean {
  const pathname = instantMedPath(destination)
  return (
    pathname === "/prescriptions" ||
    pathname?.startsWith("/prescriptions/") === true ||
    pathname === "/request" ||
    pathname?.startsWith("/request/") === true
  )
}

describe("health-guide acquisition link contract", () => {
  it("keeps blog guide bodies and their shared template free of prescription/request destinations", () => {
    const guideFiles = findMdxFiles(path.join(ROOT, "content", "blog"))
    const templatePath = path.join(ROOT, "components", "blog", "article-template.tsx")

    for (const absolutePath of [...guideFiles, templatePath]) {
      const relativePath = path.relative(ROOT, absolutePath)
      const forbidden = staticLinkDestinations(read(relativePath)).filter(
        isGuideAcquisitionDestination,
      )

      expect(forbidden, relativePath).toEqual([])
    }
  })

  it("keeps the non-guide permission separate from the guide-body prohibition", () => {
    const policy = read("docs/SEO_CONTENT_POLICY.md")

    expect(policy).toContain(
      "Medicine, condition, symptom, and other non-guide educational surfaces may link neutrally",
    )
    expect(policy).toContain(
      "Health guide bodies in `content/blog/*.mdx` do not inherit this permission.",
    )
    expect(policy).toContain(
      "never to `/prescriptions`, `/request`, or another acquisition surface.",
    )
  })

  it("pins the existing neutral prescription link on non-guide educational surfaces", () => {
    const onlinePrescriptions = read("components/marketing/online-prescriptions-landing.tsx")
    const conditionPage = read("app/conditions/[slug]/page.tsx")
    const symptomPage = read("app/symptoms/[slug]/page.tsx")

    expect(onlinePrescriptions.match(/"\/prescriptions"/g)).toHaveLength(1)
    expect(onlinePrescriptions).toContain('const MONEY_PAGE_HREF = "/prescriptions"')
    expect(onlinePrescriptions).toContain("href: MONEY_PAGE_HREF")
    expect(onlinePrescriptions).toContain("href={item.href}")
    expect(onlinePrescriptions).toContain("Repeat prescription service")

    const conditionLinks = conditionPage.match(/<Link\s+href="\/prescriptions"[^>]*>/g) ?? []
    expect(conditionLinks).toHaveLength(1)
    expect(conditionLinks[0]).not.toMatch(/rel=["'][^"']*nofollow/i)
    expect(conditionPage).toContain("repeat prescription")

    const symptomLinks = symptomPage.match(/<Link\s+href="\/prescriptions"[^>]*>/g) ?? []
    expect(symptomLinks).toHaveLength(2)
    expect(symptomLinks.every((link) => !/rel=["'][^"']*nofollow/i.test(link))).toBe(true)
    expect(symptomPage).toContain("Repeat prescriptions")
  })
})
