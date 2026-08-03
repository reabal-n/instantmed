import { expect, test } from "@playwright/test"

import { PRICING, PRICING_DISPLAY } from "../lib/constants"
import { waitForPageLoad } from "./helpers/test-utils"

const expectedPriorityTotal = `$${(PRICING.MED_CERT + PRICING.PRIORITY_FEE).toFixed(2)}`
const baseMedCertTotal = `$${PRICING.MED_CERT.toFixed(2)}`

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

/** Walk the med-cert flow to the unified review+pay step ("One last check"). */
async function walkToReviewStep(page: import("@playwright/test").Page) {
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
  // Symptoms step uses tap-to-select chips (redesigned); the detail textbox is optional.
  await page.getByRole("button", { name: "Fever" }).click()
  await page.getByRole("button", { name: "Cough or sore throat" }).click()
  await page
    .getByPlaceholder(/Fever and sore throat since yesterday/i)
    .fill("Fever and sore throat since yesterday, unable to study today.")
  await page.getByRole("radio", { name: "1-2 days" }).click()
  await clickContinue(page)

  await expect(page.getByRole("heading", { name: "Your details", level: 2 })).toBeVisible()
  await page.locator('input[placeholder="Jane"]').fill("Test")
  await page.locator('input[placeholder="Smith"]').fill("Patient")
  await page.locator('input[placeholder="jane@example.com"]').fill("test.patient@example.com")
  await page.locator('input[placeholder="DD/MM/YYYY"]').fill("01/04/1985")
  await clickContinue(page)

  // Med-cert now uses the unified review-step (heading "One last check"), not
  // the retired checkout-step ("Payment" / "Ready to submit").
  await expect(page.getByRole("heading", { name: "One last check" })).toBeVisible()
}

test.describe("Checkout Priority Review", () => {
  test("med-cert checkout presents Priority review cleanly and updates the total", async ({ page }) => {
    // Priority quiet hours hide the toggle 00:00-08:59 Australia/Sydney
    // (lib/request/priority-review-window.ts). Pin Date to Sydney midday so
    // this spec is deterministic regardless of when CI runs. setFixedTime (not
    // clock.install): install fakes timers/rAF and freezes the step wizard's
    // transitions; the quiet-hours check only reads `new Date()`.
    await page.clock.setFixedTime(new Date("2026-08-03T12:00:00+10:00"))
    await walkToReviewStep(page)

    await expect(page.getByText("Skip the queue. Your case is reviewed first.")).toBeHidden()
    await expect(page.getByText("Express Review")).toBeHidden()
    await expect(page.getByText("Express", { exact: true })).toBeHidden()

    const prioritySwitch = page.locator("#review-priority-review-toggle")
    await expect(prioritySwitch).toBeVisible()
    await expect(prioritySwitch).toHaveAttribute("role", "switch")
    await expect(prioritySwitch.getByText("Priority review")).toBeVisible()
    await expect(prioritySwitch.getByText(`+${PRICING_DISPLAY.PRIORITY_FEE}`)).toBeVisible()
    await expect(prioritySwitch.getByText("Moves ahead of standard review. No time guarantee.")).toBeVisible()

    const rowBox = await prioritySwitch.boundingBox()
    expect(rowBox).not.toBeNull()
    expect(rowBox!.height).toBeLessThanOrEqual(80)
    expect(rowBox!.width).toBeGreaterThan(280)

    await prioritySwitch.click()

    await expect(page.getByText("Priority review").first()).toBeVisible()
    await expect(page.getByText(expectedPriorityTotal).first()).toBeVisible()
  })

  test("priority toggle stays hidden during Sydney quiet hours (silent)", async ({ page }) => {
    // 03:00 Australia/Sydney — inside the 00:00-08:59 quiet window. The row
    // must simply be absent: no toggle, no explanatory copy, base total only.
    await page.clock.setFixedTime(new Date("2026-08-03T03:00:00+10:00"))
    await walkToReviewStep(page)

    await expect(page.locator("#review-priority-review-toggle")).toHaveCount(0)
    await expect(page.getByText("Priority review")).toHaveCount(0)
    await expect(page.getByText(baseMedCertTotal).first()).toBeVisible()
  })
})
