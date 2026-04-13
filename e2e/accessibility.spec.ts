/**
 * Accessibility E2E Tests (WCAG 2.1 AA)
 *
 * Uses @axe-core/playwright to automatically detect accessibility violations
 * on key patient-facing and marketing pages.
 *
 * Run: pnpm e2e:chromium e2e/accessibility.spec.ts
 */

import AxeBuilder from "@axe-core/playwright"
import { expect,test } from "@playwright/test"

// Pages to audit - covers marketing, intake, and patient portals
const pages = [
  { name: "Homepage", path: "/" },
  { name: "Medical Certificate", path: "/medical-certificate" },
  { name: "Prescriptions", path: "/prescriptions" },
  { name: "FAQ", path: "/faq" },
  { name: "Contact", path: "/contact" },
  { name: "Pricing", path: "/pricing" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Request Flow", path: "/request" },
]

for (const { name, path } of pages) {
  test(`${name} (${path}) has no critical accessibility violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" })

    // Dismiss cookie banner if present
    const acceptBtn = page.getByRole("button", { name: /accept all/i })
    if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptBtn.click()
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      // Exclude third-party widgets (Intercom, analytics)
      .exclude("#intercom-container")
      .exclude("[data-nextjs-dialog]")
      .analyze()

    // Log violations for debugging
    if (results.violations.length > 0) {
      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        help: v.helpUrl,
      }))
      // eslint-disable-next-line no-console
      console.log(`[a11y] ${name}: ${results.violations.length} violations found`)
      // eslint-disable-next-line no-console
      console.table(summary)
    }

    // Fail on critical and serious violations
    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    )

    expect(
      critical,
      `${name} has ${critical.length} critical/serious a11y violations:\n${critical.map((v) => `  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`).join("\n")}`
    ).toHaveLength(0)
  })
}
