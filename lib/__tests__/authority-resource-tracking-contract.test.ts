import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  AUTHORITY_ASSET_SLUGS,
  getAuthorityAsset,
} from "@/lib/authority-assets"
import { getAuthorityResourceTrackingTargets } from "@/lib/seo/authority-resource-tracking"

const ROOT = process.cwd()

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("authority resource tracking contract", () => {
  it("derives one GSC tracking target per published authority asset", () => {
    const targets = getAuthorityResourceTrackingTargets()

    expect(targets.map((target) => target.slug)).toEqual(AUTHORITY_ASSET_SLUGS)
    expect(targets.map((target) => target.priority)).toEqual(
      Array.from({ length: AUTHORITY_ASSET_SLUGS.length }, (_, index) => index + 1),
    )

    for (const target of targets) {
      const asset = getAuthorityAsset(target.slug)

      expect(target.url).toBe(`https://instantmed.com.au/resources/${target.slug}`)
      expect(target.title).toBe(asset?.title)
      expect(target.category).toBe(asset?.category)
      expect(target.outreachAngle.length, target.slug).toBeGreaterThan(20)
      expect(target.naturalAnchor.length, target.slug).toBeGreaterThan(10)
      expect(target.naturalAnchor, target.slug).not.toMatch(/buy|get|cheap|guaranteed/i)
    }
  })

  it("wires a read-only GSC pulse script for the authority resource cluster", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>
    }
    const scriptPath = "tools/gsc-mcp-server/authority-resource-pulse.mjs"

    expect(packageJson.scripts?.["seo:authority-pulse"]).toBe(`node ${scriptPath}`)
    expect(existsSync(path.join(ROOT, scriptPath))).toBe(true)

    const script = read(scriptPath)
    expect(script).toContain("searchconsole.searchanalytics.query")
    expect(script).toContain("searchconsole.urlInspection.index.inspect")
    expect(script).toContain("https://www.googleapis.com/auth/webmasters.readonly")
    expect(script).toContain("getAuthorityResourceTrackingTargets")
    expect(script).toContain('args.get("dry-run")')
    expect(script).not.toContain("urlNotifications.publish")
    expect(script).not.toContain("indexing.urlNotifications")
  })

  it("keeps a compliant authority distribution runbook with page-level targets", () => {
    const docPath = "docs/audits/2026-06-06-authority-distribution-execution.md"

    expect(existsSync(path.join(ROOT, docPath))).toBe(true)

    const doc = read(docPath)

    expect(doc).toContain("pnpm seo:authority-pulse")
    expect(doc).toContain("Submitted 12/12")
    expect(doc).toContain("SourceBottle")
    expect(doc).toContain("Featured")
    expect(doc).toContain("Qwoted")
    expect(doc).toContain("No partner-link outreach")
    expect(doc).toContain("No video or transcript work")
    expect(doc).toContain("no PBNs")

    for (const slug of AUTHORITY_ASSET_SLUGS) {
      expect(doc, `distribution doc should target ${slug}`).toContain(`/resources/${slug}`)
    }

    expect(doc).not.toMatch(/accepted by all employers/i)
    expect(doc).not.toMatch(/guaranteed prescription/i)
    expect(doc).not.toMatch(/paid link package/i)
  })
})
