/**
 * Acquisition-critical WCAG checks in the app's resolved light and dark
 * themes. Dark mode is activated through next-themes storage; Playwright's
 * OS colour scheme is only a matching fallback.
 *
 * Run: corepack pnpm e2e:a11y
 */

import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

import {
  assertResolvedTheme,
  gotoPublicRoute,
  LEGACY_LIGHT_ROUTES,
  MONEY_ROUTES,
  type MoneyPageTheme,
  seedMoneyPageState,
  walkPublicPageForReveals,
} from "./helpers/money-pages"

type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>

interface StickyTransitionFixture {
  name: string
  path: string
  targetSelector: string
  stickySelector: string
}

const STICKY_TRANSITION_FIXTURES: StickyTransitionFixture[] = [
  {
    name: "pricing sticky CTA",
    path: "/pricing",
    targetSelector: "#pricing-cards",
    stickySelector: ".fixed.bottom-0.left-0.right-0.z-40",
  },
  {
    name: "shared service sticky CTA",
    path: "/medical-certificate",
    targetSelector: "#med-cert-hero-cta",
    stickySelector: '[role="region"][aria-label="Quick purchase"]',
  },
]

async function freezeFreshStickyEntrance(
  page: Page,
  fixture: StickyTransitionFixture,
) {
  return page.evaluate(async ({ targetSelector, stickySelector }) => {
    const target = document.querySelector<HTMLElement>(targetSelector)
    if (!target) throw new Error(`Missing sticky target: ${targetSelector}`)

    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const readTransitionMetrics = (sticky: HTMLElement) => {
      const style = getComputedStyle(sticky)
      let translateY = 0
      if (style.transform !== "none") {
        translateY = new DOMMatrixReadOnly(style.transform).m42
      }
      return {
        height: sticky.getBoundingClientRect().height,
        opacity: style.opacity,
        transform: style.transform,
        translateY,
      }
    }

    // Reset every fixture to the known hidden endpoint first. Pricing unmounts
    // its bar; the shared bar remains mounted, inert, and translated by 100%.
    document.documentElement.style.scrollBehavior = "auto"
    target.scrollIntoView({ block: "center", behavior: "auto" })
    let hiddenFrames = 0
    for (let frame = 0; frame < 180; frame += 1) {
      await nextFrame()
      const sticky = document.querySelector<HTMLElement>(stickySelector)
      const metrics = sticky ? readTransitionMetrics(sticky) : null
      const isHiddenEndpoint =
        !sticky ||
        (sticky.hasAttribute("inert") &&
          metrics !== null &&
          metrics.height > 0 &&
          metrics.translateY >= metrics.height - 1)
      hiddenFrames = isHiddenEndpoint ? hiddenFrames + 1 : 0
      if (hiddenFrames >= 2) break
    }
    if (hiddenFrames < 2) {
      throw new Error(`Could not reset sticky to its hidden endpoint: ${stickySelector}`)
    }

    const targetBottom = target.getBoundingClientRect().bottom + window.scrollY
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    window.scrollTo({ top: Math.min(maxScroll, targetBottom + 64), behavior: "auto" })

    const pausedAnimations: Animation[] = []
    const seenAnimations = new Set<Animation>()
    let stableFrames = 0
    let previousTranslateY: number | null = null
    let observedChangingTransform = false

    for (let frame = 0; frame < 120; frame += 1) {
      await nextFrame()

      const sticky = document.querySelector<HTMLElement>(stickySelector)
      if (!sticky || sticky.hasAttribute("inert")) continue

      const liveMetrics = readTransitionMetrics(sticky)

      const animations = sticky.getAnimations({ subtree: false }).filter((animation) => {
        const duration = animation.effect?.getComputedTiming().duration
        return (
          typeof duration === "number" &&
          Number.isFinite(duration) &&
          duration > 0 &&
          animation.playState !== "finished" &&
          animation.playState !== "idle"
        )
      })

      let discoveredAnimation = false
      for (const animation of animations) {
        if (seenAnimations.has(animation)) continue
        animation.pause()
        seenAnimations.add(animation)
        pausedAnimations.push(animation)
        discoveredAnimation = true
      }

      if (pausedAnimations.length === 0) {
        // Framer can keep percentage transforms on its JS driver instead of
        // exposing a WAAPI animation. Require changing translate values and a
        // position strictly between hidden and settled before freezing it.
        if (
          previousTranslateY !== null &&
          Math.abs(liveMetrics.translateY - previousTranslateY) > 0.25
        ) {
          observedChangingTransform = true
        }
        previousTranslateY = liveMetrics.translateY
        const isIntermediate =
          liveMetrics.translateY > 0.5 &&
          liveMetrics.translateY < liveMetrics.height - 0.5
        if (observedChangingTransform && isIntermediate) {
          sticky.dataset.stickyTransitionLock = "true"
          sticky.style.setProperty("--sticky-transition-transform", liveMetrics.transform)
          sticky.style.setProperty("--sticky-transition-opacity", liveMetrics.opacity)
          const lockStyle = document.createElement("style")
          lockStyle.textContent = `
            [data-sticky-transition-lock="true"] {
              transform: var(--sticky-transition-transform) !important;
              opacity: var(--sticky-transition-opacity) !important;
            }
          `
          document.head.append(lockStyle)
          await nextFrame()
          const frozenMetrics = readTransitionMetrics(sticky)
          return {
            animationCount: 0,
            animatedProperties: ["transform"],
            animationProgress: [],
            height: frozenMetrics.height,
            opacity: frozenMetrics.opacity,
            transform: frozenMetrics.transform,
            translateY: frozenMetrics.translateY,
            inert: false,
            sampledWhileMoving: true,
            startedFromHidden: true,
          }
        }
        continue
      }
      stableFrames = discoveredAnimation ? 0 : stableFrames + 1
      if (stableFrames < 2) continue

      for (const animation of pausedAnimations) {
        const timing = animation.effect?.getComputedTiming()
        if (!timing || typeof timing.duration !== "number") continue
        animation.currentTime = (timing.delay ?? 0) + timing.duration / 2
      }

      await nextFrame()
      const pausedMetrics = readTransitionMetrics(sticky)
      return {
        animationCount: pausedAnimations.length,
        animatedProperties: Array.from(
          new Set(
            pausedAnimations.flatMap((animation) =>
              animation.effect instanceof KeyframeEffect
                ? animation.effect.getKeyframes().flatMap((keyframe) => Object.keys(keyframe))
                : [],
            ),
          ),
        ).sort(),
        animationProgress: pausedAnimations.map((animation) => {
          const timing = animation.effect?.getComputedTiming()
          const currentTime = typeof animation.currentTime === "number" ? animation.currentTime : 0
          if (!timing || typeof timing.duration !== "number" || timing.duration === 0) return 0
          return (currentTime - (timing.delay ?? 0)) / timing.duration
        }),
        height: pausedMetrics.height,
        opacity: pausedMetrics.opacity,
        transform: pausedMetrics.transform,
        translateY: pausedMetrics.translateY,
        inert: sticky.hasAttribute("inert"),
        sampledWhileMoving:
          pausedMetrics.translateY > 0.5 &&
          pausedMetrics.translateY < pausedMetrics.height - 0.5,
        startedFromHidden: true,
      }
    }

    throw new Error(`Could not freeze a fresh sticky entrance: ${stickySelector}`)
  }, fixture)
}

