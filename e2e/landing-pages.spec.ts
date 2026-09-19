/**
 * Landing-page geometry gates (19 Sep 2026 audit → docs/plans/2026-09-19-landing-pages-95-plan.md).
 *
 * Every gate here is a measurement, not a screenshot diff, so it survives
 * copy changes. Extend LANDING_PAGES and the per-page budgets when a page
 * is added or compressed; never widen a budget to make a red run green.
 */
// eslint-disable-next-line simple-import-sort/imports, @typescript-eslint/no-unused-vars -- wired up when a later task in this plan adds an a11y gate to this file
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { gotoPublicRoute, seedMoneyPageState } from "./helpers/money-pages"

const PHONE = { width: 375, height: 812 }
const DESKTOP = { width: 1440, height: 900 }

/** Phase-1 phone height budgets in 812px screens. Ratchet down, never up. */
export const LANDING_PAGES = [
  { path: "/", maxPhoneScreens: 7.0 },
  { path: "/medical-certificate", maxPhoneScreens: 10.0 },
  { path: "/prescriptions", maxPhoneScreens: 8.5 },
  { path: "/erectile-dysfunction", maxPhoneScreens: 9.5 },
  { path: "/hair-loss", maxPhoneScreens: 9.5 },
  { path: "/womens-health", maxPhoneScreens: 9.5 },
  { path: "/weight-loss", maxPhoneScreens: 9.5 },
] as const

async function headerHeight(page: Page): Promise<number> {
  const box = await page.locator("header").first().boundingBox()
  expect(box, "fixed header should have a layout box").not.toBeNull()
  return box!.height
}

async function settle(page: Page) {
  // Hero entrance animations run for up to 600ms; wait for the CSS keyframes to finish.
  await page.waitForTimeout(900)
}

test.describe("landing page geometry", () => {
  for (const landing of LANDING_PAGES) {
    test(`${landing.path} hero pill clears the fixed header on a phone`, async ({ page }) => {
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const pill = page.locator("main .hero-availability-enter").first()
      await expect(pill).toBeVisible()
      const pillBox = await pill.boundingBox()
      expect(pillBox).not.toBeNull()
      expect(
        pillBox!.y,
        `${landing.path}: pill top ${pillBox!.y} sits under the ${await headerHeight(page)}px fixed header`,
      ).toBeGreaterThanOrEqual(await headerHeight(page))
    })

    test(`${landing.path} keeps the primary CTA inside the first phone viewport`, async ({ page }) => {
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const cta = page.locator('main a[href*="/request"]').first()
      await expect(cta).toBeVisible()
      const box = await cta.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y + box!.height, `${landing.path}: CTA bottom below the fold`).toBeLessThanOrEqual(PHONE.height)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow, `${landing.path}: horizontal overflow at 375px`).toBe(false)
    })

    test(`${landing.path} keeps hero trust marks on one row on a phone`, async ({ page }) => {
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const row = page.locator("[data-hero-trust-row]").first()
      if ((await row.count()) === 0) return // pages that pass trustRow={null}
      const tops = await row.evaluate((el) =>
        Array.from(el.children).map((child) => Math.round(child.getBoundingClientRect().top)),
      )
      expect(tops.length, `${landing.path}: trust row should carry at most 2 marks`).toBeLessThanOrEqual(2)
      // Same-row marks can still land a few px apart: globals.css forces a
      // 44px min touch target on `a[href]` under 768px (WCAG target size),
      // taller than GoogleAdsCert's plain div, so `items-center` centers
      // them at slightly different tops even on one line (~2px, measured).
      // A real wrap to a second flex line moves a mark down by a full row
      // height (40px+), far past this tolerance.
      const spread = Math.max(...tops) - Math.min(...tops)
      expect(spread, `${landing.path}: trust marks wrapped to a second row`).toBeLessThanOrEqual(8)
    })
  }
})

test.describe("landing page desktop rhythm", () => {
  for (const landing of LANDING_PAGES) {
    test(`${landing.path} keeps the hero and the next section within 120px`, async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const gap = await page.evaluate(() => {
        const hero = document.querySelector("[data-hero]")
        if (!hero) return null
        const heroBottom = Math.max(
          ...Array.from(hero.querySelectorAll("a, p, span, img, svg")).map(
            (el) => el.getBoundingClientRect().bottom,
          ),
        )
        let next = hero.nextElementSibling
        while (next && !(next as HTMLElement).innerText?.trim()) next = next.nextElementSibling
        if (!next) return null
        const firstText = Array.from(next.querySelectorAll("h2, h3, p, span")).find(
          (el) => (el as HTMLElement).innerText.trim().length > 0,
        )
        return firstText ? firstText.getBoundingClientRect().top - heroBottom : null
      })
      expect(gap, `${landing.path}: no [data-hero] section`).not.toBeNull()
      expect(gap!, `${landing.path}: ${Math.round(gap!)}px of empty space under the hero`).toBeLessThanOrEqual(120)
    })
  }
})
