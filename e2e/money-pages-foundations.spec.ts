import {
  type Browser,
  expect,
  type Page,
  test,
  type TestInfo,
} from "@playwright/test"

import {
  finishFiniteEntranceAnimations,
  gotoIntakeEntry,
  gotoPublicRoute,
  inspectActiveMeaningfulAnimations,
  inspectMeaningfulHorizontalOverflow,
  MONEY_ROUTES,
  seedMoneyPageState,
} from "./helpers/money-pages"

const REFLOW_STATES = [
  { name: "phone-375", width: 375, height: 844, deviceScaleFactor: 1 },
  { name: "phone-390", width: 390, height: 844, deviceScaleFactor: 1 },
  { name: "tablet-768", width: 768, height: 1024, deviceScaleFactor: 1 },
  { name: "zoom-200-proxy", width: 188, height: 422, deviceScaleFactor: 2 },
  {
    name: "root-32-at-375",
    width: 375,
    height: 844,
    deviceScaleFactor: 1,
    rootFontSize: 32,
  },
] as const

const STICKY_SERVICE_ROUTES = [
  "/medical-certificate",
  "/prescriptions",
  "/erectile-dysfunction",
  "/hair-loss",
  "/womens-health",
  "/uti-assessment-online",
  "/contraceptive-pill-assessment-online",
] as const

function projectBaseURL(testInfo: TestInfo): string {
  return String(testInfo.project.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001")
}

async function newFoundationPage(
  browser: Browser,
  testInfo: TestInfo,
  options: {
    width: number
    height: number
    deviceScaleFactor?: number
    reducedMotion?: "reduce" | "no-preference"
  },
) {
  const context = await browser.newContext({
    baseURL: projectBaseURL(testInfo),
    viewport: { width: options.width, height: options.height },
    screen: { width: options.width, height: options.height },
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    isMobile: options.width <= 390,
    hasTouch: options.width <= 390,
    colorScheme: "light",
    reducedMotion: options.reducedMotion ?? "no-preference",
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
  })
  const page = await context.newPage()
  await seedMoneyPageState(page, "light")

  return { context, page }
}

async function waitTwoFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

async function inspectFocusedElement(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement
    if (!(element instanceof HTMLElement)) return null

    const focusedStyle = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    const focusedPaint = {
      outlineStyle: focusedStyle.outlineStyle,
      outlineWidth: focusedStyle.outlineWidth,
      outlineColor: focusedStyle.outlineColor,
      outlineOffset: focusedStyle.outlineOffset,
      boxShadow: focusedStyle.boxShadow,
    }
    const focusVisible = element.matches(":focus-visible")
    const inlineTransition = element.style.getPropertyValue("transition")
    const inlineTransitionPriority = element.style.getPropertyPriority("transition")
    element.style.setProperty("transition", "none", "important")

    const sentinel = document.createElement("button")
    sentinel.tabIndex = -1
    sentinel.setAttribute("aria-hidden", "true")
    sentinel.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"
    document.body.append(sentinel)
    sentinel.focus({ preventScroll: true })

    const unfocusedStyle = getComputedStyle(element)
    const unfocusedPaint = {
      outlineStyle: unfocusedStyle.outlineStyle,
      outlineWidth: unfocusedStyle.outlineWidth,
      outlineColor: unfocusedStyle.outlineColor,
      outlineOffset: unfocusedStyle.outlineOffset,
      boxShadow: unfocusedStyle.boxShadow,
    }

    sentinel.remove()
    element.focus({ preventScroll: true })
    if (inlineTransition) {
      element.style.setProperty("transition", inlineTransition, inlineTransitionPriority)
    } else {
      element.style.removeProperty("transition")
    }

    const outlineVisible =
      focusedPaint.outlineStyle !== "none" &&
      Number.parseFloat(focusedPaint.outlineWidth) > 0
    const outlineChanged =
      focusedPaint.outlineStyle !== unfocusedPaint.outlineStyle ||
      focusedPaint.outlineWidth !== unfocusedPaint.outlineWidth ||
      focusedPaint.outlineColor !== unfocusedPaint.outlineColor ||
      focusedPaint.outlineOffset !== unfocusedPaint.outlineOffset
    const ringChanged =
      focusedPaint.boxShadow !== "none" &&
      focusedPaint.boxShadow !== unfocusedPaint.boxShadow

    return {
      tag: element.tagName.toLowerCase(),
      name: String(
        element.getAttribute("aria-label") ||
          element.textContent ||
          element.getAttribute("href") ||
          element.id,
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 120),
      visible:
        focusedStyle.display !== "none" &&
        focusedStyle.visibility !== "hidden" &&
        Number(focusedStyle.opacity) > 0.01 &&
        rect.width > 0 &&
        rect.height > 0,
      intersectsViewport:
        rect.right > 0 &&
        rect.left < window.innerWidth &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight,
      focusIndicator: focusVisible && ((outlineVisible && outlineChanged) || ringChanged),
    }
  })
}