async function runAxe(page: Page, path: string, theme: MoneyPageTheme) {
  await seedMoneyPageState(page, theme)
  await gotoPublicRoute(page, path)
  await assertResolvedTheme(page, theme)
  // Walk every viewport before Axe so intersection-triggered sections are
  // visible and their finite entrances have reached the real final paint.
  // Infinite status indicators remain active; the helper only finishes
  // bounded entrance animations.
  await walkPublicPageForReveals(page)

  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .exclude("#intercom-container")
    .exclude("[data-nextjs-dialog]")
    .analyze()
}

async function assertDarkCanvasPaint(page: Page) {
  const paint = await page.evaluate(() => {
    const probe = document.createElement("div")
    probe.style.cssText = [
      "position:fixed",
      "left:-9999px",
      "width:1px",
      "height:1px",
      "background:var(--background)",
      "color:var(--foreground)",
    ].join(";")
    document.body.append(probe)

    const rootStyle = getComputedStyle(document.documentElement)
    const bodyStyle = getComputedStyle(document.body)
    const probeStyle = getComputedStyle(probe)
    const result = {
      htmlBackground: rootStyle.backgroundColor,
      bodyBackground: bodyStyle.backgroundColor,
      bodyForeground: bodyStyle.color,
      probeBackground: probeStyle.backgroundColor,
      probeForeground: probeStyle.color,
      colorScheme: rootStyle.colorScheme,
    }

    probe.remove()
    return result
  })

  expect(paint.htmlBackground).toBe(paint.probeBackground)
  expect(paint.bodyBackground).toBe(paint.probeBackground)
  expect(paint.htmlBackground).toBe("rgb(11, 17, 32)")
  expect(paint.bodyBackground).toBe("rgb(11, 17, 32)")
  expect(paint.bodyForeground).toBe(paint.probeForeground)
  expect(paint.colorScheme).toContain("dark")
}

