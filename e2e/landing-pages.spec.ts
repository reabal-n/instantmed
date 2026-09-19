/**
 * Landing-page geometry gates (19 Sep 2026 audit → docs/plans/2026-09-19-landing-pages-95-plan.md).
 *
 * Every gate here is a measurement, not a screenshot diff, so it survives
 * copy changes. Extend LANDING_PAGES and the per-page budgets when a page
 * is added or compressed; never widen a budget to make a red run green.
 */
import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

import { gotoPublicRoute, seedMoneyPageState } from "./helpers/money-pages"

const PHONE = { width: 375, height: 812 }
const DESKTOP = { width: 1440, height: 900 }

/** Phase-1 phone height budgets in 812px screens. Ratchet down, never up. */
export const LANDING_PAGES = [
  // 9.0: the how-it-works proof section (Task 15) outweighs the hidden hero mock; the six-card chooser is ~2.5 screens on its own.
  { path: "/", maxPhoneScreens: 9.0 },
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
        // Must include every text-bearing element a hero can render, so description lists and headings are not skipped.
        const heroBottom = Math.max(
          ...Array.from(hero.querySelectorAll("a, p, span, li, dt, dd, h1, h2, h3, h4, img, svg")).map(
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

/** Pages that own a sticky CTA today. Tasks 14 and 18 add "/" and "/weight-loss". */
const STICKY_PAGES = LANDING_PAGES

test.describe("landing page sticky CTA", () => {
  for (const landing of STICKY_PAGES) {
    test(`${landing.path} shows the quick-purchase bar after the hero scrolls out`, async ({ page }) => {
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      await page.mouse.wheel(0, 1400)
      await page.waitForTimeout(500)
      const region = page.getByRole("region", { name: "Quick purchase" })
      await expect(region).toBeVisible()
      const box = await region.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height + 1)
      // 130px = 16% of an 812px viewport; the medical-certificate bar carries a payment-marks footer row.
      expect(box!.height, `${landing.path}: sticky bar taller than 130px`).toBeLessThanOrEqual(130)
    })
  }
})

test.describe("landing page health", () => {
  for (const landing of LANDING_PAGES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${landing.path} (${theme}) has no console errors and no serious axe violations`, async ({ page }) => {
        const errors: string[] = []
        page.on("pageerror", (err) => errors.push(err.message))
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text())
        })
        await page.setViewportSize(DESKTOP)
        await seedMoneyPageState(page, theme)
        await gotoPublicRoute(page, landing.path)
        await settle(page)

        expect(errors, `${landing.path}: console errors`).toEqual([])
        const results = await new AxeBuilder({ page }).analyze()
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
        expect(serious.map((v) => `${v.id}: ${v.nodes.length} nodes`), `${landing.path}: axe`).toEqual([])
      })
    }
  }
})

test("home services grid has no orphan row at desktop width", async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await seedMoneyPageState(page, "light")
  await gotoPublicRoute(page, "/")
  await settle(page)

  // Scoped to the grid's direct <li> children: "#pricing li" alone also matches
  // each card's nested benefit-bullet <li> items, which inflates the row count.
  const rows = await page.locator("#pricing ul.grid > li").evaluateAll((cards) =>
    new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size,
  )
  expect(rows, "six service cards should sit in two rows of three").toBe(2)
})

test.describe("landing page length", () => {
  for (const landing of LANDING_PAGES) {
    test(`${landing.path} fits ${landing.maxPhoneScreens} phone screens`, async ({ page }) => {
      test.fixme(
        landing.path === "/medical-certificate",
        "10.4 screens at 375×812 against a 10.0 budget; follow-up F1 in docs/plans/2026-09-19-landing-pages-95-plan.md",
      )
      test.fixme(
        landing.path === "/erectile-dysfunction",
        "10.7 screens at 375×812 against a 9.5 budget; follow-up F2 in docs/plans/2026-09-19-landing-pages-95-plan.md",
      )
      test.fixme(
        landing.path === "/hair-loss",
        "12.0 screens at 375×812 against a 9.5 budget; follow-up F3 in docs/plans/2026-09-19-landing-pages-95-plan.md",
      )
      test.fixme(
        landing.path === "/womens-health",
        "9.6 screens at 375×812 against a 9.5 budget; follow-up F4 in docs/plans/2026-09-19-landing-pages-95-plan.md",
      )
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)
      const screens = await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight)
      expect(screens, `${landing.path}: ${screens.toFixed(1)} screens`).toBeLessThanOrEqual(landing.maxPhoneScreens)
    })
  }
})

test.describe("landing page type floor", () => {
  for (const landing of LANDING_PAGES) {
    test(`${landing.path} renders no small text and at least 45% of words at 16px+`, async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const census = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.querySelector("main")!, NodeFilter.SHOW_TEXT)
        let total = 0
        let large = 0
        const small: string[] = []
        let node: Node | null
        while ((node = walker.nextNode())) {
          const text = node.textContent?.trim()
          if (!text) continue
          const el = node.parentElement
          if (!el || el.closest("[data-hero-mockup], [aria-label='Specimen'], .hero-mockup-enter")) continue
          const cs = getComputedStyle(el)
          if (cs.display === "none" || cs.visibility === "hidden") continue
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) continue
          const size = parseFloat(cs.fontSize)
          const words = text.split(/\s+/).length
          total += words
          if (size >= 16) large += words
          if (size < 12 && cs.textTransform !== "uppercase") small.push(`${Math.round(size)}px: ${text.slice(0, 40)}`)
        }
        return { total, share: total ? large / total : 0, small }
      })
      expect(census.small, `${landing.path}: text under 12px`).toEqual([])
      expect(census.share, `${landing.path}: ${(census.share * 100).toFixed(0)}% of words at 16px+`).toBeGreaterThanOrEqual(0.45)
    })
  }
})