async function collectReducedMotionFindings(page: Page) {
  const findings = []

  for (let pass = 0; pass < 40; pass += 1) {
    await waitTwoFrames(page)
    findings.push(...(await inspectActiveMeaningfulAnimations(page)))

    const scroll = await page.evaluate(() => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      if (window.scrollY >= max - 2) return { done: true, next: max }
      return { done: false, next: Math.min(max, window.scrollY + 700) }
    })
    if (scroll.done) break
    await page.evaluate((next) => window.scrollTo(0, next), scroll.next)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await waitTwoFrames(page)

  return Array.from(
    new Map(
      findings.map((finding) => [
        `${finding.selector}:${finding.name}:${finding.duration}:${finding.delay}:${finding.iterations}`,
        finding,
      ]),
    ).values(),
  )
}

async function inspectPatientTargets(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-patient-flow="true"]')
    if (!root) return { count: 0, failures: [{ label: "missing patient-flow root", width: 0, height: 0 }] }

    const controls = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"],[role="switch"],[role="checkbox"],[role="radio"],[role="combobox"]',
      ),
    )

    const visible = controls.filter((element) => {
      if (element.closest("[hidden],[inert],[aria-hidden='true'],.sr-only")) return false
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.01 &&
        rect.width > 0 &&
        rect.height > 0
      )
    })

    const failures = visible.flatMap((element) => {
      const style = getComputedStyle(element)
      const inlineTextLink =
        element instanceof HTMLAnchorElement &&
        style.display === "inline" &&
        Boolean(element.closest("p,li,dd,blockquote"))
      if (inlineTextLink) return []

      const rect = element.getBoundingClientRect()
      if (rect.width >= 47.5 && rect.height >= 47.5) return []
      return [{
        label: String(
          element.getAttribute("aria-label") || element.textContent || element.tagName,
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 120),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      }]
    })

    return { count: visible.length, failures }
  })
}

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "Money-page foundations use Chromium layout metrics")
})

test.describe("money-page responsive foundations", () => {
  for (const route of MONEY_ROUTES) {
    test(`${route.path} contains semantic content at every required viewport`, async ({ browser }, testInfo) => {
      test.setTimeout(150_000)

      for (const state of REFLOW_STATES) {
        const { context, page } = await newFoundationPage(browser, testInfo, state)
        try {
          await gotoPublicRoute(page, route.path)
          if ("rootFontSize" in state) {
            await page.addStyleTag({ content: ":root { font-size: 32px !important; }" })
            await expect
              .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
              .toBe("32px")
          }
          await finishFiniteEntranceAnimations(page)

          const audit = await inspectMeaningfulHorizontalOverflow(page)
          expect(
            audit.scrollWidth,
            `${route.path} ${state.name} document width`,
          ).toBeLessThanOrEqual(audit.clientWidth + 1)
          expect(
            audit.findings,
            `${route.path} ${state.name} semantic overflow:\n${JSON.stringify(audit.findings, null, 2)}`,
          ).toEqual([])
        } finally {
          await context.close()
        }
      }
    })
  }

  test("request progress preserves 48px height while releasing min-width at the zoom proxy", async ({ browser }, testInfo) => {
    const { context, page } = await newFoundationPage(browser, testInfo, {
      width: 188,
      height: 422,
      deviceScaleFactor: 2,
    })
    try {
      await gotoIntakeEntry(page, "/request?service=med-cert")
      const progress = page.locator('nav[aria-label="Request progress"]')
      const steps = progress.locator('[data-request-progress-step="true"]')
      await expect(progress).toBeVisible()
      expect(await steps.count()).toBeGreaterThan(1)

      const metrics = await progress.evaluate((nav) => {
        const navRect = nav.getBoundingClientRect()
        const buttons = Array.from(
          nav.querySelectorAll<HTMLElement>('[data-request-progress-step="true"]'),
        ).map((button) => {
          const style = getComputedStyle(button)
          const rect = button.getBoundingClientRect()
          return {
            minWidth: style.minWidth,
            minHeight: style.minHeight,
            height: rect.height,
          }
        })
        return {
          left: navRect.left,
          right: navRect.right,
          viewportWidth: document.documentElement.clientWidth,
          buttons,
        }
      })

      expect(metrics.left).toBeGreaterThanOrEqual(-1)
      expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1)
      for (const button of metrics.buttons) {
        expect(button.minWidth).toBe("0px")
        expect(Number.parseFloat(button.minHeight)).toBeGreaterThanOrEqual(48)
        expect(button.height).toBeGreaterThanOrEqual(47.5)
      }
    } finally {
      await context.close()
    }
  })
})

