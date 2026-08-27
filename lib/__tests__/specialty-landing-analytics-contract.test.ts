import { describe, expect, it, vi } from "vitest"

import {
  buildGrowthExperienceRequestHref,
  resolveLandingGrowthExperienceVersion,
} from "@/components/marketing/shared/landing-page-shell"
import { normalizeIncomingGrowthExperienceVersion } from "@/lib/growth/specialty-experience-attribution"
import {
  createLandingAnalyticsTracker,
  createLandingExperienceViewLatch,
} from "@/lib/hooks/use-landing-analytics"

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
})