function assertNoSeriousViolations(
  name: string,
  results: AxeResults,
  mode: MoneyPageTheme,
) {
  if (results.violations.length > 0) {
    const summary = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      nodes: violation.nodes.length,
      help: violation.helpUrl,
    }))
    // eslint-disable-next-line no-console
    console.log(`[a11y:${mode}] ${name}: ${results.violations.length} violation(s) found`)
    // eslint-disable-next-line no-console
    console.table(summary)
  }

  const serious = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  )

  expect(
    serious,
    `[${mode}] ${name} has ${serious.length} critical/serious violation(s):\n` +
      serious
        .map(
          (violation) =>
            `  - [${violation.impact}] ${violation.id}: ${violation.description} (${violation.nodes.length} nodes)`,
        )
        .join("\n"),
  ).toHaveLength(0)
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`Accessibility — ${theme} money pages`, () => {
    for (const route of MONEY_ROUTES) {
      test(`${route.name} (${route.path})`, async ({ page }) => {
        const results = await runAxe(page, route.path, theme)

        if (theme === "dark") await assertDarkCanvasPaint(page)
        assertNoSeriousViolations(route.name, results, theme)
      })
    }
  })
}

test.describe("Accessibility — retained light-only public pages", () => {
  for (const route of LEGACY_LIGHT_ROUTES) {
    test(`${route.name} (${route.path})`, async ({ page }) => {
      const results = await runAxe(page, route.path, "light")
      assertNoSeriousViolations(route.name, results, "light")
    })
  }
})

test.describe("Accessibility — retained dark auth page", () => {
  test("Sign In (/sign-in)", async ({ page }) => {
    const results = await runAxe(page, "/sign-in", "dark")
    await assertDarkCanvasPaint(page)
    assertNoSeriousViolations("Sign In", results, "dark")
  })
})

test.describe("Accessibility — dynamic sticky states", () => {
  for (const fixture of STICKY_TRANSITION_FIXTURES) {
    test(`${fixture.name} preserves dark contrast during a fresh entrance`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 844 })
      await seedMoneyPageState(page, "dark")
      await gotoPublicRoute(page, fixture.path)
      await assertResolvedTheme(page, "dark")

      const pausedState = await freezeFreshStickyEntrance(page, fixture)
      expect(pausedState.startedFromHidden).toBe(true)
      expect(
        pausedState.animationCount > 0 || pausedState.sampledWhileMoving,
        `${fixture.name} must be sampled before its entrance settles`,
      ).toBe(true)
      expect(pausedState.inert).toBe(false)
      expect(pausedState.animatedProperties).toContain("transform")
      expect(pausedState.translateY).toBeGreaterThan(0.5)
      expect(pausedState.translateY).toBeLessThan(pausedState.height - 0.5)
      if (pausedState.animationCount > 0) {
        expect(
          pausedState.animationProgress.every((progress) => progress >= 0.49 && progress <= 0.51),
          `${fixture.name} paused state:\n${JSON.stringify(pausedState, null, 2)}`,
        ).toBe(true)
      }

      const results = await new AxeBuilder({ page })
        .include(fixture.stickySelector)
        .withRules(["color-contrast"])
        .analyze()
      const stateAfterAxe = await page.locator(fixture.stickySelector).evaluate((element) => {
        const style = getComputedStyle(element)
        return { opacity: style.opacity, transform: style.transform }
      })

      assertNoSeriousViolations(fixture.name, results, "dark")
      expect(pausedState.opacity).toBe("1")
      expect(pausedState.animatedProperties).not.toContain("opacity")
      expect(stateAfterAxe).toEqual({
        opacity: pausedState.opacity,
        transform: pausedState.transform,
      })
    })
  }
})
