import { expect, type Page, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

// General Consult was retired publicly on 2026-05-20 (see CLAUDE.md). The
// `consult` service type stays in code as the parent category for ED and
// hair-loss, but `general` is no longer an active hub action or URL flow.
const ACTIVE_CONSULT_SUBTYPES = ["ed", "hair_loss", "womens_health"] as const

async function clearDrafts(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem("instantmed-draft-med-cert")
    localStorage.removeItem("instantmed-draft-prescription")
    localStorage.removeItem("instantmed-draft-consult")
    localStorage.removeItem("instantmed-request-draft")
    localStorage.removeItem("instantmed-preferences")
  })
}

test.describe("Consult Sub-Services", () => {
  test.beforeEach(async ({ page }) => {
    await clearDrafts(page)
  })

  for (const subtype of ACTIVE_CONSULT_SUBTYPES) {
    test(`subtype=${subtype} renders an active consult request flow`, async ({ page }) => {
      await page.goto(`/request?service=consult&subtype=${subtype}`)
      await waitForPageLoad(page)

      await page.waitForURL(new RegExp(`service=consult.*subtype=${subtype}`), { timeout: 15000 })
      await expect(page.getByRole("heading", { name: /What brings you in today/i })).not.toBeVisible()
      await expect(page.getByRole("main")).toBeVisible()
    })
  }

  test("women's health is live; only weight management stays coming-soon", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)

    const comingSoonStrip = page.locator("[data-coming-soon-strip='true']")

    // Women's health launched 2026-06-15 - it is an active hub action now.
    await expect(page.getByRole("button", { name: /Women's health/i })).toBeVisible()
    await expect(comingSoonStrip.getByText("Women's health")).not.toBeVisible()
    // Weight management remains gated.
    await expect(page.getByRole("button", { name: /Weight management/i })).not.toBeVisible()
    await expect(comingSoonStrip.getByText("Weight management")).toBeVisible()
  })

  test("women's health UTI clean case advances past the safety screen", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)
    await page.waitForURL(/subtype=womens_health/, { timeout: 15000 })

    // Type step: only UTI + contraception are live; morning-after / period-pain
    // render as disabled "coming soon".
    await expect(page.getByText(/What do you need help with/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole("button", { name: /UTI symptoms/i }).click()
    await page.getByRole("button", { name: /^Continue$/i }).last().click()

    // UTI assessment: pick a symptom, no red flags, not pregnant.
    await expect(page.getByText(/Which symptoms are you experiencing/i)).toBeVisible({ timeout: 10000 })
    await page.locator("#uti-burning").click()
    await page.getByRole("radiogroup", { name: /red flag/i }).getByText("No", { exact: true }).click()
    await page.getByRole("radiogroup", { name: /pregnant/i }).getByText("No", { exact: true }).click()

    // Continue is enabled and the flow advances out of the assessment.
    const continueBtn = page.getByRole("button", { name: /^Continue$/i }).last()
    await expect(continueBtn).toBeEnabled({ timeout: 5000 })
    await continueBtn.click()
    await expect(page.getByText(/Which symptoms are you experiencing/i)).not.toBeVisible({ timeout: 10000 })
  })

  test("hub rows route to current active consult subtypes", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)

    await page.getByRole("button", { name: /Erectile dysfunction/i }).click()
    await page.waitForURL(/service=consult.*subtype=ed/, { timeout: 15000 })

    await page.goto("/request")
    await page.getByRole("button", { name: /Hair loss treatment/i }).click()
    await page.waitForURL(/service=consult.*subtype=hair_loss/, { timeout: 15000 })

    // General Consult was retired publicly on 2026-05-20 — the hub no longer
    // exposes a "General consultation" button. The /consult route renders a
    // services-overview page and /general-consult 301s into it. Do not
    // reintroduce an assertion for this without first updating
    // docs/BUSINESS_PLAN.md and the service hub copy.
  })

  test("subtype mismatch draft path does not crash", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=ed")
    await waitForPageLoad(page)

    await page.evaluate(() => {
      localStorage.setItem(
        "instantmed-draft-consult",
        JSON.stringify({
          state: {
            serviceType: "consult",
            currentStepId: "ed-assessment",
            lastSavedAt: new Date().toISOString(),
            answers: {
              consultSubtype: "ed",
              edOnset: "gradual",
            },
          },
        }),
      )
    })

    await page.goto("/request?service=consult&subtype=hair_loss")
    await waitForPageLoad(page)

    await expect(page.locator("body")).toBeVisible()
  })
})
