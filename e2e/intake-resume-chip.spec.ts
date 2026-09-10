/**
 * IntakeResumeChip smoke spec.
 *
 * The homepage and certificate landing render `<IntakeResumeChip />`. It inspects
 * localStorage for unfinished `/request` drafts (keys prefixed
 * `instantmed-draft-`) and surfaces a resume CTA for the most recent one.
 * It self-dismisses for 6 hours when the user closes it.
 *
 * Hard gates:
 *   1. No chip when no draft exists
 *   2. Chip renders with correct service label + Continue link when a fresh draft exists
 *   3. Dismissing sets `intake_resume_chip_dismissed_at` and hides the chip within the 6h window
 */
import { expect, test } from "@playwright/test"

const DISMISS_KEY = "intake_resume_chip_dismissed_at"

async function seedDraft(
  page: import("@playwright/test").Page,
  serviceType: "med-cert" | "prescription" | "consult",
  answers: Record<string, unknown> = { reason: "flu" },
) {
  // Seed BEFORE the homepage mount reads localStorage. We navigate to `/`,
  // then seed, then reload so the effect runs against the seeded state.
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await page.evaluate(
    ({ serviceType, answers }) => {
      localStorage.setItem(
        `instantmed-draft-${serviceType}`,
        JSON.stringify({
          serviceType,
          currentStepId: "details",
          answers,
          lastSavedAt: new Date().toISOString(),
        }),
      )
      localStorage.removeItem("intake_resume_chip_dismissed_at")
    },
    { serviceType, answers },
  )
  await page.reload({ waitUntil: "domcontentloaded" })
}

test.describe("IntakeResumeChip", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
    // Resume is a browser-only check. Never persist a synthetic anonymous draft
    // to the shared backend, including the beacon sent when the page closes.
    await context.route("**/api/draft**", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as { sessionId: string }
        await route.fulfill({ json: {
          sessionId: body.sessionId,
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        } })
      } else {
        await route.fulfill({ status: 404, json: { error: "Not found" } })
      }
    })
  })

  test("does not render when no draft exists", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => {
      // Clear any service draft keys + the dismissal flag
      Object.keys(localStorage)
        .filter((k) => k.startsWith("instantmed-draft-") || k === "intake_resume_chip_dismissed_at")
        .forEach((k) => localStorage.removeItem(k))
    })
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(
      page.getByText(/Pick up your .* request\?/i),
      "chip should be hidden when no draft",
    ).not.toBeVisible()
  })

  for (const width of [375, 1440]) {
    for (const path of ["/", "/medical-certificate"]) {
      test(`resume link clears navigation and opens the draft at ${width} on ${path}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 })
        await seedDraft(page, "med-cert")
        if (path !== "/") await page.goto(path, { waitUntil: "domcontentloaded" })
        await expect(page.getByText("Pick up your medical certificate request?")).toBeVisible()
        const continueLink = page.getByRole("link", { name: /^Continue$/i }).first()
        await expect(continueLink).toHaveAttribute("href", "/request?service=med-cert")
        const navigation = await page.getByRole("navigation", { name: "Main navigation", exact: true }).boundingBox()
        const action = await continueLink.boundingBox()
        expect(action!.y).toBeGreaterThanOrEqual(navigation!.y + navigation!.height)
        expect(action!.height).toBeGreaterThanOrEqual(44)
        await page.screenshot({ path: testInfo.outputPath(`resume-${width}.png`) })
        await continueLink.click()
        await expect(page).toHaveURL(/\/request\?service=med-cert/)
      })
    }
  }

  test("dismissing sets the 6h suppression flag and hides the chip", async ({ page }) => {
    await seedDraft(page, "prescription")
    await expect(page.getByText("Pick up your repeat prescription request?")).toBeVisible()
    await page.getByRole("button", { name: /Dismiss/i }).click()
    await expect(page.getByText("Pick up your repeat prescription request?")).not.toBeVisible()

    const dismissedAt = await page.evaluate((key) => localStorage.getItem(key), DISMISS_KEY)
    expect(dismissedAt, "dismissal timestamp should be set").not.toBeNull()
    expect(Number(dismissedAt)).toBeGreaterThan(Date.now() - 5_000)
  })

  test("uses the exact canonical subtype route for a local consult draft", async ({ page }) => {
    await seedDraft(page, "consult", { consultSubtype: "hair_loss", hairGoal: "slow loss" })
    await expect(page.getByText("Pick up your consult request?")).toBeVisible()
    await expect(page.getByRole("link", { name: /Continue/i }).first()).toHaveAttribute(
      "href",
      "/request?service=consult&subtype=hair_loss",
    )
  })
})
