/**
 * Brand-spine journey: tour the 4 active service surfaces.
 *
 * /, /medical-certificate, /erectile-dysfunction, /hair-loss — slow scroll
 * top-to-bottom on each, briefly hover the primary CTA. Lets the rubric
 * compare visual consistency across the four cards on the service hub.
 *
 * Per CLAUDE.md the active service hub shows exactly these 4 (plus 2
 * coming-soon: women's health, weight management). Do not add the
 * coming-soon surfaces unless they go live.
 */

import type { Journey } from "./index"

const SURFACES = [
  { path: "/", label: "Homepage" },
  { path: "/medical-certificate", label: "Medical certificate" },
  { path: "/erectile-dysfunction", label: "Erectile dysfunction" },
  { path: "/hair-loss", label: "Hair loss" },
]

export const brandSpine: Journey = {
  name: "brand-spine",
  label: "Brand spine across 4 service surfaces",
  targetSeconds: 120,
  async run(page, baseUrl) {
    for (const surface of SURFACES) {
      await page.goto(`${baseUrl}${surface.path}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      })
      await page.waitForTimeout(2000)

      const documentHeight: number = await page.evaluate(
        () => document.documentElement.scrollHeight,
      )
      const viewportHeight = 812
      const steps = Math.max(2, Math.ceil(documentHeight / viewportHeight))
      for (let i = 1; i <= steps; i++) {
        const top = (documentHeight - viewportHeight) * (i / steps)
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), top)
        await page.waitForTimeout(2200)
      }

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
      await page.waitForTimeout(1500)
    }
  },
}
