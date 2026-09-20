import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

import {
  createLandingAnalyticsTracker,
  createLandingExperienceViewLatch,
} from "@/lib/analytics/landing-analytics"
import { normalizeIncomingGrowthExperienceVersion } from "@/lib/growth/specialty-experience-attribution"
import {
  buildGrowthExperienceRequestHref,
  resolveAvailableLandingGrowthExperienceVersion,
  resolveLandingGrowthExperienceVersion,
} from "@/lib/growth/specialty-landing"

const STICKY_CTA_COMPONENT = "components/marketing/shared/sticky-cta.tsx"

function listTsxFiles(roots: string[]): string[] {
  const files: string[] = []
  const walk = (relativeDirectory: string) => {
    for (const entry of readdirSync(join(process.cwd(), relativeDirectory), { withFileTypes: true })) {
      const relativePath = join(relativeDirectory, entry.name)
      if (entry.isDirectory()) walk(relativePath)
      else if (entry.name.endsWith(".tsx")) files.push(relativePath)
    }
  }
  for (const root of roots) walk(root)
  return files.sort()
}

describe("specialty landing analytics", () => {
  it("uses the code-owned active landing version for each specialty", () => {
    expect(resolveLandingGrowthExperienceVersion("hair_loss", "spx_h1_20260828")).toBe(
      "spx_h1_20260828",
    )
    expect(resolveLandingGrowthExperienceVersion("ed", "spx_e1_20260828")).toBe(
      "spx_e1_20260828",
    )
    expect(resolveLandingGrowthExperienceVersion("hair_loss", "spx_e1_20260828")).toBeNull()
    expect(resolveLandingGrowthExperienceVersion("ed", "spx_e2_20260828")).toBeNull()
  })

  it("emits one best-effort view and carries the same opaque version on landing events", () => {
    const capture = vi.fn()
    const analytics = createLandingAnalyticsTracker({
      service: "hair-loss",
      growthExperienceVersion: "spx_h1_20260828",
      capture,
    })

    analytics.trackLandingExperienceViewed()
    analytics.trackLandingExperienceViewed()
    analytics.trackCTAClick("hero")
    analytics.trackFAQOpen("How does this work?", 0)
    analytics.trackSectionView("assessment-model")
    analytics.trackScrollDepth(25)

    expect(capture).toHaveBeenCalledTimes(5)
    expect(capture).toHaveBeenNthCalledWith(1, "landing_experience_viewed", {
      service: "hair-loss",
      growth_experience_version: "spx_h1_20260828",
    })
    expect(capture.mock.calls.slice(1).map(([, properties]) => properties)).toEqual([
      expect.objectContaining({ growth_experience_version: "spx_h1_20260828" }),
      expect.objectContaining({ growth_experience_version: "spx_h1_20260828" }),
      expect.objectContaining({ growth_experience_version: "spx_h1_20260828" }),
      expect.objectContaining({ growth_experience_version: "spx_h1_20260828" }),
    ])
    expect(capture.mock.calls[2]?.[1]).not.toHaveProperty("question")
  })

  it("waits for the lazy PostHog client before consuming the landing-view event", () => {
    const capture = vi.fn()
    const viewLatch = createLandingExperienceViewLatch({
      service: "hair-loss",
      growthExperienceVersion: "spx_h1_20260828",
    })

    viewLatch.track(null)
    viewLatch.track(capture)
    viewLatch.track(capture)

    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledWith("landing_experience_viewed", {
      service: "hair-loss",
      growth_experience_version: "spx_h1_20260828",
    })
  })

  it("emits no versioned events until availability resolves enabled, then one view", () => {
    const capture = vi.fn()
    const unavailableAnalytics = createLandingAnalyticsTracker({
      service: "hair-loss",
      growthExperienceVersion: "spx_h1_20260828",
      capture,
      enabled: false,
    })

    unavailableAnalytics.trackLandingExperienceViewed()
    unavailableAnalytics.trackCTAClick("hero")
    unavailableAnalytics.trackFAQOpen("How does this work?", 0)
    unavailableAnalytics.trackSectionView("assessment-model")
    unavailableAnalytics.trackScrollDepth(25)
    expect(capture).not.toHaveBeenCalled()

    const enabledAnalytics = createLandingAnalyticsTracker({
      service: "hair-loss",
      growthExperienceVersion: "spx_h1_20260828",
      capture,
      enabled: true,
    })
    enabledAnalytics.trackLandingExperienceViewed()
    enabledAnalytics.trackLandingExperienceViewed()

    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledWith("landing_experience_viewed", {
      service: "hair-loss",
      growth_experience_version: "spx_h1_20260828",
    })
  })

  it("never lets an analytics failure interrupt a CTA action", () => {
    const analytics = createLandingAnalyticsTracker({
      service: "ed",
      growthExperienceVersion: "spx_e1_20260828",
      capture: () => {
        throw new Error("analytics unavailable")
      },
    })

    expect(() => analytics.trackCTAClick("hero")).not.toThrow()
  })

  it("adds only a validated landing token to internal request CTAs", () => {
    expect(
      buildGrowthExperienceRequestHref(
        "/request?service=consult&subtype=hair_loss&intent=existing#start",
        "spx_h1_20260828",
      ),
    ).toBe(
      "/request?service=consult&subtype=hair_loss&intent=existing&growth_experience_version=spx_h1_20260828#start",
    )
    expect(
      buildGrowthExperienceRequestHref("/request?service=consult&subtype=ed", "spx_h1_20260828"),
    ).toBe("/request?service=consult&subtype=ed")
    expect(
      buildGrowthExperienceRequestHref("https://example.com/request?service=consult", "spx_h1_20260828"),
    ).toBe("https://example.com/request?service=consult")
    for (const href of [
      "http://instantmed.local/request?service=consult&subtype=hair_loss",
      "https://instantmed.local/request?service=consult&subtype=hair_loss",
      "//instantmed.local/request?service=consult&subtype=hair_loss",
      "https://",
      "/request?service=consult&subtype=%",
    ]) {
      expect(buildGrowthExperienceRequestHref(href, "spx_h1_20260828")).toBe(href)
    }
  })

  it("keeps pending and unavailable clicks untagged without delaying enabled clicks", () => {
    const version = "spx_h1_20260828" as const

    expect(
      resolveAvailableLandingGrowthExperienceVersion(version, {
        isDisabled: false,
        isLoading: true,
      }),
    ).toBeNull()
    expect(
      resolveAvailableLandingGrowthExperienceVersion(version, {
        isDisabled: true,
        isLoading: false,
      }),
    ).toBeNull()
    expect(
      resolveAvailableLandingGrowthExperienceVersion(version, {
        isDisabled: false,
        isLoading: false,
      }),
    ).toBe(version)
  })

  it("leaves invalid incoming tokens unassigned while the request boundary keeps stored cohorts authoritative", () => {
    expect(
      normalizeIncomingGrowthExperienceVersion("spx_h1_20260828", {
        serviceType: "consult",
        subtype: "ed",
      }),
    ).toBeNull()
    expect(
      normalizeIncomingGrowthExperienceVersion("unknown", {
        serviceType: "consult",
        subtype: "hair_loss",
      }),
    ).toBeNull()
  })

  it("gates the landing hook on resolved availability", () => {
    const shell = readFileSync(
      join(process.cwd(), "components/marketing/shared/landing-page-shell.tsx"),
      "utf8",
    )

    expect(shell).toContain("!isLoading && !isDisabled")
    expect(shell).toContain("availableGrowthExperienceVersion")
    expect(shell).toMatch(
      /useLandingAnalytics\(\s*config\.analyticsId,\s*availableGrowthExperienceVersion,\s*analyticsEnabled,?\s*\)/,
    )
    expect(shell).toMatch(
      /buildGrowthExperienceRequestHref\(\s*config\.sticky\.ctaHref,\s*availableGrowthExperienceVersion,?\s*\)/,
    )
  })

  it("keeps disabled-service contact fallbacks operable", () => {
    for (const path of [
      "components/marketing/shared/sticky-cta.tsx",
      "components/marketing/erectile-dysfunction-landing.tsx",
      "components/marketing/hair-loss-landing.tsx",
      "components/marketing/sections/how-it-works-inline.tsx",
    ]) {
      const component = readFileSync(join(process.cwd(), path), "utf8")
      expect(component, path).toContain('isDisabled ? "/contact"')
      expect(component, path).not.toContain("disabled={isDisabled}")
    }
  })

  it("gives every sticky bar the kill-switch fallback", () => {
    // Discovered from the tree, not hand-listed: a new bar that forgets the prop
    // keeps offering a live request link while the platform is in maintenance.
    const consumers = listTsxFiles(["app", "components"]).filter(
      (path) => path !== STICKY_CTA_COMPONENT && readFileSync(join(process.cwd(), path), "utf8").includes("<StickyCTA")
    )
    expect(consumers.length).toBeGreaterThanOrEqual(5)
    for (const path of consumers) {
      const component = readFileSync(join(process.cwd(), path), "utf8")
      expect(component, `${path} must pass isDisabled to StickyCTA so maintenance mode swaps the request link for the contact action`).toContain("isDisabled=")
    }
  })
})
