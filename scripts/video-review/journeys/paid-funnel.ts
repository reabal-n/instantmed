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
  async postCapture(page, baseUrl) {
    // The journey enters an email, which intentionally creates the same
    // cross-device recovery draft as a real patient flow. Disable the unload
    // beacon, let the final debounced save settle, then remove that synthetic
    // row so an automated visual review never pollutes production recovery.
    await page.evaluate(() => {
      window.__instantmedFlushServerDraft = undefined
    })
    await page.waitForTimeout(1800)

    const sessionId = await page.evaluate(() =>
      localStorage.getItem("instantmed-server-draft-med-cert"),
    )
    if (!sessionId) return

    const draftUrl = new URL("/api/draft", baseUrl)
    draftUrl.searchParams.set("id", sessionId)
    const response = await page.request.delete(draftUrl.toString())
    if (!response.ok() && response.status() !== 404) {
      throw new Error(`Synthetic draft cleanup failed with HTTP ${response.status()}`)
    }

    const verification = await page.request.get(draftUrl.toString())
    if (verification.status() !== 404) {
      throw new Error(`Synthetic draft still exists after cleanup (HTTP ${verification.status()})`)
    }

    await page.evaluate(() => {
      localStorage.removeItem("instantmed-server-draft-med-cert")
      localStorage.removeItem("instantmed-draft-med-cert")
      localStorage.removeItem("instantmed-request-draft")
    })
  },
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
    await page
      .getByRole("heading", { name: /Certificate details/i })
      .waitFor({ state: "visible", timeout: 15000 })
    await page.waitForTimeout(1200)

    const oneDayChip = page
      .getByRole("radio", { name: /1 day|1-day|one day/i })
      .first()
    await oneDayChip.waitFor({ state: "visible", timeout: 15000 })
    await oneDayChip.click()
    await page.waitForTimeout(800)

    const todayChip = page.getByRole("radio", { name: /^today$/i }).first()
    await todayChip.waitFor({ state: "visible", timeout: 15000 })
    await todayChip.click()
    await page.waitForTimeout(800)

    // Script runs at mobile viewport (375×812). The inline Continue button
    // is max-sm:hidden at this width — click the sticky bottom action bar instead.
    const mobileCta1 = page.locator("[data-intake-mobile-action-bar='true'] button").last()
    await mobileCta1.waitFor({ state: "visible", timeout: 15000 })
    await mobileCta1.click()

    await page
      .getByRole("heading", { name: /What is stopping you today/i })
      .waitFor({ state: "visible", timeout: 15000 })

    const symptomStarter = page.getByRole("button", { name: /^Cold or flu$/i }).first()
    await symptomStarter.waitFor({ state: "visible", timeout: 15000 })
    await symptomStarter.click()

    const symptomsField = page.locator("#symptom-details")
    await symptomsField.fill("Cold or flu, fatigue, mild fever since yesterday morning.")
    await page.waitForTimeout(1200)

    const mobileCta2 = page.locator("[data-intake-mobile-action-bar='true'] button").last()
    await mobileCta2.click()

    await page
      .getByRole("heading", { name: /Your details/i })
      .last()
      .waitFor({ state: "visible", timeout: 15000 })

    await page.getByRole("textbox", { name: /First name/i }).fill("Test")
    await page.getByRole("textbox", { name: /Last name/i }).fill("Patient")
    await page.getByRole("textbox", { name: /Email/i }).fill("test@example.com")
    await page.getByRole("textbox", { name: /Date of birth/i }).fill("01/01/1990")
    await page.keyboard.press("Tab")
    await page.waitForTimeout(1200)

    const mobileCta3 = page.locator("[data-intake-mobile-action-bar='true'] button").last()
    await mobileCta3.click()

    await page
      .getByRole("heading", { name: /One last check/i })
      .waitFor({ state: "visible", timeout: 15000 })
    await page.getByRole("checkbox", { name: /Confirm request and payment terms/i }).click()
    await page.getByRole("button", { name: /Pay \$24\.95/i }).waitFor({ state: "visible", timeout: 15000 })

    await page.evaluate(() => window.scrollTo({ top: 9999, behavior: "smooth" }))
    await page.waitForTimeout(3000)
  },
}
