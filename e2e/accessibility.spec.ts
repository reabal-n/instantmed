/**
 * Accessibility E2E Tests (WCAG 2.1 AA)
 *
 * Uses @axe-core/playwright to detect accessibility violations on key pages.
 * Runs in both light and dark colour schemes.
 *
 * Run: pnpm e2e:a11y
 */

import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>

// Full page list — audited in light mode
const PAGES = [
  { name: "Homepage", path: "/" },
  { name: "Medical Certificate", path: "/medical-certificate" },
  { name: "Prescriptions", path: "/prescriptions" },
  { name: "Hair Loss", path: "/hair-loss" },
  { name: "Erectile Dysfunction", path: "/erectile-dysfunction" },
  { name: "FAQ", path: "/faq" },
  { name: "Contact", path: "/contact" },
  { name: "Pricing", path: "/pricing" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Request Flow", path: "/request" },
  { name: "Sign In", path: "/sign-in" },
]

// Subset checked in dark mode — marketing critical path + high-contrast risk pages
const DARK_MODE_PAGES = [
  { name: "Homepage", path: "/" },
  { name: "Pricing", path: "/pricing" },
  { name: "Request Flow", path: "/request" },
  { name: "Hair Loss", path: "/hair-loss" },
  { name: "Sign In", path: "/sign-in" },
]

async function runAxe(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })

  // Dismiss cookie banner if present
  const acceptBtn = page.getByRole("button", { name: /accept all/i })
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click()
  }

  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude("#intercom-container")
    .exclude("[data-nextjs-dialog]")
    .analyze()
}

function assertNoViolations(name: string, results: AxeResults, mode: "light" | "dark") {
  if (results.violations.length > 0) {
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
      help: v.helpUrl,
    }))
    // eslint-disable-next-line no-console
    console.log(`[a11y:${mode}] ${name}: ${results.violations.length} violation(s) found`)
    // eslint-disable-next-line no-console
    console.table(summary)
  }

  const critical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  )

  expect(
    critical,
    `[${mode}] ${name} has ${critical.length} critical/serious a11y violation(s):\n` +
      critical
        .map((v) => `  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`)
        .join("\n")
  ).toHaveLength(0)
}

// ── Light mode audit ─────────────────────────────────────────────────────────
test.describe("Accessibility — light mode", () => {
  for (const { name, path } of PAGES) {
    test(`${name} (${path})`, async ({ page }) => {
      const results = await runAxe(page, path)
      assertNoViolations(name, results, "light")
    })
  }
})

// ── Dark mode audit ──────────────────────────────────────────────────────────
test.describe("Accessibility — dark mode", () => {
  test.use({ colorScheme: "dark" })

  for (const { name, path } of DARK_MODE_PAGES) {
    test(`${name} (${path})`, async ({ page }) => {
      const results = await runAxe(page, path)
      assertNoViolations(name, results, "dark")
    })
  }
})
