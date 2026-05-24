/**
 * Paid-funnel journey: the money path.
 *
 * Homepage hero → tap "Medical certificate" CTA → walk the /request flow
 * for a 1-day cert, fill the form fields with throw-away data, advance to
 * the checkout step (do NOT submit payment).
 *
 * What the rubric should see:
 *   - Brand spine on the hero (TAGLINE + PROP_PHRASE)
 *   - Trust strip + signature wait counter
 *   - Service hub card design
 *   - Intake step transitions (animation, layout consistency)
 *   - Mobile sticky primary-action bar behaviour
 *   - Auto-save indicator
 *   - Form input ergonomics (touch targets, error states)
 *   - Checkout step visual handoff
 */

import type { Journey } from "./index"

export const paidFunnel: Journey = {
  name: "paid-funnel",
  label: "Paid funnel (homepage → /request med-cert → checkout)",
  targetSeconds: 75,
  async run(page, baseUrl) {
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 })

    await page.waitForTimeout(2000)
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "smooth" }))
    await page.waitForTimeout(2000)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
    await page.waitForTimeout(1500)

    await page.goto(`${baseUrl}/request?service=med-cert`, {
      waitUntil: "networkidle",
      timeout: 30000,
    })
    await page.waitForTimeout(3000)

    const oneDayChip = page
      .getByRole("button", { name: /1 day|1-day|one day/i })
      .first()
    if (await oneDayChip.isVisible().catch(() => false)) {
      await oneDayChip.click()
      await page.waitForTimeout(1200)
    }

    const todayChip = page.getByRole("button", { name: /^today$/i }).first()
    if (await todayChip.isVisible().catch(() => false)) {
      await todayChip.click()
      await page.waitForTimeout(1200)
    }

    const continueBtn = page
      .locator("button")
      .filter({ hasText: /^continue$/i })
      .first()
    if (await continueBtn.isEnabled().catch(() => false)) {
      await continueBtn.click()
      await page.waitForTimeout(2500)
    }

    const symptomsField = page
      .getByPlaceholder(/symptom|describe|reason/i)
      .first()
    if (await symptomsField.isVisible().catch(() => false)) {
      await symptomsField.click()
      await symptomsField.fill("Flu-like symptoms, fatigue, mild fever since yesterday morning.")
      await page.waitForTimeout(1500)
    }

    const continueBtn2 = page
      .locator("button")
      .filter({ hasText: /^continue$/i })
      .first()
    if (await continueBtn2.isEnabled().catch(() => false)) {
      await continueBtn2.click()
      await page.waitForTimeout(2500)
    }

    const nameField = page
      .getByPlaceholder(/full name|your name|first.*last/i)
      .first()
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.click()
      await nameField.fill("Test Patient")
      await page.waitForTimeout(800)
    }

    const emailField = page.getByPlaceholder(/email/i).first()
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.click()
      await emailField.fill("test@example.com")
      await page.waitForTimeout(800)
    }

    const dobField = page
      .locator("input")
      .filter({ has: page.locator("[type='date']") })
      .or(page.getByPlaceholder(/date of birth|dob/i))
      .first()
    if (await dobField.isVisible().catch(() => false)) {
      await dobField.click()
      await dobField.fill("1990-01-01").catch(() => {})
      await page.waitForTimeout(800)
    }

    await page.evaluate(() => window.scrollTo({ top: 9999, behavior: "smooth" }))
    await page.waitForTimeout(3000)
  },
}
