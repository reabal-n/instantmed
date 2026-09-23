import { expect, test } from "@playwright/test"

import { seedMoneyPageState } from "./helpers/money-pages"
import { installProductionSyntheticIsolation } from "./helpers/production-synthetic-isolation"

const routes = ["/", "/medical-certificate", "/prescriptions", "/erectile-dysfunction", "/hair-loss", "/womens-health", "/weight-loss", "/contact", "/how-it-works"]
const services = ["/medical-certificate", "/prescriptions", "/erectile-dysfunction", "/hair-loss", "/womens-health", "/weight-loss"]

test.beforeEach(async ({ page }) => { await installProductionSyntheticIsolation(page) })

for (const theme of ["light", "dark"] as const) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`${theme} ${viewport.width}px front-door visual pack`, async ({ page }, testInfo) => {
      test.setTimeout(150_000)
      await page.setViewportSize(viewport)
      await seedMoneyPageState(page, theme)
      for (const route of routes) {
        await page.goto(route)
        await expect(page.locator("main h1")).toHaveCount(1)
        await expect(page.locator("main h1")).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true)
        await expect(page.locator("main")).not.toContainText(/\bAI\b|auto.approval|bounded certificate protocol/)
        await page.screenshot({ path: testInfo.outputPath(`${route.slice(1) || 'home'}-hero.png`) })
        if (route === "/medical-certificate") {
          await page.getByRole("contentinfo").scrollIntoViewIfNeeded()
          await expect.poll(() => page.getByRole("contentinfo").locator('img[src="/logos/legitscript.png"]').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
          // Isolate the footer image from viewport-fixed chrome during tall-element capture.
          await page.getByRole("contentinfo").screenshot({ path: testInfo.outputPath("footer.png"), style: 'header, [aria-label="Quick purchase"] { visibility: hidden !important; }' })
        }
        if (route === "/") {
          await page.locator("#pricing").scrollIntoViewIfNeeded()
          await page.screenshot({ path: testInfo.outputPath("services.png") })
        }
      }
    })
  }
}

for (const viewport of [{ width: 320, height: 568 }, { width: 768, height: 900 }, { width: 844, height: 390 }]) {
  test(`menu remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto("/medical-certificate")
    const toggle = page.getByRole("button", { name: "Open menu" })
    await toggle.click()
    const menu = page.locator("#mobile-navigation-menu")
    await expect(menu.getByRole("link", { name: "Contact us", exact: true })).toBeVisible()
    await menu.getByRole("button", { name: "Services", exact: true }).click()
    for (const href of services) await expect(menu.locator(`a[href="${href}"]`)).toHaveCount(1)
    await page.keyboard.press("Escape")
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test("services remain discoverable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(`${baseURL}/`)
  const footer = page.getByRole("contentinfo")
  await footer.getByText("Explore services", { exact: true }).click()
  for (const href of services) await expect(footer.locator(`a[href="${href}"]`)).toBeVisible()
  await context.close()
})

test("reduced motion and doubled text keep actions readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/medical-certificate")
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" })
  await expect(page.locator("main h1")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const cta = page.locator('[data-hero] a[href*="/request"]').first()
  await cta.scrollIntoViewIfNeeded()
  await expect(cta).toBeVisible()
  expect(await page.locator(".hero-delivery-enter").evaluate(el => getComputedStyle(el).animationName)).toBe("none")
})

test("shared shell keeps guidance and support routes readable", async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await seedMoneyPageState(page)
  for (const route of ["/blog/same-day-medical-certificate", "/medical-certificate-online", "/about", "/pricing", "/faq", "/trust"]) {
    const response = await page.goto(route)
    expect(response?.status(), route).toBe(200)
    await expect(page.locator("main h1")).toBeVisible()
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Contact us", exact: true })).toHaveAttribute("href", "/contact")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true)
  }
})
