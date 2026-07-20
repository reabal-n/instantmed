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
    // Floor re-baselined 19 -> 18 on 2026-07-17: P2.1 merged
    // medication-history-step into medication-step. Re-baselined 18 -> 17 on
    // 2026-07-19: the IIEF-5 ed-assessment-step was absorbed into
    // ed-goals-step. This guards against silently LOSING a registration, so it
    // only moves with a deliberate step-count change.
    expect(loaderEntries.length).toBeGreaterThanOrEqual(17)

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
    expect(stepComponentsSource).toContain('"Certificate type"')
    expect(stepComponentsSource).toContain('"How many days?"')
    expect(stepComponentsSource).toContain('"Starting from?"')
    expect(stepComponentsSource).toContain('"What symptoms are you having?"')
    expect(stepComponentsSource).toContain('"How long have you felt unwell?"')
  })

  it("renders steps straight from the dynamic registry instead of a client-only load-state waterfall", () => {
    expect(stepRouterSource).toContain('from "./step-components"')
    expect(stepRouterSource).toContain("stepComponents[componentPath]")
    // The idle next-step prefetch stays: Continue should never pay a fresh
    // chunk round-trip mid-funnel.
    expect(stepRouterSource).toContain("preloadStepComponent(nextComponentPath)")
    expect(stepRouterSource).toContain('requestIdleCallback(kick, { timeout: 1500 })')
    // The old manual chunk-state machinery must not come back — it kept the
    // form client-only and serialized chunk fetch behind hydration.
    // (negative lookbehind: preloadStepComponent legitimately stays)
    expect(stepRouterSource).not.toMatch(/(?<!pre)loadStepComponent/)
    expect(stepRouterSource).not.toContain("setLoadedStep")
    expect(stepLoadersSource).toContain("stepComponentCache")
    expect(stepLoadersSource).toContain("preloadStepComponent")
  })

  it("keeps med-cert step intros mounted while their control chunks resolve", () => {
    expect(stepRouterSource).toContain('new Set(["certificate-step", "symptoms-step"])')
    expect(stepComponentsSource).toContain('stepLoadingFallback("symptoms-step", false)')
    expect(stepRouterSource).toContain('state.answers.certType === "carer"')
    expect(stepRouterSource).toContain('titleOverride={persistentIntroTitle}')
  })

  it("kicks off the first step's chunk fetch at client-module evaluation (pre-hydration)", () => {
    expect(requestFlowSource).toContain("queueMicrotask")
    expect(requestFlowSource).toContain("preloadStepComponent(firstStepComponent)")
  })

  it("resolves a specialty URL into the first consult step before draft hydration", () => {
    // The server already validated initialSubtype. It must participate in the
    // first render instead of waiting for the post-mount URL-seeding effect;
    // otherwise ED, hair-loss, and women's-health entries paint a full-page
    // spinner before their real first step.
    expect(requestFlowSource).toContain("resolveInitialStepAnswers")
    expect(requestFlowSource).toContain("const resolvedStepAnswers = useMemo(")
    expect(requestFlowSource.match(/answers: resolvedStepAnswers/g) ?? []).toHaveLength(2)
    expect(requestFlowSource).toContain("currentStepId: visibleStepId")
  })

  it("keeps the rendered specialty step mounted while the store normalises its step id", () => {
    expect(requestFlowSource).toContain(
      "const visibleStepId = currentStep?.id ?? currentStepId",
    )
    expect(requestFlowSource).toContain("}, [visibleStepId])")
    expect(requestFlowSource).toContain("<div key={visibleStepId}>")
    expect(requestFlowSource).toContain("currentStepId={visibleStepId}")
  })

  it("does not let pre-hydration step repair displace a restored draft", () => {
    // Specialty URLs now resolve an active first step in the initial render.
    // The invalid-step repair effect must still wait for hydration: otherwise
    // its stale first-render closure can run after rehydrate() merges a saved
    // ED/hair/women's-health step and reset that draft back to step one.
    expect(requestFlowSource).toContain(
      "if (!hydrated || editModeStep) return",
    )
  })
})
