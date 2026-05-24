/**
 * Homepage-only journey: tightest scope. Slow scroll on / with a brief
 * nav interaction. Use when iterating specifically on the homepage and
 * you want the rubric focused on that single surface.
 */

import type { Journey } from "./index"

export const homepage: Journey = {
  name: "homepage",
  label: "Homepage long-scroll + nav tour",
  targetSeconds: 50,
  async run(page, baseUrl) {
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 })
    await page.waitForTimeout(2500)

    const documentHeight: number = await page.evaluate(
      () => document.documentElement.scrollHeight,
    )
    const viewportHeight = 812
    const steps = Math.max(4, Math.ceil(documentHeight / viewportHeight))
    for (let i = 1; i <= steps; i++) {
      const top = (documentHeight - viewportHeight) * (i / steps)
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), top)
      await page.waitForTimeout(2000)
    }

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
    await page.waitForTimeout(1500)

    const navTrigger = page
      .getByRole("button", { name: /menu|nav|hamburger/i })
      .first()
    if (await navTrigger.isVisible().catch(() => false)) {
      await navTrigger.click()
      await page.waitForTimeout(1800)
      await page.keyboard.press("Escape")
      await page.waitForTimeout(800)
    }
  },
}
