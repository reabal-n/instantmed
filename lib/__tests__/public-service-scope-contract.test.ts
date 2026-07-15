import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import {
  getActiveServices,
  getComingSoonServices,
} from "@/lib/services/service-catalog"

const ACTIVE_SERVICE_IDS = [
  "med-cert",
  "repeat-rx",
  "ed",
  "hair-loss",
  "womens-health",
] as const

const PUBLIC_DECISION_SURFACES = [
  "app/pricing/pricing-content.tsx",
  "app/consult/page.tsx",
  "lib/marketing/service-decisions.ts",
] as const

function sourceFor(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8")
}

function literalHrefs(source: string) {
  const hrefs: string[] = []
  const hrefPattern = /\b(?:href|ctaHref)\s*(?::|=)\s*["'`]([^"'`]+)["'`]/g

  for (const match of source.matchAll(hrefPattern)) {
    hrefs.push(match[1])
  }

  return hrefs
}

function literalActionCopy(source: string) {
  const copy: string[] = []
  const copyPattern = /\b(?:cta|ctaLabel|ctaText)\s*(?::|=)\s*["'`]([^"'`]+)["'`]/g

  for (const match of source.matchAll(copyPattern)) {
    copy.push(match[1])
  }

  return copy
}

function isForbiddenActionCopy(copy: string) {
  if (!/^(?:start|request|get|book|choose)\b/i.test(copy)) return false

  if (/\b(?:general consult(?:ation)?|antibiotics?|weight (?:loss|management))\b/i.test(copy)) {
    return true
  }

  const mentionsConsult = /\bconsult(?:ation)?\b/i.test(copy)
  const namesSpecialty = /\b(?:ED|erectile|hair|women(?:'s)?|UTI|contracept)\b/i.test(copy)
  return mentionsConsult && !namesSpecialty
}

function isAllowedPublicDestination(href: string) {
  const url = new URL(href, "https://instantmed.com.au")

  if (
    url.pathname === "/general-consult" ||
    url.pathname === "/weight-loss" ||
    /^\/antibiotics?(?:\/|$)/.test(url.pathname)
  ) {
    return false
  }

  if (url.pathname !== "/request" || !url.searchParams.has("service")) {
    return true
  }

  const service = url.searchParams.get("service")
  const subtype = url.searchParams.get("subtype")

  if (service === "med-cert") return true
  if (service === "repeat-script") return true

  return (
    service === "consult" &&
    (subtype === "ed" || subtype === "hair_loss" || subtype === "womens_health")
  )
}

describe("public service scope contract", () => {
  it("keeps exactly the five launched service IDs active", () => {
    expect(getActiveServices().map((service) => service.id).sort()).toEqual(
      [...ACTIVE_SERVICE_IDS].sort(),
    )
    expect(getComingSoonServices().map((service) => service.id)).toEqual(["weight-loss"])
  })

  it("keeps pricing and consult actions inside the launched service scope", () => {
    for (const relativePath of PUBLIC_DECISION_SURFACES) {
      const source = sourceFor(relativePath)
      const hrefs = literalHrefs(source)
      const forbiddenHrefs = hrefs.filter((href) => !isAllowedPublicDestination(href))
      const forbiddenCopy = literalActionCopy(source).filter(isForbiddenActionCopy)

      expect(
        forbiddenHrefs,
        `${relativePath} must not action general consult, antibiotics, or weight loss`,
      ).toEqual([])
      expect(
        forbiddenCopy,
        `${relativePath} must not advertise a broad or gated care action`,
      ).toEqual([])
    }
  })

  it("keeps homepage metadata explicit about the focused specialty scope", () => {
    const source = sourceFor("app/(marketing)/page.tsx")

    expect(source).not.toContain("| Consults,")
    expect(source).not.toContain("online doctor consults from")
    expect(source).not.toContain("and online consults.")
    expect(source).toContain("Focused Assessments")
    expect(source).toContain("ED, hair loss, and women's health assessments")
  })

  it("does not make categorical availability claims about every GP clinic", () => {
    const source = sourceFor("app/pricing/pricing-content.tsx")
    const comparisonStart = source.indexOf("const comparisonItems")
    const comparisonEnd = source.indexOf("const pricingFaqs")
    const comparison = source.slice(comparisonStart, comparisonEnd)

    expect(comparisonStart).toBeGreaterThan(-1)
    expect(comparisonEnd).toBeGreaterThan(comparisonStart)
    expect(comparison).not.toContain("Requests can be submitted and reviewed 24/7")
    expect(comparison).not.toContain("Digital delivery if approved")
  })
})
