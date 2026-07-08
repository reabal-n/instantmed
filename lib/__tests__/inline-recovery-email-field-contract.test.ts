import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const fieldSource = readFileSync(
  join(root, "components/request/shared/inline-recovery-email-field.tsx"),
  "utf8",
)

describe("inline recovery email field contract", () => {
  it("stays optional, inline, auto-saving, and free of a secondary Save CTA", () => {
    expect(fieldSource).toContain('data-intake-recovery-email-field="true"')
    expect(fieldSource).toContain('label="Email (optional)"')
    expect(fieldSource).toContain(
      "Optional. We'll save progress and email a resume link if you stop.",
    )
    expect(fieldSource).toContain("AUTO_SAVE_DELAY_MS")
    expect(fieldSource).toContain("setIdentity({ email: nextEmail })")
    expect(fieldSource).toContain('posthog?.capture("early_email_autosaved"')
    expect(fieldSource).toContain('posthog?.capture("early_recovery_email_captured"')
    expect(fieldSource).not.toContain("QuestionCard")
    expect(fieldSource).not.toContain('from "@/components/ui/button"')
    expect(fieldSource).not.toContain(">Save<")
    expect(fieldSource).not.toContain("Save your place")
  })

  it("renders on the first recoverable intake surfaces", () => {
    const expectedCallSites: Array<[string, string]> = [
      ["components/request/steps/certificate-step.tsx", 'stepId="certificate"'],
      ["components/request/steps/ed-goals-step.tsx", 'stepId="ed-goals"'],
      ["components/request/steps/hair-loss-goals-step.tsx", 'stepId="hair-loss-goals"'],
      ["components/request/steps/medication-step.tsx", 'stepId="medication"'],
      ["components/request/steps/womens-health-type-step.tsx", 'stepId="womens-health-type"'],
    ]

    for (const [relativePath, stepId] of expectedCallSites) {
      const source = readFileSync(join(root, relativePath), "utf8")
      expect(source).toContain("InlineRecoveryEmailField")
      expect(source).toContain(stepId)
    }
  })

  it("keeps cert capture above the primary Continue action", () => {
    const source = readFileSync(
      join(root, "components/request/steps/certificate-step.tsx"),
      "utf8",
    )
    const recoveryIndex = source.indexOf("<DeferredInlineRecoveryEmailField")
    const primaryActionIndex = source.indexOf('data-intake-primary-action="true"')

    expect(recoveryIndex).toBeGreaterThan(-1)
    expect(primaryActionIndex).toBeGreaterThan(-1)
    expect(recoveryIndex).toBeLessThan(primaryActionIndex)
  })
})
