import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

/**
 * The codeine 7-day repeat gate must run on EVERY path that can mint a
 * payable Stripe session for a repeat prescription. A gate that lives only in
 * the first-checkout validator leaves retry, guest recovery, and signed guest
 * resume open (the same gap class as the 2026-08-05 dedicated-service leak).
 */
describe("codeine repeat gate coverage", () => {
  const gateImport = 'from "@/lib/stripe/checkout/codeine-repeat-gate"'

  it("runs after auth on the authenticated first checkout, before the service resolve", () => {
    const source = read("lib/stripe/checkout.ts")
    expect(source).toContain(gateImport)
    const gateAt = source.indexOf("evaluateCodeineRepeatGate(")
    expect(gateAt).toBeGreaterThan(source.indexOf("runAuthAndProfile(input)"))
    expect(gateAt).toBeLessThan(source.indexOf("// 4. Resolve service row."))
  })

  it("runs on the guest first checkout once the guest profile is resolved, and on duplicate guest recovery", () => {
    const source = read("lib/stripe/guest-checkout.ts")
    expect(source).toContain(gateImport)
    const firstGateAt = source.indexOf("evaluateCodeineRepeatGate(")
    expect(firstGateAt).toBeGreaterThan(source.indexOf("if (!guestProfileId) {"))
    expect(firstGateAt).toBeLessThan(source.indexOf("// 2. Look up service by slug"))
    const recoveryAt = source.indexOf("evaluateCodeineRepeatGate(", firstGateAt + 1)
    expect(recoveryAt).toBeGreaterThan(source.indexOf("getRepeatScriptRoutingBlock(storedAnswersForSafety)"))
    expect(recoveryAt).toBeLessThan(source.indexOf("const storedSafetyCheck = checkSafetyForServer("))
    expect(source).toContain("resolveGuestPatientIdsForRecency(")
  })

  it("runs on authenticated retry payment after the repeat payload rules", () => {
    const source = read("lib/stripe/checkout/retry-payment.ts")
    expect(source).toContain(gateImport)
    const gateAt = source.indexOf("evaluateCodeineRepeatGate(")
    expect(gateAt).toBeGreaterThan(source.indexOf("validateRepeatScriptPayload(intakeAnswers)"))
    expect(gateAt).toBeLessThan(source.indexOf("checkSafetyForServer(serviceSlugForSafety, intakeAnswers)"))
  })

  it("runs on the signed guest resume link before any payable URL", () => {
    const source = read("lib/stripe/checkout/guest-resume.ts")
    expect(source).toContain(gateImport)
    const gateAt = source.indexOf("evaluateCodeineRepeatGate(")
    expect(gateAt).toBeGreaterThan(source.indexOf("getRepeatScriptRoutingBlock(answers)"))
    expect(gateAt).toBeLessThan(source.indexOf("checkSafetyForServer(serviceSlugForSafety, answers)"))
  })

  it("keeps the review step able to render the dated block without an edit-details CTA", () => {
    const source = read("components/request/steps/review-step.tsx")
    expect(source).toContain("requestAgainOn")
    expect(source).toContain("setRequestAgainOn(")
  })

  it("documents the rule in the clinical doc and the project brain", () => {
    expect(read("docs/CLINICAL.md")).toContain("once every 7 days")
    expect(read("CLAUDE.md")).toContain("codeine-repeat-gate")
    expect(read("AGENTS.md")).toContain("codeine-repeat-gate")
  })
})
