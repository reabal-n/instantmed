import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { getCommercialSeoTrackingTargets } from "@/lib/seo/commercial-intent-tracking"
import { intentPages } from "@/lib/seo/intents"

const ROOT = process.cwd()

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("commercial SEO tracking contract", () => {
  it("derives tracking targets from the published top-25 intent catalogue", () => {
    const targets = getCommercialSeoTrackingTargets()

    expect(targets).toHaveLength(25)
    expect(targets.map((target) => target.slug)).toEqual(intentPages.map((page) => page.slug))
    expect(targets.map((target) => target.priority)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    )

    for (const target of targets) {
      expect(target.url).toBe(`https://instantmed.com.au/intent/${target.slug}`)
      expect(target.primaryQuery.length, target.slug).toBeGreaterThan(5)
      expect(target.alternateQueries.length, target.slug).toBeGreaterThanOrEqual(2)
      expect(target.ctaUrl, target.slug).toMatch(/^\//)
      expect(target.price, target.slug).toMatch(/\$/)
    }
  })

  it("wires a read-only GSC pulse script without URL inspection or submission side effects", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>
    }
    const scriptPath = "tools/gsc-mcp-server/commercial-intent-pulse.mjs"

    expect(packageJson.scripts?.["seo:commercial-pulse"]).toBe(`node ${scriptPath}`)
    expect(existsSync(path.join(ROOT, scriptPath))).toBe(true)

    const script = read(scriptPath)
    expect(script).toContain("searchconsole.searchanalytics.query")
    expect(script).toContain("https://www.googleapis.com/auth/webmasters.readonly")
    expect(script).toContain("getCommercialSeoTrackingTargets")
    expect(script).toContain('args.get("dry-run")')
    expect(script).not.toContain("urlInspection.index.inspect")
    expect(script).not.toContain("urlNotifications.publish")
    expect(script).not.toContain("indexing.urlNotifications")
  })

  it("wires targeted post-deploy URL inspection for commercial intent pages", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>
    }
    const scriptPath = "tools/gsc-mcp-server/commercial-intent-inspect.mjs"

    expect(packageJson.scripts?.["seo:commercial-inspect"]).toBe(`node ${scriptPath}`)
    expect(existsSync(path.join(ROOT, scriptPath))).toBe(true)

    const script = read(scriptPath)
    expect(script).toContain("urlInspection.index.inspect")
    expect(script).toContain("getCommercialSeoTrackingTargets")
    expect(script).toContain("fetchHead")
    expect(script).toContain("canonicalMismatches")
    expect(script).toContain("https://www.googleapis.com/auth/webmasters.readonly")
    expect(script).not.toContain("urlNotifications.publish")
    expect(script).not.toContain("indexing.urlNotifications")
  })

  it("tracks commercial page actions without loading analytics before interaction", () => {
    const tracker = read("components/analytics/commercial-intent-tracker.tsx")
    const intentPage = read("app/intent/[slug]/page.tsx")

    expect(intentPage).toContain("<CommercialIntentTracker")
    expect(intentPage).toContain('data-commercial-intent-event="primary_cta"')
    expect(intentPage).toContain('data-commercial-intent-event="source"')
    expect(intentPage).toContain("data-commercial-intent-price-card")

    expect(tracker).toContain("onFirstInteraction")
    expect(tracker).toContain("commercial_intent_viewed")
    expect(tracker).toContain("commercial_intent_click")
    expect(tracker).toContain("commercial_intent_price_seen")
    expect(tracker).toContain("commercial_intent_scroll_depth")
    expect(tracker).toContain("queuedEventsRef")
  })
})
