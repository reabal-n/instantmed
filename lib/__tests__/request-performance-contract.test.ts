import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("request conversion performance contract", () => {
  const stepRouterSource = readFileSync(join(root, "components/request/step-router.tsx"), "utf8")
  const stepLoadersSource = readFileSync(join(root, "components/request/step-loaders.ts"), "utf8")
  const stepComponentsSource = readFileSync(
    join(root, "components/request/step-components.tsx"),
    "utf8",
  )
  const requestFlowSource = readFileSync(
    join(root, "components/request/request-flow.tsx"),
    "utf8",
  )

  it("registers every step as a next/dynamic component so the first step SSRs + preloads from <head>", () => {
    // Parse the loader registry: it is the canonical list of step chunks.
    const loaderEntries = [...stepLoadersSource.matchAll(/'([a-z-]+)': \(\) => import\("\.\/steps\/([a-z-]+)"\)/g)]
    expect(loaderEntries.length).toBeGreaterThanOrEqual(19)

    for (const [, key, file] of loaderEntries) {
      // Each loader key must have a matching dynamic() entry with a LITERAL
      // import of the same module — Next's SWC transform needs the literal
      // to emit the SSR module reference + chunk preload.
      expect(stepComponentsSource).toContain(
        `"${key}": dynamic<StepComponentProps>(() => import("./steps/${file}")`,
      )
    }

    // SSR must stay ON (it is next/dynamic's default): ssr:false would pull
    // the first step's markup back out of the initial HTML and its chunk out
    // of the head preload list — the exact waterfall this contract exists to
    // prevent.
    expect(stepComponentsSource).not.toContain("ssr: false")
    expect(stepComponentsSource).not.toContain("ssr:false")
    expect(stepComponentsSource).toContain("Pick the certificate type, dates, and duration.")
  })

  it("renders steps straight from the dynamic registry instead of a client-only load-state waterfall", () => {
    expect(stepRouterSource).toContain('from "./step-components"')
    expect(stepRouterSource).toContain("stepComponents[componentPath]")
    // The idle next-step prefetch stays: Continue should never pay a fresh
    // chunk round-trip mid-funnel.
    expect(stepRouterSource).toContain("preloadStepComponent(nextComponentPath)")
    // The old manual chunk-state machinery must not come back — it kept the
    // form client-only and serialized chunk fetch behind hydration.
    // (negative lookbehind: preloadStepComponent legitimately stays)
    expect(stepRouterSource).not.toMatch(/(?<!pre)loadStepComponent/)
    expect(stepRouterSource).not.toContain("setLoadedStep")
    expect(stepLoadersSource).toContain("stepComponentCache")
    expect(stepLoadersSource).toContain("preloadStepComponent")
  })

  it("kicks off the first step's chunk fetch at client-module evaluation (pre-hydration)", () => {
    expect(requestFlowSource).toContain("queueMicrotask")
    expect(requestFlowSource).toContain("preloadStepComponent(firstStepComponent)")
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
