import { expect, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Email typo guard on the intake details step.
 *
 * gamil.com / gmial.com etc. are structurally valid, so validateEmail passes
 * and the certificate silently goes to a dead address. The details step now
 * suggests the likely correction on blur (non-blocking) and applies it on tap.
 */
test.describe("Intake email typo suggestion", () => {
  test("suggests a gmail correction and applies it on click", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    // Step 1 — certificate (Work; duration + start have defaults)
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({
      timeout: 15000,
    })
    await page.getByRole("radio", { name: /Work/i }).click()
    await page.getByRole("button", { name: /^Continue$/ }).click()

    // Step 2 — symptoms (tap a starter chip + a duration to enable Continue)
    await expect(page.getByRole("heading", { name: /stopping you/i })).toBeVisible({
      timeout: 15000,
    })
    await page.getByRole("button", { name: "Cold or flu" }).click()
    await page.getByRole("button", { name: "1-2 days" }).click()
    await page.getByRole("button", { name: /^Continue$/ }).click()

    // Step 3 — details: type a typo'd email and blur
    const email = page.getByRole("textbox", { name: /Email/i })
    await expect(email).toBeVisible({ timeout: 15000 })
    await email.fill("jane@gamil.com")
    await page.getByRole("textbox", { name: /First name/i }).click() // real blur

    // Suggestion appears (non-blocking) and offers the correction
    await expect(page.getByText(/Did you mean/i)).toBeVisible({ timeout: 5000 })
    const suggestion = page.getByRole("button", { name: "jane@gmail.com" })
    await expect(suggestion).toBeVisible()

    // Applying it corrects the field and dismisses the suggestion
    await suggestion.click()
    await expect(email).toHaveValue("jane@gmail.com")
    await expect(page.getByText(/Did you mean/i)).toHaveCount(0)
  })
})
