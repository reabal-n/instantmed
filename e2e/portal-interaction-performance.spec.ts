import { expect, type Page, test } from "@playwright/test"

import { loginAsOperator, loginAsPatient } from "./helpers/auth"
import { INTAKE_ID } from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

async function expectInteractionUnder(
  page: Page,
  label: string,
  budgetMs: number,
  action: () => Promise<void>,
  waitForResult: () => Promise<void>,
) {
  const longTaskOffset = await page.evaluate(() => performance.getEntriesByType("longtask").length).catch(() => 0)
  const startedAt = Date.now()
  await action()
  await waitForResult()
  const elapsedMs = Date.now() - startedAt

  expect(elapsedMs, `${label} took ${elapsedMs}ms; budget is ${budgetMs}ms`).toBeLessThanOrEqual(budgetMs)

  const longTasks = await page.evaluate((offset) => {
    const entries = performance.getEntriesByType("longtask")
    return entries.slice(offset).map((entry) => Math.round(entry.duration)).filter((duration) => duration >= 250)
  }, longTaskOffset).catch(() => [] as number[])

  expect(longTasks, `${label} produced a 250ms+ long task`).toHaveLength(0)
}

test.describe("portal and intake interaction performance", () => {
  test("paid landing CTA reaches the med-cert intake without visible lag", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    await page.goto("/medical-certificate")
    await waitForPageLoad(page)

    const heroCta = page.locator("main").getByRole("link", { name: /get your certificate/i }).first()
    await expect(heroCta).toBeVisible()

    await expectInteractionUnder(
      page,
      "medical-certificate hero CTA",
      2500,
      () => heroCta.click(),
      async () => {
        await expect(page).toHaveURL(/\/request\?service=med-cert/)
        await expect(page.locator("main")).toBeVisible()
      },
    )
  })

  test("patient dashboard track-status action responds quickly", async ({ page }) => {
    const login = await loginAsPatient(page)
    expect(login.success, login.error).toBe(true)

    await page.goto(`/patient/intakes/${INTAKE_ID}`)
    await waitForPageLoad(page)

    await page.goto("/patient")
    await waitForPageLoad(page)

    const trackStatusLink = page.locator("main").getByRole("link", { name: /track status/i }).first()
    await expect(trackStatusLink).toBeVisible()

    await expectInteractionUnder(
      page,
      "patient track-status action",
      2500,
      () => trackStatusLink.click(),
      async () => {
        await expect(page).toHaveURL(new RegExp(`/patient/intakes/${INTAKE_ID}`))
        await expect(page.locator("main")).toBeVisible()
      },
    )
  })

  test("staff queue row opens the review surface quickly", async ({ page }) => {
    const login = await loginAsOperator(page)
    expect(login.success, login.error).toBe(true)

    await page.goto("/dashboard?showTestData=1")
    await waitForPageLoad(page)

    const queueRow = page.locator('[data-testid^="queue-row-"]').first()
    await expect(queueRow).toBeVisible()
    const openCaseButton = queueRow.getByRole("button", { name: /open case for/i })
    await expect(openCaseButton).toBeVisible()

    await expectInteractionUnder(
      page,
      "staff queue row open",
      1800,
      () => openCaseButton.click(),
      async () => {
        await page.waitForSelector('[data-testid="intake-review-loading"], [data-testid="intake-review-panel"]', {
          state: "visible",
        })
      },
    )
  })
})
