import { expect, test } from "@playwright/test"

import { paidFunnel } from "../scripts/video-review/journeys/paid-funnel"

// Browser behaviour only. Keep draft writes and checkout actions inside the
// browser boundary; this spec does not establish hosted payment or delivery.
for (const theme of ["light", "dark"] as const) {
  test(`public journey keeps answers readable and recoverable in ${theme} mode`, async ({ page, baseURL }, testInfo) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
    await page.addInitScript((mode) => localStorage.setItem("theme", mode), theme)
    await page.route("**/api/draft**", async (route) => {
      const request = route.request()
      if (request.method() === "POST") {
        const body = request.postDataJSON() as { sessionId: string }
        await route.fulfill({ json: {
          sessionId: body.sessionId,
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        } })
      } else {
        await route.fulfill({ status: 404, json: { error: "Not found" } })
      }
    })
    let blockedCheckoutAttempts = 0
    await page.route("**/request?**", async (route) => {
      if (route.request().headers()["next-action"]) {
        blockedCheckoutAttempts += 1
        await route.abort("connectionfailed")
      } else {
        await route.continue()
      }
    })

    // Exercise the same real CTA and service choice used by visual review.
    await paidFunnel.run(page, baseURL!)
    await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`))
    await page.getByRole("button", { name: "Edit Symptoms", exact: true }).click()
    const description = "Runny nose and a mild headache since this morning. I feel tired and need a day off work to rest."
    await page.locator("#symptom-details").fill(description)
    const actionBar = page.locator('[data-intake-mobile-action-bar="true"]')
    await actionBar.getByRole("button", { name: /^Continue( to payment)?$/ }).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your details")
    await expect(page.getByRole("textbox", { name: /First name/i })).toHaveValue("Test")
    const longEmail = `${"avery.example".repeat(4)}@example.com`
    await page.getByRole("textbox", { name: /Email/i }).fill(longEmail)
    await actionBar.getByRole("button", { name: /^Continue( to payment)?$/ }).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Review & pay")

    const answer = page.locator("dd").filter({ hasText: description })
    await expect(answer).toHaveText(description)
    const layout = await answer.evaluate((element) => {
      const label = element.previousElementSibling!
      return {
        answer: element.getBoundingClientRect().toJSON(),
        label: label.getBoundingClientRect().toJSON(),
        align: getComputedStyle(element).textAlign,
      }
    })
    expect(layout.answer.top).toBeGreaterThanOrEqual(layout.label.bottom)
    expect(Math.abs(layout.answer.left - layout.label.left)).toBeLessThan(1)
    expect(layout.align).toBe("left")
    await expect(page.getByRole("button", { name: "Show more" })).toHaveCount(0)
    const emailAnswer = page.locator("dd").filter({ hasText: longEmail })
    await expect(emailAnswer).toHaveText(longEmail)
    expect(await emailAnswer.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)

    // A reload must recover the edited answer and the review step.
    await expect.poll(() => page.evaluate(() => localStorage.getItem("instantmed-draft-med-cert") ?? ""))
      .toContain(description)
    await page.reload()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Review & pay")
    await expect(page.locator("dd").filter({ hasText: description })).toHaveText(description)
    await page.screenshot({ path: testInfo.outputPath(`review-${theme}.png`), fullPage: true })

    const consent = page.getByRole("checkbox", { name: /Confirm request and payment terms/i })
    await consent.uncheck()
    await actionBar.getByRole("button", { name: /Pay \$24\.95/ }).click()
    await expect(consent).toBeFocused()
    expect(blockedCheckoutAttempts).toBe(0)

    await consent.check()
    await actionBar.getByRole("button", { name: /Pay \$24\.95/ }).click()
    await expect(page.getByRole("alert").filter({ hasText: /couldn't confirm the checkout result/i })).toBeVisible()
    await expect(actionBar.getByRole("button", { name: /Pay \$24\.95/ })).toBeDisabled()
    expect(blockedCheckoutAttempts).toBe(1)
    await expect(page.getByRole("link", { name: /Contact support/i })).toHaveAttribute("href", /^mailto:support@instantmed\.com\.au/)
    await page.screenshot({ path: testInfo.outputPath(`checkout-recovery-${theme}.png`), fullPage: true })
  })
}
