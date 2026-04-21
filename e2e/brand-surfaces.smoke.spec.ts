/**
 * Brand surfaces smoke test.
 *
 * Hard gate against silent regressions of the brand promise and trust
 * signals on the public marketing pages. Every surface must:
 *
 *   1. Return HTTP 200
 *   2. Render the full `GUARANTEE` string from lib/marketing/voice.ts
 *   3. Render at least one Trust Ribbon credential (`AHPRA-registered doctors`)
 *
 * Rationale: we shipped a Source-of-Truth voice module and a 4-badge Trust
 * Ribbon under every hero in commit df6e76dcc. Nothing in CI verified the
 * signals actually render. A future refactor could silently drop the
 * `GuaranteeBadge` or the `TrustBadgeRow preset="trust_ribbon"` call and
 * no unit test would catch it.
 *
 * This spec runs against the Playwright-started dev server (port 3001)
 * via the root `playwright.config.ts`. No auth, no DB, no seeds.
 */
import { expect, test } from "@playwright/test"

// Kept as string literals (not imports) so the test fails if the module
// breaks OR if the rendered text silently diverges from the SoT.
// Regenerate these if GUARANTEE or the Trust Ribbon label changes.
const GUARANTEE_LITERAL = "Doctor reviews in 2 hours or we waive the fee."
const AHPRA_LITERAL = "AHPRA-registered doctors"

const BRAND_SURFACES = [
  { path: "/guarantee", label: "Guarantee" },
  { path: "/medical-certificate", label: "Medical certificate LP" },
  { path: "/prescriptions", label: "Prescriptions LP" },
  { path: "/erectile-dysfunction", label: "ED LP" },
  { path: "/hair-loss", label: "Hair Loss LP" },
] as const

test.describe("Brand surfaces smoke", () => {
  test.describe.configure({ mode: "parallel" })

  for (const surface of BRAND_SURFACES) {
    test(`${surface.label} (${surface.path}) renders guarantee + AHPRA`, async ({ page }) => {
      const response = await page.goto(surface.path, { waitUntil: "domcontentloaded" })

      expect(
        response?.status(),
        `${surface.path} should return 200`,
      ).toBe(200)

      // Full SoT guarantee sentence must render somewhere on the page.
      // Every hero renders `GuaranteeBadge` (which interpolates GUARANTEE),
      // and /guarantee renders the string as the h1 via CenteredHero.
      await expect(
        page.getByText(GUARANTEE_LITERAL, { exact: false }).first(),
        `${surface.path} missing GUARANTEE string`,
      ).toBeVisible({ timeout: 10_000 })

      // AHPRA credential is the invariant across every brand surface:
      // - marketing heroes render it via TrustBadgeRow (trust_ribbon or custom preset)
      // - /guarantee renders it via MarketingFooter (footer preset)
      await expect(
        page.getByText(AHPRA_LITERAL, { exact: false }).first(),
        `${surface.path} missing AHPRA trust badge`,
      ).toBeVisible({ timeout: 10_000 })
    })
  }

  test("/guarantee <title> names the promise", async ({ page }) => {
    await page.goto("/guarantee", { waitUntil: "domcontentloaded" })
    const title = await page.title()
    expect(title).toContain("Guarantee")
    expect(title).toContain("Waive")
  })
})
