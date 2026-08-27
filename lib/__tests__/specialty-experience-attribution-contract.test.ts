import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  canClaimSpecialtyExperienceAtEntry,
  isSpecialtyExperienceClaimContextReady,
  normalizeIncomingGrowthExperienceVersion,
  normalizePersistedGrowthExperienceVersion,
  resolveSpecialtyExperienceEntryClaim,
  selectGrowthExperienceVersion,
} from "@/lib/growth/specialty-experience-attribution"

const root = process.cwd()

function source(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

function filesUnder(path: string): string[] {
  const absolute = join(root, path)
  return readdirSync(absolute).flatMap((entry) => {
    const child = join(absolute, entry)
    return statSync(child).isDirectory()
      ? filesUnder(join(path, entry))
      : [child]
  })
}

describe("specialty experience attribution", () => {
  it("claims a tagged fresh entry without letting existing patient work be relabelled", () => {
    expect(
      canClaimSpecialtyExperienceAtEntry({
        hasExplicitRecovery: false,
        hasAuthoritativePatientWork: false,
      }),
    ).toBe(true)

    expect(
      canClaimSpecialtyExperienceAtEntry({
        hasExplicitRecovery: true,
        hasAuthoritativePatientWork: false,
      }),
    ).toBe(false)
    expect(
      canClaimSpecialtyExperienceAtEntry({
        hasExplicitRecovery: false,
        hasAuthoritativePatientWork: true,
      }),
    ).toBe(false)
  })

  it("resolves only a valid tagged fresh entry after hydrated ownership is known", () => {
    const hairContext = { serviceType: "consult", subtype: "hair_loss" }
    const freshEntry = {
      hasExplicitRecovery: false,
      hasAuthoritativePatientWork: false,
    }

    expect(
      resolveSpecialtyExperienceEntryClaim("spx_h1_20260828", hairContext, freshEntry),
    ).toBe("spx_h1_20260828")
    expect(
      resolveSpecialtyExperienceEntryClaim(undefined, hairContext, freshEntry),
    ).toBeNull()
    expect(
      resolveSpecialtyExperienceEntryClaim("spx_e1_20260828", hairContext, freshEntry),
    ).toBeNull()
    expect(
      resolveSpecialtyExperienceEntryClaim("spx_h1_20260828", hairContext, {
        hasExplicitRecovery: false,
        hasAuthoritativePatientWork: true,
      }),
    ).toBeNull()
    expect(
      resolveSpecialtyExperienceEntryClaim("spx_h1_20260828", hairContext, {
        hasExplicitRecovery: true,
        hasAuthoritativePatientWork: false,
      }),
    ).toBeNull()
  })

  it("waits to claim until the active store has the matching specialty subtype", () => {
    expect(
      isSpecialtyExperienceClaimContextReady("spx_h1_20260828", {
        serviceType: "consult",
        subtype: undefined,
      }),
    ).toBe(false)
    expect(
      isSpecialtyExperienceClaimContextReady("spx_h1_20260828", {
        serviceType: "consult",
        subtype: "hair_loss",
      }),
    ).toBe(true)
    expect(
      isSpecialtyExperienceClaimContextReady("spx_h1_20260828", {
        serviceType: "consult",
        subtype: "ed",
      }),
    ).toBe(false)
  })

  it("claims only a current service-matched specialty landing token", () => {
    expect(
      normalizeIncomingGrowthExperienceVersion("spx_h1_20260828", {
        serviceType: "consult",
        subtype: "hair_loss",
      }),
    ).toBe("spx_h1_20260828")
    expect(
      normalizeIncomingGrowthExperienceVersion("spx_e1_20260828", {
        serviceType: "consult",
        subtype: "ed",
      }),
    ).toBe("spx_e1_20260828")

    expect(
      normalizeIncomingGrowthExperienceVersion("spx_h1_20260828", {
        serviceType: "consult",
        subtype: "ed",
      }),
    ).toBeNull()
    expect(
      normalizeIncomingGrowthExperienceVersion("spx_h2_20260828", {
        serviceType: "consult",
        subtype: "hair_loss",
      }),
    ).toBeNull()
    expect(
      normalizeIncomingGrowthExperienceVersion("spx_h3_20260828", {
        serviceType: "consult",
        subtype: "hair_loss",
      }),
    ).toBeNull()
    expect(
      normalizeIncomingGrowthExperienceVersion("spx_e3_20260828", {
        serviceType: "consult",
        subtype: "ed",
      }),
    ).toBeNull()
    expect(
      normalizeIncomingGrowthExperienceVersion("patient@example.com", {
        serviceType: "consult",
        subtype: "hair_loss",
      }),
    ).toBeNull()
    expect(
      normalizeIncomingGrowthExperienceVersion(undefined, {
        serviceType: "consult",
        subtype: "hair_loss",
      }),
    ).toBeNull()
  })

  it("keeps a valid stored cohort ahead of a later candidate", () => {
    const context = { serviceType: "consult", subtype: "hair_loss" }

    expect(
      selectGrowthExperienceVersion({
        storedValue: "spx_h1_20260828",
        candidateValue: "spx_e1_20260828",
        context,
      }),
    ).toBe("spx_h1_20260828")
    expect(
      selectGrowthExperienceVersion({
        storedValue: null,
        candidateValue: "spx_h1_20260828",
        context,
      }),
    ).toBe("spx_h1_20260828")
    expect(
      normalizePersistedGrowthExperienceVersion("spx_h1_20260828", context),
    ).toBe("spx_h1_20260828")
    expect(
      normalizePersistedGrowthExperienceVersion("spx_e1_20260828", context),
    ).toBeNull()
    expect(
      normalizePersistedGrowthExperienceVersion("spx_h3_20260828", context),
    ).toBeNull()
    expect(
      selectGrowthExperienceVersion({
        storedValue: null,
        candidateValue: "spx_h3_20260828",
        context,
      }),
    ).toBeNull()

    // A non-null persisted slot remains authoritative even if it no longer
    // normalizes under the current registry/service context. Fail open to null
    // rather than silently reassigning the flow from a later client value.
    expect(
      selectGrowthExperienceVersion({
        storedValue: "spx_removed_20260828",
        candidateValue: "spx_h1_20260828",
        context,
      }),
    ).toBeNull()
    expect(
      selectGrowthExperienceVersion({
        storedValue: "spx_e1_20260828",
        candidateValue: "spx_h1_20260828",
        context,
      }),
    ).toBeNull()
  })

  it("uses strict incoming normalization at every fresh server trust boundary", () => {
    const draftRoute = source("app/api/draft/route.ts")
    const unifiedCheckout = source("app/actions/unified-checkout.ts")
    const authenticatedCheckout = source("lib/stripe/checkout.ts")
    const guestCheckout = source("lib/stripe/guest-checkout.ts")

    for (const [path, boundarySource] of [
      ["app/api/draft/route.ts", draftRoute],
      ["app/actions/unified-checkout.ts", unifiedCheckout],
      ["lib/stripe/checkout.ts", authenticatedCheckout],
      ["lib/stripe/guest-checkout.ts", guestCheckout],
    ] as const) {
      expect(boundarySource, path).toContain("normalizeIncomingGrowthExperienceVersion")
    }

    expect(draftRoute).toMatch(
      /normalizeIncomingGrowthExperienceVersion\(\s*body\.growthExperienceVersion/,
    )
    expect(unifiedCheckout).toMatch(
      /normalizeIncomingGrowthExperienceVersion\(\s*input\.growthExperienceVersion/,
    )
    expect(authenticatedCheckout).toMatch(
      /normalizeIncomingGrowthExperienceVersion\(\s*input\.growthExperienceVersion/,
    )
    expect(guestCheckout).toMatch(
      /normalizeIncomingGrowthExperienceVersion\(\s*input\.growthExperienceVersion/,
    )
  })

  it("adds constrained non-clinical columns with database-owned set-once rules", () => {
    const migration = source(
      "supabase/migrations/20260828090000_specialty_experience_attribution.sql",
    ).toLowerCase()

    expect(migration).toContain("alter table public.partial_intakes")
    expect(migration).toContain("alter table public.intakes")
    expect(migration.match(/growth_experience_version/g)?.length).toBeGreaterThan(8)
    expect(migration).toContain("char_length(growth_experience_version) <= 64")
    expect(migration).toContain("growth_experience_version ~ '^spx_[a-z0-9_]+$'")
    expect(migration).toContain("non-clinical")
    expect(migration).toContain("preserve_partial_intake_growth_experience")
    expect(migration).toMatch(/coalesce\(\s*old\.growth_experience_version/)
    expect(migration).toContain("enforce_intake_growth_experience_immutable")
    expect(migration).toContain("new.growth_experience_version is distinct from old.growth_experience_version")
  })

  it("never puts the marker into clinical summaries, prompts, email, or Parchment payloads", () => {
    const forbiddenRoots = ["lib/clinical", "lib/ai", "lib/email", "lib/parchment"]
    const offenders = forbiddenRoots.flatMap(filesUnder).filter((path) =>
      /growth_experience_version|growthExperienceVersion/.test(readFileSync(path, "utf8")),
    )

    expect(offenders).toEqual([])
  })
})