test.describe("money-page keyboard foundations", () => {
  for (const route of MONEY_ROUTES) {
    test(`${route.path} starts with skip navigation and exposes visible focus`, async ({ page }) => {
      test.setTimeout(150_000)
      await page.setViewportSize({ width: 375, height: 844 })
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, route.path)
      await finishFiniteEntranceAnimations(page)
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())

      const skipLink = page.locator('a[href="#main-content"]').first()
      await page.keyboard.press("Tab")
      await expect(skipLink).toBeFocused()
      await expect(skipLink).toBeVisible()

      await page.keyboard.press("Enter")
      await expect(page.locator("#main-content")).toBeFocused()
      await expect.poll(() => new URL(page.url()).hash).toBe("#main-content")

      for (let index = 0; index < 5; index += 1) {
        await page.keyboard.press("Tab")
        await expect
          .poll(() => inspectFocusedElement(page), {
            message: `${route.path} focus ${index + 1} should settle visibly inside the viewport`,
          })
          .toMatchObject({
            visible: true,
            intersectsViewport: true,
            focusIndicator: true,
          })
        const focused = await inspectFocusedElement(page)
        expect(focused, `${route.path} focus ${index + 1}`).not.toBeNull()
        expect(focused?.tag, `${route.path} focus ${index + 1}`).not.toBe("body")
      }

      await page.keyboard.press("Shift+Tab")
      expect((await inspectFocusedElement(page))?.tag).not.toBe("body")
    })
  }
})

test.describe("money-page reduced-motion foundations", () => {
  for (const route of MONEY_ROUTES) {
    test(`${route.path} has no meaningful active motion when reduced`, async ({ browser }, testInfo) => {
      test.setTimeout(90_000)
      const { context, page } = await newFoundationPage(browser, testInfo, {
        width: 390,
        height: 844,
        reducedMotion: "reduce",
      })
      try {
        await gotoPublicRoute(page, route.path)
        expect(
          await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
        ).toBe(true)
        const findings = await collectReducedMotionFindings(page)
        expect(
          findings,
          `${route.path} reduced-motion timelines:\n${JSON.stringify(findings, null, 2)}`,
        ).toEqual([])

        if (route.path === "/") {
          const staticMenu = page.locator('nav[data-mobile-menu-motion="static"]')
          await expect(staticMenu).toBeAttached()
          await page.getByRole("button", { name: "Open menu" }).click()

          const panel = page.locator('[data-mobile-menu-panel="true"]')
          const content = page.locator('[data-mobile-menu-content="true"]')
          await expect(panel).toBeVisible()
          await expect(content).toBeVisible()

          const first = await content.evaluate((element) => {
            const style = getComputedStyle(element)
            const rect = element.getBoundingClientRect()
            return {
              opacity: style.opacity,
              transform: style.transform,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
            }
          })
          await page.waitForTimeout(50)
          const second = await content.evaluate((element) => {
            const style = getComputedStyle(element)
            const rect = element.getBoundingClientRect()
            return {
              opacity: style.opacity,
              transform: style.transform,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
            }
          })

          expect(first).toEqual(second)
          expect(first.opacity).toBe("1")
          expect(first.transform).toBe("none")

          const firstMenuLink = content.locator("ul li a[href]").first()
          const firstMenuItem = firstMenuLink.locator("xpath=ancestor::li[1]")
          await firstMenuLink.hover()
          await expect(firstMenuItem).toHaveCSS("transform", "none")
          expect(await inspectActiveMeaningfulAnimations(page)).toEqual([])
          await page.getByRole("button", { name: "Close menu" }).click()
        }
      } finally {
        await context.close()
      }
    })
  }
})

