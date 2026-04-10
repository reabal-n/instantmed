/**
 * Animation regression tests
 *
 * Guards against the Framer Motion StrictMode bug where whileInView/useInView
 * animations can permanently stick at their initial state (opacity:0, transform)
 * when React double-mounts components in dev mode.
 *
 * Root cause: InViewFeature.mount() discards the IO cleanup function, so
 * isInView can be set to true on first mount, then the remount's IO callback
 * hits the early-return and never calls setActive. Removing opacity:0 from
 * all initial states means content is always readable even if IO fails.
 *
 * Run: pnpm e2e:chromium e2e/animations.spec.ts
 */

import { test, expect } from "@playwright/test"

test.describe("whileInView — content always visible", () => {
  test("homepage service cards are readable before and after scroll", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })

    // Service cards grid — stagger animation, but content must never be hidden
    const grid = page.locator('[id="pricing"]').first()
    await grid.scrollIntoViewIfNeeded()

    // All card titles must be visible (opacity > 0, no invisible content)
    const cardTitles = page.locator('[id="pricing"] h3')
    const count = await cardTitles.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const title = cardTitles.nth(i)
      await expect(title).toBeVisible()
      // Confirm inline opacity isn't stuck at 0
      const opacity = await title.evaluate((el) =>
        window.getComputedStyle(el).opacity
      )
      expect(parseFloat(opacity)).toBeGreaterThan(0)
    }
  })

  test("how-it-works section renders without invisible content", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })

    const section = page.locator("#how-it-works")
    await section.scrollIntoViewIfNeeded()

    // Step text elements must be visible
    const stepHeadings = section.locator("h3")
    const count = await stepHeadings.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      await expect(stepHeadings.nth(i)).toBeVisible()
    }
  })

  test("stat-strip numbers are readable when scrolled into view", async ({ page }) => {
    await page.goto("/medical-certificate", { waitUntil: "domcontentloaded" })

    // Find stat strip section if present
    const statSection = page.locator("section").filter({ hasText: /patients|certificates|hours/i }).first()
    const exists = await statSection.count()
    if (exists === 0) return // page may not have stat strip, skip gracefully

    await statSection.scrollIntoViewIfNeeded()

    // Numbers (spans inside stat strip) must be visible and non-zero
    const numbers = statSection.locator("span").filter({ hasText: /\d/ })
    const numCount = await numbers.count()
    if (numCount > 0) {
      for (let i = 0; i < Math.min(numCount, 4); i++) {
        await expect(numbers.nth(i)).toBeVisible()
      }
    }
  })

  test("accordion FAQ items are visible when scrolled to", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })

    // Scroll to bottom of page to trigger all whileInView animations
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)

    const faqItems = page.locator("[data-state]").filter({ hasText: /\?/ })
    const count = await faqItems.count()
    if (count === 0) return

    for (let i = 0; i < Math.min(count, 3); i++) {
      const opacity = await faqItems.nth(i).evaluate((el) =>
        window.getComputedStyle(el).opacity
      )
      expect(parseFloat(opacity)).toBeGreaterThan(0)
    }
  })

  test("service landing page sections render without invisible content", async ({ page }) => {
    await page.goto("/medical-certificate", { waitUntil: "domcontentloaded" })

    // Scroll through the full page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // No element on the page should be invisible due to stuck animation
    // (checks inline opacity:0 specifically, not CSS-class-based visibility)
    const stuckElements = await page.evaluate(() => {
      const all = document.querySelectorAll("[style*='opacity: 0']")
      // Filter to only elements that are in the viewport or have been scrolled past
      return Array.from(all)
        .filter((el) => {
          const rect = el.getBoundingClientRect()
          // Element is above the fold (already scrolled past) — should have animated
          return rect.bottom < window.innerHeight * 2
        })
        .map((el) => el.tagName + (el.id ? `#${el.id}` : "") + ` class="${el.className.slice(0, 60)}"`)
    })

    expect(stuckElements).toHaveLength(0)
  })
})
