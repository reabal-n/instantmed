import { expect, test } from "@playwright/test"

const PUBLIC_PATHS = [
  { path: "/", label: "Homepage" },
  { path: "/pricing", label: "Pricing" },
  { path: "/request", label: "Service hub" },
  { path: "/medical-certificate", label: "Medical certificate" },
  { path: "/sign-in", label: "Sign in" },
] as const

const REVIEW_NUMERIC_PATTERNS = [
  /\b[0-9]\.[0-9]\s*\/\s*5\b/i,
  /\b[0-9]\.[0-9]\s*stars?\b/i,
  /\b[0-9]\.[0-9]\s*★/i,
  /\b[0-9][0-9,]*\+?\s+reviews?\b/i,
  /\btestimonial(s)?\b/i,
]

async function visibleText(page: import("@playwright/test").Page) {
  return page.locator("body").innerText()
}

test.describe("Public marketing compliance smoke", () => {
  for (const surface of PUBLIC_PATHS) {
    test(`${surface.label} keeps Google proof stars-only and hides future pricing`, async ({ page }) => {
      const response = await page.goto(surface.path, { waitUntil: "domcontentloaded" })
      expect(response?.status(), `${surface.path} should load`).toBeLessThan(400)

      await expect(
        page.locator('[aria-label="Google star rating"]').first(),
        `${surface.path} should render the stars-only Google proof badge`,
      ).toBeVisible({ timeout: 10_000 })

      const bodyText = await visibleText(page)

      for (const pattern of REVIEW_NUMERIC_PATTERNS) {
        expect(bodyText, `${surface.path} leaked numeric review/testimonial copy`).not.toMatch(pattern)
      }

      expect(bodyText, `${surface.path} leaked gated women's health pricing`).not.toContain("$59.95")
      expect(bodyText, `${surface.path} leaked gated weight-management pricing`).not.toContain("$89.95")
      expect(bodyText, `${surface.path} exposed future services as paid rows`).not.toMatch(
        /(Women's health|Weight management|Weight loss)\s+\$[0-9]/i,
      )
    })
  }

  test("Medicare wording stays scoped to medical certificates", async ({ page }) => {
    await page.goto("/medical-certificate", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("No Medicare needed").first()).toBeVisible()

    await page.goto("/request", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("No Medicare needed for medical certificates").first()).toBeVisible()

    await page.goto("/pricing", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Not for medical certificates", { exact: false }).first()).toBeVisible()
    await expect(page.getByText("For prescriptions and consultations", { exact: false }).first()).toBeVisible()
  })
})