test.describe("mobile sticky purchase foundations", () => {
  for (const path of STICKY_SERVICE_ROUTES) {
    test(`${path} keeps Quick purchase off-canvas until the hero passes`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 844 })
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, path)
      await finishFiniteEntranceAnimations(page)

      const region = page.locator('[role="region"][aria-label="Quick purchase"]')
      await expect(region).toBeAttached()
      expect(await region.evaluate((element) => element.hasAttribute("inert"))).toBe(true)
      const rect = await region.boundingBox()
      expect(rect?.y ?? 0).toBeGreaterThanOrEqual(843)

      for (let pass = 0; pass < 24; pass += 1) {
        if (!(await region.evaluate((element) => element.hasAttribute("inert")))) break
        await page.evaluate(() => window.scrollBy(0, Math.max(320, window.innerHeight / 2)))
        await page.waitForTimeout(40)
      }

      await expect
        .poll(() => region.evaluate((element) => element.hasAttribute("inert")))
        .toBe(false)
      await expect
        .poll(async () => {
          const visibleRect = await region.boundingBox()
          return visibleRect
            ? {
                topInside: visibleRect.y >= -1,
                bottomInside: visibleRect.y + visibleRect.height <= 845,
              }
            : null
        })
        .toEqual({ topInside: true, bottomInside: true })
      const stickyLink = region.locator("a[href]").first()
      await expect(stickyLink).toBeVisible()
      expect(await stickyLink.evaluate((element) => (element as HTMLElement).tabIndex)).toBeGreaterThanOrEqual(0)

      await page.evaluate(() => window.scrollTo(0, 0))
      await expect
        .poll(() => region.evaluate((element) => element.hasAttribute("inert")))
        .toBe(true)
      await expect
        .poll(async () => (await region.boundingBox())?.y ?? 0)
        .toBeGreaterThanOrEqual(843)
    })
  }

  test("pricing sticky CTA settles fully inside the mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 844 })
    await seedMoneyPageState(page, "light")
    await gotoPublicRoute(page, "/pricing")
    const pricingCards = page.locator("#pricing-cards")
    await expect(pricingCards).toBeVisible()
    await pricingCards.evaluate((element) => {
      const target = element as HTMLElement
      window.scrollTo(0, target.offsetTop + target.clientHeight + 100)
    })

    const sticky = page
      .locator("div.fixed.bottom-0")
      .filter({ has: page.getByRole("link", { name: "Get started", exact: true }) })
      .last()
    await expect(sticky).toBeVisible()
    await expect
      .poll(async () => {
        const rect = await sticky.boundingBox()
        return rect
          ? {
              topInside: rect.y >= -1,
              bottomInside: rect.y + rect.height <= 845,
            }
          : null
      })
      .toEqual({ topInside: true, bottomInside: true })
  })
})

test("patient entry controls retain the 48px internal target", async ({ browser }, testInfo) => {
  test.setTimeout(120_000)
  const entries = [
    { path: "/request", ready: /What brings you in today/i },
    { path: "/request?service=med-cert", ready: /Certificate type/i },
    { path: "/request?service=repeat-script", ready: /Medication name/i },
    { path: "/request?service=consult&subtype=ed", ready: /What matters most right now/i },
  ] as const

  for (const entry of entries) {
    const { context, page } = await newFoundationPage(browser, testInfo, {
      width: 375,
      height: 844,
    })
    try {
      if (entry.path === "/request") await gotoPublicRoute(page, entry.path)
      else await gotoIntakeEntry(page, entry.path)
      await expect(page.getByText(entry.ready).first()).toBeVisible({ timeout: 25_000 })

      const targets = await inspectPatientTargets(page)
      expect(targets.count, `${entry.path} visible patient targets`).toBeGreaterThan(0)
      expect(
        targets.failures,
        `${entry.path} undersized patient targets:\n${JSON.stringify(targets.failures, null, 2)}`,
      ).toEqual([])
    } finally {
      await context.close()
    }
  }
})
