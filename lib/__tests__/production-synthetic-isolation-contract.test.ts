import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const isolationHelperPath = join(
  root,
  "e2e/helpers/production-synthetic-isolation.ts",
)
const syntheticSpecPath = join(root, "e2e/prod-request-flow-synthetic.spec.ts")
const recoverySourcePath = join(root, "lib/email/partial-intake-recovery.ts")
const recoveryPolicySourcePath = join(
  root,
  "lib/email/partial-intake-recovery-policy.ts",
)

describe("production request-flow synthetic isolation", () => {
  it("keeps browser checks from writing server drafts or analytics", () => {
    expect(existsSync(isolationHelperPath)).toBe(true)

    const helperSource = readFileSync(isolationHelperPath, "utf8")
    expect(helperSource).toContain('page.route("**/api/draft**"')
    expect(helperSource).toContain('page.route("**/ingest/**"')
    expect(helperSource).toContain("route.fulfill")
    expect(helperSource).not.toContain("route.continue")
    expect(helperSource).not.toContain("route.fallback")

    const syntheticSpecSource = readFileSync(syntheticSpecPath, "utf8")
    expect(syntheticSpecSource).toContain(
      "installProductionSyntheticIsolation(page)",
    )
    expect(syntheticSpecSource).toContain("instantmed-server-draft-")
  })

  it("keeps known test identities out of partial-intake recovery", () => {
    const recoverySource = readFileSync(recoverySourcePath, "utf8")
    const recoveryPolicySource = readFileSync(recoveryPolicySourcePath, "utf8")

    expect(recoveryPolicySource).toContain("isLikelyTestPatientIdentity")
    expect(recoveryPolicySource).toContain('suppressed("test_identity")')
    expect(recoverySource).toContain("Skipping recovery email - test identity")
    expect(recoverySource).toContain("testSkipped")
  })
})
