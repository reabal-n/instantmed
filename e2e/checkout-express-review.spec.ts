import { expect, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

async function dismissOverlays(page: import("@playwright/test").Page) {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 1500 }).catch(() => false)) {
    await essentialOnly.click()
  }

  await page.addStyleTag({
    content: `
      [data-nextjs-dialog-overlay], [data-nextjs-toast],
      [class*="nextjs-portal"],
      [data-nextjs-dev-toolbar] { display: none !important; }
    `,
  })
}

async function clickContinue(page: import("@playwright/test").Page) {
  const button = page.getByRole("button", { name: /^Continue( to payment)?$/i }).last()
  await expect(button).toBeEnabled({ timeout: 5000 })
  await button.click()
}

test.describe("Checkout Express Review", () => {
  test("med-cert checkout keeps Express Review compact and updates the total", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await expect(page.getByRole("heading", { name: "Certificate details" })).toBeVisible()
    await page.getByRole("radio", { name: "Study" }).click()
    // Length + start date collapse to a summary by default — expand to reach duration
    const changeDates = page.getByRole("button", { name: /Change length or start date/i })
    if (await changeDates.isVisible().catch(() => false)) await changeDates.click()
    await page.getByRole("radio", { name: /1 day/i }).click()
    await clickContinue(page)

    await expect(page.getByRole("heading", { name: "Your symptoms" })).toBeVisible()
    await page
      .getByRole("textbox", { name: /Describe your symptoms/i })
      .fill("Fever sore throat fatigue and headache since yesterday, unable to study today.")
    await page.getByRole("button", { name: "1-2 days" }).click()
    await clickContinue(page)

    await expect(page.getByRole("heading", { name: "Your details", level: 2 })).toBeVisible()
    await page.locator('input[placeholder="Jane"]').fill("Test")
    await page.locator('input[placeholder="Smith"]').fill("Patient")
    await page.locator('input[placeholder="jane@example.com"]').fill("test.patient@example.com")
    await page.locator('input[placeholder="DD/MM/YYYY"]').fill("01/04/1985")
    await clickContinue(page)

    await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible()
    await expect(page.getByText("Ready to submit")).toBeVisible()
    await expect(page.getByText("Skip the queue. Your case is reviewed first.")).toBeHidden()

    const expressSwitch = page.locator("#express-review-toggle")
    const expressChip = page.locator("label").filter({ has: expressSwitch })
    await expect(expressChip).toBeVisible()
    await expect(page.getByText("Express", { exact: true })).toBeVisible()
    await expect(page.getByText("+$9.95")).toBeVisible()

    const chipBox = await expressChip.boundingBox()
    expect(chipBox).not.toBeNull()
    expect(chipBox!.height).toBeLessThanOrEqual(36)
    expect(chipBox!.width).toBeLessThanOrEqual(130)

    const switchBox = await expressSwitch.boundingBox()
    expect(switchBox).not.toBeNull()
    expect(switchBox!.height).toBeLessThanOrEqual(24)
    expect(switchBox!.width).toBeLessThanOrEqual(40)

    await expressSwitch.click()

    await expect(page.getByText("Express Review")).toBeVisible()
    await expect(page.getByText("$29.90").first()).toBeVisible()
  })
})
