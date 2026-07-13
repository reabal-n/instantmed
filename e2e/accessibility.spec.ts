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
