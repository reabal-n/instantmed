/**
 * IntakeResumeChip smoke spec.
 *
 * The homepage renders `<IntakeResumeChip />` above the navbar. It inspects
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

  test("renders for an unfinished med-cert draft with Continue CTA", async ({ page }) => {
    await seedDraft(page, "med-cert")
    await expect(page.getByText("Pick up your medical certificate request?")).toBeVisible({
      timeout: 5_000,
    })
    const continueLink = page.getByRole("link", { name: /Continue/i }).first()
    await expect(continueLink).toHaveAttribute("href", "/request?service=med-cert")
  })

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
