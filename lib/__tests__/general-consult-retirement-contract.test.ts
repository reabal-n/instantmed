/**
 * General Consult retirement contract.
 *
 * General Consult was retired publicly on 2026-05-20 (marketing surface) and
 * from application code on 2026-05-25 (this PR). This file pins the deletion
 * across every layer so a future regression — accidental re-add of the
 * subtype, the validator, the case-summary path, the safety rules, or the
 * step component — is caught at CI rather than in production.
 *
 * Three legacy DB rows (2 approved+paid, 1 declined+refunded) pre-date the
 * retirement and remain in the intakes table for audit. They're exempt from
 * the DB CHECK constraint via NOT VALID, but the constraint enforces no NEW
 * inserts can resurrect them.
 *
 * To intentionally bring General Consult back: delete this file, rebuild the
 * step/validator/summary/safety/pricing surfaces, drop the CHECK constraint,
 * and update docs/BUSINESS_PLAN.md to justify the resurrection.
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("general consult retirement contract", () => {
  it("ConsultSubtype type union does not include 'general'", () => {
    const source = read("types/services.ts")
    // Pin the exact union members so a future add is caught either by a
    // typecheck failure or by this string match.
    expect(source).toContain("export type ConsultSubtype =")
    expect(source).toMatch(/'ed'\s*\|\s*'hair_loss'\s*\|\s*'womens_health'\s*\|\s*'weight_loss'/)
    expect(source).not.toMatch(/\|\s*['"]general['"]/)
  })

  it("step registry has no default 'consult' flow with consult-reason-step", () => {
    const source = read("lib/request/step-registry.ts")
    expect(source).not.toContain("'consult-reason-step'")
    expect(source).not.toContain("validateConsultReasonStep")
  })

  it("consult-reason-step component file no longer exists", () => {
    expect(existsSync(join(root, "components/request/steps/consult-reason-step.tsx"))).toBe(false)
  })

  it("step loader registry does not register a consult-reason-step loader", () => {
    const source = read("components/request/step-loaders.ts")
    expect(source).not.toContain("consult-reason-step")
  })

  it("validateConsultReasonStep + consultReasonStepSchema are removed from validation.ts", () => {
    const source = read("lib/request/validation.ts")
    expect(source).not.toContain("validateConsultReasonStep")
    expect(source).not.toContain("consultReasonStepSchema")
  })

  it("ClinicalConsultValidationSubtype union does not include 'general' and validateGeneralConsult is gone", () => {
    const source = read("lib/clinical/consult-validators.ts")
    expect(source).not.toContain("validateGeneralConsult")
    expect(source).not.toMatch(/\|\s*"general"/)
    expect(source).not.toContain('case "general":')
  })

  it("generalSummary helper is removed from case-summary.ts (fallback uses unknownConsultSummary)", () => {
    const source = read("lib/clinical/case-summary.ts")
    expect(source).not.toContain("function generalSummary")
    // The fallback should reference unknownConsultSummary for clarity.
    expect(source).toContain("unknownConsultSummary")
  })

  it("safety rules no longer include any general_* consult rule keyed on consultCategory='general'", () => {
    const source = read("lib/safety/rules.ts")
    // Look for rule definitions, not bare mentions — the retirement comment
    // intentionally names the deleted rule IDs so the diff is searchable.
    expect(source).not.toMatch(/id:\s*['"]general_pregnancy_concern['"]/)
    expect(source).not.toMatch(/id:\s*['"]general_recent_surgery['"]/)
    expect(source).not.toMatch(/id:\s*['"]general_severe_symptoms['"]/)
  })

  it("safety evaluator no longer expands 'general' fallback fields", () => {
    const source = read("lib/safety/evaluate.ts")
    expect(source).not.toContain("subtype === 'general' || category === 'general'")
  })

  it("Stripe price-mapping does not list 'general' as a known subtype", () => {
    const source = read("lib/stripe/price-mapping.ts")
    expect(source).not.toMatch(/['"]general['"]\s*:\s*PRICING\.CONSULT/)
    expect(source).not.toMatch(/['"]general['"]\s*:\s*process\.env\.NEXT_PUBLIC_PRICE_CONSULT/)
  })

  it("unified checkout default-subtype mapping does not assign 'general' to consult", () => {
    const source = read("app/actions/unified-checkout.ts")
    expect(source).not.toMatch(/['"]consult['"]\s*:\s*\{\s*category:\s*['"]consult['"]\s*,\s*subtype:\s*['"]general['"]/)
  })

  it("keeps the obsolete consultation-types catalog removed", () => {
    expect(existsSync(join(root, "lib/data/consultation-types.ts"))).toBe(false)
  })

  it("DB migration enforcing the constraint exists", () => {
    const migration = "supabase/migrations/20260525000000_forbid_general_consult_inserts.sql"
    expect(existsSync(join(root, migration))).toBe(true)
    const source = read(migration)
    expect(source).toContain("intakes_consult_subtype_not_general")
    expect(source).toContain("CHECK (NOT (category = 'consult' AND subtype = 'general'))")
  })

  it("/request page redirects bare consult (no subtype) to the services index", () => {
    const source = read("app/request/page.tsx")
    const nextConfig = read("next.config.mjs")

    expect(source).toContain('redirect("/consult")')
    expect(source).toContain('initialService === "consult" && !initialSubtype')
    expect(nextConfig).toContain('source: "/request"')
    expect(nextConfig).toContain('key: "service"')
    expect(nextConfig).toContain('value: "consult"')
    expect(nextConfig).toContain('missing: [')
    expect(nextConfig).toContain('key: "subtype"')
    expect(nextConfig).toContain('destination: "/consult"')
  })

  it("public and patient-facing prompts do not route people to retired General Consult", () => {
    const sources = [
      read("lib/validation/repeat-script-schema.ts"),
      // app/api/terminology/amt/search was deleted 2026-07-03 (orphaned since
      // the #211 medication-search retirement; held a stale S8 list copy).
      read("app/conditions/page.tsx"),
      read("components/patient/service-selector.tsx"),
      read("components/seo/schemas/medical-business.tsx"),
    ].join("\n")

    expect(sources).not.toMatch(/book a General Consult/i)
    expect(sources).not.toMatch(/Start a general consultation/i)
    expect(sources).not.toMatch(/General Consultation/i)
    expect(sources).not.toMatch(/general consultation, where/i)
  })
})
