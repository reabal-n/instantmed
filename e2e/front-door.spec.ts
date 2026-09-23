import { readFileSync } from "node:fs"

import { expect, test } from "@playwright/test"

import { seedMoneyPageState } from "./helpers/money-pages"
import { installProductionSyntheticIsolation } from "./helpers/production-synthetic-isolation"

const routes = ["/", "/medical-certificate", "/prescriptions", "/erectile-dysfunction", "/hair-loss", "/womens-health", "/weight-loss", "/contact", "/how-it-works"]
const services = ["/medical-certificate", "/prescriptions", "/erectile-dysfunction", "/hair-loss", "/womens-health", "/weight-loss"]

test.beforeEach(async ({ page }) => { await installProductionSyntheticIsolation(page) })

test("money headline font file covers every rendered title character", async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Glyph attribution uses the Chromium DevTools protocol.')
  const font = readFileSync('lib/fonts/plus-jakarta-money-h1.woff2').toString('base64')
  const cdp = await context.newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  for (const route of ['/medical-certificate', '/prescriptions']) {
    await page.goto(route)
    const title = await page.locator('[data-hero] h1').innerText()
    // Load the committed file alone: the full Jakarta face must not mask missing glyphs.
    await page.evaluate(async ({ font, title }) => {
      const bytes = Uint8Array.from(atob(font), char => char.charCodeAt(0))
      const face = await new FontFace('HeadlineCoverage', bytes).load()
      document.fonts.add(face)
      const probe = document.createElement('span')
      probe.id = 'headline-font-coverage'
      probe.textContent = [...new Set(title)].join('')
      probe.style.fontFamily = 'HeadlineCoverage, monospace'
      document.body.append(probe)
    }, { font, title })
    const { root } = await cdp.send('DOM.getDocument')
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#headline-font-coverage' })
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
    expect(fonts, route).toHaveLength(1)
    expect(fonts[0].isCustomFont, route).toBe(true)
  }
  await cdp.detach()
})

test("disabled services omit hero reviews and refund reassurance", async ({ page }) => {
  await page.route('**/api/availability', route => route.fulfill({ json: {
    maintenance_mode: false, disable_med_cert: true, disable_repeat_scripts: true,
    disable_consults: true, disable_weight_loss: true,
    urgent_notice_enabled: false, urgent_notice_message: '', business_hours_enabled: false,
  } }))
  for (const route of services) {
    await page.goto(route)
    const hero = page.locator('[data-hero]')
    await expect(hero.getByRole('link', { name: 'Contact us', exact: true })).toBeVisible()
    await expect(hero.locator('[data-hero-reviews], [data-hero-reassurance]')).toHaveCount(0)
  }
  await page.goto('/')
  await expect(page.locator('[data-hero-reviews]')).toBeVisible()
  await expect(page.locator('[data-hero-status]')).toHaveCount(0)
})

test("specimen reference uses a local monospace fallback without another web font", async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Font attribution uses the Chromium DevTools protocol.')
  await page.goto('/medical-certificate')
  const reference = page.getByText('Reference: SPECIMEN', { exact: true })
  await reference.scrollIntoViewIfNeeded()
  const cdp = await context.newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-hero-facsimile] p[class*="ui-monospace"]' })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  expect(fonts).toHaveLength(1)
  expect(fonts[0].isCustomFont).toBe(false)
  expect(fonts[0].familyName).toMatch(/mono|menlo|monaco|consolas|courier/i)
  await cdp.detach()
})

test("open mobile menu hides the sticky purchase bar and restores it on close", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedMoneyPageState(page)
  await page.goto('/medical-certificate')
  await page.locator('#how-it-works').scrollIntoViewIfNeeded()
  const sticky = page.getByRole('region', { name: 'Quick purchase' })
  await expect(sticky).toBeVisible()
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.locator('#mobile-navigation-menu')).toBeVisible()
  await expect(sticky).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(sticky).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused()
})

test("tablet hero copy aligns with its headline on every service", async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 768, height: 1024 })
  await seedMoneyPageState(page)
  for (const route of ["/", ...services]) {
    await page.goto(route)
    await page.evaluate(() => document.fonts.ready)
    const headline = page.locator('[data-hero] h1')
    const description = page.locator('[data-hero] h1 + div > p').first()
    await expect(description).toBeVisible()
    const headingBox = await headline.boundingBox()
    const copyBox = await description.boundingBox()
    expect(Math.abs(copyBox!.x - headingBox!.x), route).toBeLessThanOrEqual(1)
    await page.screenshot({ path: testInfo.outputPath(`${route.slice(1) || 'home'}-tablet.png`) })
  }
})

test("weight management examples describe its own assessment", async ({ page }, testInfo) => {
  await page.goto("/weight-loss")
  const steps = page.locator('#how-it-works')
  await expect(steps).not.toContainText(/certificate|eScript/)
  await expect(steps.getByLabel('Illustrative example')).toHaveCount(3)
  await expect(steps).toContainText('Your health and weight history')
  await steps.screenshot({
    path: testInfo.outputPath('weight-management-steps.png'),
    style: 'header, [aria-label="Quick purchase"] { visibility: hidden !important; }',
  })
})

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
