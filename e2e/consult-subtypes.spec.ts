import { expect, type Page, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

const ACTIVE_CONSULT_SUBTYPES = ["general", "new_medication", "ed", "hair_loss"] as const

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

  test("coming-soon consult subtypes are not exposed as active hub actions", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)

    await expect(page.getByRole("button", { name: /Women's health/i })).not.toBeVisible()
    await expect(page.getByRole("button", { name: /Weight management/i })).not.toBeVisible()
    await expect(page.getByRole("heading", { name: "Women's health" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Weight management" })).toBeVisible()
  })

  test("hub rows route to current active consult subtypes", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)

    await page.getByRole("button", { name: /Erectile dysfunction/i }).click()
    await page.waitForURL(/service=consult.*subtype=ed/, { timeout: 15000 })

    await page.goto("/request")
    await page.getByRole("button", { name: /Hair loss treatment/i }).click()
    await page.waitForURL(/service=consult.*subtype=hair_loss/, { timeout: 15000 })

    await page.goto("/request")
    await page.getByRole("button", { name: /General consultation/i }).click()
    await page.waitForURL(/service=consult.*subtype=general/, { timeout: 15000 })
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
