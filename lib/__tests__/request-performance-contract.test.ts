import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("request conversion performance contract", () => {
  it("loads request steps in one async hop instead of a step-loader waterfall", () => {
    const stepRouterSource = readFileSync(join(root, "components/request/step-router.tsx"), "utf8")
    const stepLoadersSource = readFileSync(join(root, "components/request/step-loaders.ts"), "utf8")

    expect(stepRouterSource).toContain("loadStepComponent")
    expect(stepRouterSource).toContain("preloadStepComponent")
    expect(stepRouterSource).not.toContain('import("./step-loaders")')
    expect(stepRouterSource).not.toContain('from "./steps/certificate-step"')
    expect(stepRouterSource).toContain("Pick the certificate type, dates, and duration.")
    expect(stepLoadersSource).toContain("stepComponentCache")
    expect(stepLoadersSource).toContain("preloadStepComponent")
  })

  it("defers optional recovery capture out of the first med-cert step bundle", () => {
    const certificateStepSource = readFileSync(
      join(root, "components/request/steps/certificate-step.tsx"),
      "utf8",
    )

    expect(certificateStepSource).toContain("DeferredEarlyRecoveryEmailCard")
    expect(certificateStepSource).toContain(
      'import("@/components/request/shared/early-recovery-email-card")',
    )
    expect(certificateStepSource).toContain("requestIdleCallback")
    expect(certificateStepSource).not.toContain(
      'import { EarlyRecoveryEmailCard } from "@/components/request/shared/early-recovery-email-card"',
    )
  })
})
