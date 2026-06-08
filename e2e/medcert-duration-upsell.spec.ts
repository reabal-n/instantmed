import { expect, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Med-cert "+1 day" checkout upsell.
 *
 * A 1-day cert (the floor tier ~85% of buyers pick) sees an optional, one-tap
 * "extend to 2 days" offer at checkout. Default is unchanged; the doctor reviews
 * every certificate. Tapping it bumps the price to the 2-day tier ($29.95).
 */
test.describe("Med-cert duration upsell", () => {
  test("offers a 2nd day on a 1-day cert and applies it on tap", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    // Step 1 — certificate (Work, 1-day default)
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({
      timeout: 15000,
    })
    await page.getByRole("radio", { name: /Work/i }).click()
    await page.getByRole("button", { name: /^Continue$/ }).click()

    // Step 2 — symptoms
    await expect(page.getByRole("heading", { name: /stopping you/i })).toBeVisible({
      timeout: 15000,
    })
    await page.getByRole("button", { name: "Cold or flu" }).click()
    await page.getByRole("button", { name: "1-2 days" }).click()
    await page.getByRole("button", { name: /^Continue$/ }).click()

    // Step 3 — details
    await page.getByRole("textbox", { name: /First name/i }).fill("Jane")
    await page.getByRole("textbox", { name: /Last name/i }).fill("Smith")
    await page.getByRole("textbox", { name: /Email/i }).fill("jane@example.com")
    await page.getByRole("textbox", { name: /Date of birth/i }).fill("01/01/1990")
    await page.getByRole("button", { name: /Continue to payment/i }).click()

    // Step 4 — checkout: the 1-day cert shows the optional extension offer
    const offer = page.getByTestId("medcert-extra-day")
    await expect(offer).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Need to cover a second day/i)).toBeVisible()

    // Total starts at the 1-day price
    await expect(page.getByText("$19.95").first()).toBeVisible()

    // Tapping it moves to the 2-day tier and dismisses the offer
    await offer.click()
    await expect(page.getByText("$29.95").first()).toBeVisible()
    await expect(offer).toHaveCount(0)
  })
})
