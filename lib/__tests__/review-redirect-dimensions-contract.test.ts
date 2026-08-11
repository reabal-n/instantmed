import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Every UTM dimension a live emitter sends through /api/review-redirect must
 * be present in the route's allowlists.
 *
 * `allowedDimension` deliberately rewrites unknown values to a fallback (the
 * redirect must never forward arbitrary caller strings into analytics), which
 * means a missing allowlist token does not error — it silently mislabels.
 * `ReviewAskCard` sent `utm_medium=post_delivery` while `REVIEW_MEDIA` lacked
 * it, so every delivery-surface click was recorded as `review_cta` and the
 * per-surface split the mid-August review checkpoint depends on was fiction.
 * The planned `heard_thanks` source would have hit the same hole.
 *
 * This test extracts the literals from both sides so adding an emitter without
 * its token (or deleting a token still in use) fails here, not in the data.
 */

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

const routeSource = read("app/api/review-redirect/route.ts")

function discoverEmitterFiles(): string[] {
  const discovered: string[] = []

  const visit = (relativeDirectory: string) => {
    for (const entry of readdirSync(join(root, relativeDirectory), { withFileTypes: true })) {
      const relativePath = join(relativeDirectory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") visit(relativePath)
        continue
      }
      if (!/\.(?:ts|tsx)$/.test(entry.name)) continue
      if (relativePath === "app/api/review-redirect/route.ts") continue

      const source = read(relativePath)
      if (source.includes("/api/review-redirect") || source.includes("<ReviewAskCard")) {
        discovered.push(relativePath)
      }
    }
  }

  for (const sourceRoot of ["app", "components", "lib"]) visit(sourceRoot)
  return discovered.sort()
}

/** URL builders plus call sites that supply dimension props to those builders. */
const EMITTER_FILES = discoverEmitterFiles()

function extractSet(name: string): Set<string> {
  const match = routeSource.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`))
  if (!match) throw new Error(`Could not find ${name} in review-redirect route`)
  return new Set(Array.from(match[1]!.matchAll(/"([^"]+)"/g), (m) => m[1]!))
}

function extractEmitted(pattern: RegExp): Set<string> {
  const values = new Set<string>()
  for (const file of EMITTER_FILES) {
    const source = read(file)
    for (const match of source.matchAll(pattern)) values.add(match[1]!)
  }
  return values
}

describe("review-redirect dimension allowlists", () => {
  const sources = extractSet("REVIEW_SOURCES")
  const media = extractSet("REVIEW_MEDIA")
  const campaigns = extractSet("REVIEW_CAMPAIGNS")

  it("discovers every live redirect emitter instead of relying on a hand-maintained inventory", () => {
    expect(EMITTER_FILES).toEqual(expect.arrayContaining([
      "components/patient/review-ask-card.tsx",
      "components/patient/review-nudge-card.tsx",
      "lib/email/components/templates/review-request.tsx",
    ]))
  })

  it("covers every utm_source a live emitter sends", () => {
    // Object-literal params plus <ReviewAskCard source="..."> call sites and
    // inline query strings.
    const emitted = new Set([
      ...extractEmitted(/utm_source[=:]\s*"?([a-z_]+)"?/g),
      ...extractEmitted(/<ReviewAskCard\s+source="([a-z_]+)"/g),
    ])
    emitted.delete("source") // the prop pass-through in review-ask-card itself
    expect(emitted.size).toBeGreaterThan(0)
    for (const value of emitted) {
      expect(sources, `utm_source "${value}" is sent but not allowlisted — it silently becomes "email"`).toContain(value)
    }
  })

  it("covers every utm_medium a live emitter sends", () => {
    const emitted = extractEmitted(/utm_medium[=:]\s*"?([a-z_]+)"?/g)
    expect(emitted.size).toBeGreaterThan(0)
    for (const value of emitted) {
      expect(media, `utm_medium "${value}" is sent but not allowlisted — it silently becomes "review_cta"`).toContain(value)
    }
  })

  it("covers every utm_campaign a live emitter sends", () => {
    const emitted = extractEmitted(/utm_campaign[=:]\s*"?([a-z_]+)"?/g)
    expect(emitted.size).toBeGreaterThan(0)
    for (const value of emitted) {
      expect(campaigns, `utm_campaign "${value}" is sent but not allowlisted — it silently becomes "review"`).toContain(value)
    }
  })

  // The regression this file exists for: the delivery-surface medium must stay
  // distinguishable from the generic CTA fallback.
  it("keeps post_delivery a first-class medium, distinct from the fallback", () => {
    expect(media).toContain("post_delivery")
    expect(media).toContain("review_cta")
  })

  it("covers every destination token the card emits", () => {
    const cardSources = [
      read("components/patient/review-ask-card.tsx"),
      read("components/patient/review-nudge-card.tsx"),
    ]
    const emitted = new Set(cardSources.flatMap((cardSource) =>
      Array.from(cardSource.matchAll(/token: "([a-z_]+)"/g), (m) => m[1]!),
    ))
    expect(emitted.size).toBeGreaterThan(0)
    const routeTokens = routeSource.includes("REVIEW_DESTINATION_URLS")
    expect(routeTokens, "route must resolve destinations from REVIEW_DESTINATION_URLS").toBe(true)
    // Tokens resolve against the constants map; unknown tokens fall back.
    for (const token of emitted) {
      expect(["productreview", "google"], `destination "${token}" is not a known review platform token`).toContain(token)
    }
  })

  it("keeps the unknown-value fallback behaviour (never forwards arbitrary strings)", () => {
    expect(routeSource).toContain("function allowedDimension")
    expect(routeSource).toContain("value && allowed.has(value) ? value : fallback")
  })
})
