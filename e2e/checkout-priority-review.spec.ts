import { expect, test } from "@playwright/test"

import { PRICING, PRICING_DISPLAY } from "../lib/constants"
import { waitForPageLoad } from "./helpers/test-utils"

const expectedPriorityTotal = `$${(PRICING.MED_CERT + PRICING.PRIORITY_FEE).toFixed(2)}`

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

test.describe("Checkout Priority Review", () => {
  test("med-cert checkout presents Priority review cleanly and updates the total", async ({ page }) => {
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
      .getByRole("textbox", { name: /Fever, sore throat, and fatigue/i })
      .fill("Fever sore throat fatigue and headache since yesterday, unable to study today.")
    await page.getByRole("radio", { name: "1-2 days" }).click()
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
    await expect(page.getByText("Express Review")).toBeHidden()
    await expect(page.getByText("Express", { exact: true })).toBeHidden()

    const prioritySwitch = page.locator("#priority-review-toggle")
    await expect(prioritySwitch).toBeVisible()
    await expect(prioritySwitch).toHaveAttribute("role", "switch")
    await expect(prioritySwitch.getByText("Priority review")).toBeVisible()
    await expect(prioritySwitch.getByText(`+${PRICING_DISPLAY.PRIORITY_FEE}`)).toBeVisible()
    await expect(prioritySwitch.getByText("Moves this request ahead of standard review. No time guarantee.")).toBeVisible()

    const rowBox = await prioritySwitch.boundingBox()
    expect(rowBox).not.toBeNull()
    expect(rowBox!.height).toBeLessThanOrEqual(80)
    expect(rowBox!.width).toBeGreaterThan(280)

    await prioritySwitch.click()

    await expect(page.getByText("Priority review").first()).toBeVisible()
    await expect(page.getByText(expectedPriorityTotal).first()).toBeVisible()
  })
})
