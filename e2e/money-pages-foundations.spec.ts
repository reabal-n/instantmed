import {
  type Browser,
  expect,
  type Locator,
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
  walkPublicPageForReveals,
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

const STICKY_STRESS_STATES = [
  { name: "zoom-200-proxy", width: 188, height: 422, deviceScaleFactor: 2 },
  { name: "root-32-at-375", width: 375, height: 844, deviceScaleFactor: 1, rootFontSize: 32 },
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

async function applyRootFontSize(page: Page, size?: number) {
  if (!size) return
  await page.addStyleTag({ content: `:root { font-size: ${size}px !important; }` })
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
    .toBe(`${size}px`)
}

async function inspectVisibleStickyRegion(page: Page, region: Locator) {
  const regionMetrics = await region.evaluate((element) => {
    const rootRect = element.getBoundingClientRect()
    const tolerance = 2
    const failures: Array<{ kind: string; label: string; left: number; right: number }> = []
    const clean = (value: string | null) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 100)
    const visible = (node: Element) => {
      if (node.closest("[hidden],[inert],[aria-hidden='true'],.sr-only")) return false
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.01 && rect.width > 0 && rect.height > 0
    }
    const inspectRect = (kind: string, label: string, rect: DOMRect) => {
      if (
        rect.left < Math.max(0, rootRect.left) - tolerance ||
        rect.right > Math.min(document.documentElement.clientWidth, rootRect.right) + tolerance
      ) {
        failures.push({ kind, label: clean(label), left: rect.left, right: rect.right })
      }
    }

    for (const control of element.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea')) {
      if (visible(control)) inspectRect("control", control.getAttribute("aria-label") || control.textContent || control.tagName, control.getBoundingClientRect())
    }

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const text = walker.currentNode as Text
      const parent = text.parentElement
      if (!parent || !clean(text.textContent) || !visible(parent)) continue
      const range = document.createRange()
      range.selectNodeContents(text)
      for (const rect of range.getClientRects()) {
        if (rect.width > 0 && rect.height > 0) inspectRect("text", text.textContent || "", rect)
      }
    }

    return {
      top: rootRect.top,
      bottom: rootRect.bottom,
      left: rootRect.left,
      right: rootRect.right,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
      failures,
    }
  })

  const audit = await inspectMeaningfulHorizontalOverflow(page)
  return { regionMetrics, audit }
}

async function inspectFocusedElement(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement
    if (!(element instanceof HTMLElement)) return null

    const inlineTransition = element.style.getPropertyValue("transition")
    const inlineTransitionPriority = element.style.getPropertyPriority("transition")
    element.style.setProperty("transition", "none", "important")
    void element.offsetWidth

    const focusedStyle = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    const focusedPaint = {
      outlineStyle: focusedStyle.outlineStyle,
      outlineWidth: focusedStyle.outlineWidth,
      outlineColor: focusedStyle.outlineColor,
      outlineOffset: focusedStyle.outlineOffset,
      boxShadow: focusedStyle.boxShadow,
    }
    const focusedVisibility = {
      display: focusedStyle.display,
      visibility: focusedStyle.visibility,
      opacity: focusedStyle.opacity,
    }
    const focusVisible = element.matches(":focus-visible")

    const sentinel = document.createElement("button")
    sentinel.tabIndex = -1
    sentinel.setAttribute("aria-hidden", "true")
    sentinel.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"
    document.body.append(sentinel)
    sentinel.focus({ preventScroll: true })
    void element.offsetWidth

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

    type Rgba = { r: number; g: number; b: number; a: number }

    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext("2d", { willReadFrequently: true })

    const parseColor = (value: string): Rgba | null => {
      if (!context || !value || value === "none") return null
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = "rgba(0, 0, 0, 0)"
      try {
        context.fillStyle = value
      } catch {
        return null
      }
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data
      return { r, g, b, a: alpha / 255 }
    }

    const composite = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground.a + background.a * (1 - foreground.a)
      if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 }
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha,
      }
    }

    const channel = (value: number) => {
      const normalized = value / 255
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    }
    const luminance = (color: Rgba) =>
      0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
    const contrast = (a: Rgba, b: Rgba) => {
      const lighter = Math.max(luminance(a), luminance(b))
      const darker = Math.min(luminance(a), luminance(b))
      return (lighter + 0.05) / (darker + 0.05)
    }

    const ancestors: HTMLElement[] = []
    let backgroundNode: HTMLElement | null = element.parentElement
    while (backgroundNode) {
      ancestors.push(backgroundNode)
      backgroundNode = backgroundNode.parentElement
    }
    let adjacentBackground: Rgba = { r: 255, g: 255, b: 255, a: 1 }
    for (const ancestor of ancestors.reverse()) {
      const layer = parseColor(getComputedStyle(ancestor).backgroundColor)
      if (layer && layer.a > 0) adjacentBackground = composite(layer, adjacentBackground)
    }

    const outlineChanged =
      focusedPaint.outlineStyle !== unfocusedPaint.outlineStyle ||
      focusedPaint.outlineWidth !== unfocusedPaint.outlineWidth ||
      focusedPaint.outlineColor !== unfocusedPaint.outlineColor ||
      focusedPaint.outlineOffset !== unfocusedPaint.outlineOffset
    const outlineWidth = Number.parseFloat(focusedPaint.outlineWidth) || 0
    const outlineColor = parseColor(focusedPaint.outlineColor)
    const outlineContrast =
      focusedPaint.outlineStyle !== "none" &&
      outlineChanged &&
      outlineWidth >= 1 &&
      outlineColor &&
      outlineColor.a > 0.01
        ? contrast(composite(outlineColor, adjacentBackground), adjacentBackground)
        : 0

    const splitShadows = (value: string) => {
      const layers: string[] = []
      let depth = 0
      let start = 0
      for (let index = 0; index < value.length; index += 1) {
        const character = value[index]
        if (character === "(") depth += 1
        if (character === ")") depth = Math.max(0, depth - 1)
        if (character === "," && depth === 0) {
          layers.push(value.slice(start, index).trim())
          start = index + 1
        }
      }
      layers.push(value.slice(start).trim())
      return layers.filter(Boolean)
    }

    const unfocusedLayers = new Set(splitShadows(unfocusedPaint.boxShadow))
    const colorToken = /(rgba?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8})/i
    let ringGeometry = 0
    let ringContrast = 0

    for (const layer of splitShadows(focusedPaint.boxShadow)) {
      if (layer === "none" || unfocusedLayers.has(layer)) continue
      const token = layer.match(colorToken)?.[0]
      if (!token) continue
      const color = parseColor(token)
      if (!color || color.a <= 0.01) continue

      const lengths = layer
        .replace(token, "")
        .match(/-?\d*\.?\d+px/g)
        ?.map((value) => Math.abs(Number.parseFloat(value))) ?? []
      const [x = 0, y = 0, blur = 0, spread = 0] = lengths
      const geometry = Math.max(x, y) + blur + spread
      if (geometry < 1) continue

      ringGeometry = Math.max(ringGeometry, geometry)
      ringContrast = Math.max(
        ringContrast,
        contrast(composite(color, adjacentBackground), adjacentBackground),
      )
    }

    const indicatorGeometry = Math.max(outlineWidth, ringGeometry)
    const indicatorContrast = Math.max(outlineContrast, ringContrast)

    const path: string[] = []
    let pathNode: Element | null = element
    while (pathNode && pathNode !== document.body) {
      if (pathNode.id) {
        path.unshift(`${pathNode.tagName.toLowerCase()}#${pathNode.id}`)
        break
      }
      const tag = pathNode.tagName.toLowerCase()
      const siblings = pathNode.parentElement
        ? Array.from(pathNode.parentElement.children).filter((child) => child.tagName === pathNode?.tagName)
        : []
      path.unshift(`${tag}:nth-of-type(${Math.max(1, siblings.indexOf(pathNode) + 1)})`)
      pathNode = pathNode.parentElement
    }

    return {
      focusKey: `${path.join(">")}::${element.getAttribute("href") ?? ""}::${element.getAttribute("aria-label") ?? ""}`,
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
        focusedVisibility.display !== "none" &&
        focusedVisibility.visibility !== "hidden" &&
        Number(focusedVisibility.opacity) > 0.01 &&
        rect.width > 0 &&
        rect.height > 0,
      intersectsViewport:
        rect.right > 0 &&
        rect.left < window.innerWidth &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight,
      isSkipLink: element.matches('a[href="#main-content"]'),
      insideHeader: Boolean(element.closest("header")),
      insideMain: Boolean(element.closest("main")),
      insideFooter: Boolean(element.closest("footer")),
      insideMobileMenu: Boolean(element.closest('[data-mobile-menu-content="true"]')),
      focusIndicator:
        focusVisible && indicatorGeometry >= 1 && indicatorContrast >= 3,
      indicatorGeometry: Math.round(indicatorGeometry * 100) / 100,
      indicatorContrast: Math.round(indicatorContrast * 100) / 100,
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

async function inspectReducedMotionFinalState(page: Page) {
  return page.evaluate(() => {
    const identityTransforms = new Set([
      "none",
      "matrix(1, 0, 0, 1, 0, 0)",
      "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)",
    ])
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reduced-motion-final]"),
    )

    return {
      count: elements.length,
      failures: elements.flatMap((element) => {
        const style = getComputedStyle(element)
        const opacity = Number(style.opacity)
        if (opacity >= 0.999 && identityTransforms.has(style.transform)) return []
        return [{
          marker: element.dataset.reducedMotionFinal,
          opacity: style.opacity,
          transform: style.transform,
        }]
      }),
    }
  })
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

async function prepareKeyboardPage(page: Page, path: string) {
  await page.setViewportSize({ width: 375, height: 844 })
  await seedMoneyPageState(page, "light")
  await gotoPublicRoute(page, path)
  await expect(page.locator('a[href="#main-content"]').first()).toHaveAttribute(
    "data-skip-link-hydrated",
    "true",
  )
  await finishFiniteEntranceAnimations(page)
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      *, *::before, *::after {
        transition-property: none !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  })
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
}

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 80) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return index
    await page.keyboard.press("Tab")
  }

  await expect(target, `target should be reachable within ${maxTabs} Tab presses`).toBeFocused()
  return maxTabs
}

async function inspectSequentialHeaderControls(page: Page) {
  return page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'header a[href],header button,header input:not([type="hidden"]),header select,header textarea,header [tabindex]',
      ),
    )

    return Array.from(
      new Set(
        candidates.flatMap((element) => {
          if (
            element.tabIndex < 0 ||
            element.matches(":disabled") ||
            element.closest('[hidden],[inert],[aria-hidden="true"]')
          ) {
            return []
          }

          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number(style.opacity) <= 0.01 ||
            rect.width <= 0 ||
            rect.height <= 0
          ) {
            return []
          }

          const name = String(
            element.getAttribute("aria-label") ||
              element.textContent ||
              element.getAttribute("href") ||
              element.id,
          )
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 120)
          return [`${element.tagName.toLowerCase()}:${name}`]
        }),
      ),
    )
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
          const audit = await walkPublicPageForReveals(page, { inspectReflow: true })
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

  test("request progress preserves 48px actionable targets without overlap at the zoom proxy", async ({ browser }, testInfo) => {
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
          nav.querySelectorAll<HTMLElement>('[data-request-progress-actionable="true"]'),
        ).map((button) => {
          const style = getComputedStyle(button)
          const rect = button.getBoundingClientRect()
          return {
            minWidth: style.minWidth,
            minHeight: style.minHeight,
            width: rect.width,
            height: rect.height,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          }
        })
        const overlaps = buttons.flatMap((button, index) =>
          buttons.slice(index + 1).filter((other) =>
            button.left < other.right - 1 &&
            button.right > other.left + 1 &&
            button.top < other.bottom - 1 &&
            button.bottom > other.top + 1,
          ).map(() => index),
        )
        return {
          left: navRect.left,
          right: navRect.right,
          viewportWidth: document.documentElement.clientWidth,
          buttons,
          overlaps,
        }
      })

      expect(metrics.left).toBeGreaterThanOrEqual(-1)
      expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1)
      expect(metrics.buttons.length).toBeGreaterThan(0)
      expect(metrics.overlaps).toEqual([])
      for (const button of metrics.buttons) {
        expect(Number.parseFloat(button.minWidth)).toBeGreaterThanOrEqual(48)
        expect(Number.parseFloat(button.minHeight)).toBeGreaterThanOrEqual(48)
        expect(button.width).toBeGreaterThanOrEqual(47.5)
        expect(button.height).toBeGreaterThanOrEqual(47.5)
      }
    } finally {
      await context.close()
    }
  })

  test("the open mobile drawer stays bounded and closable at the zoom proxy", async ({ browser }, testInfo) => {
    const { context, page } = await newFoundationPage(browser, testInfo, {
      width: 188,
      height: 422,
      deviceScaleFactor: 2,
    })
    try {
      await gotoPublicRoute(page, "/")
      await expect(page.locator('nav[data-mobile-menu-hydrated="true"]')).toBeAttached()
      const open = page.getByRole("button", { name: "Open menu" })
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await tabUntilFocused(page, open, 8)
      await page.keyboard.press("Enter")
      await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true")
      const content = page.locator('[data-mobile-menu-content="true"]')
      const panel = page.locator('[data-mobile-menu-panel="true"]')
      const close = page.getByRole("button", { name: "Close menu" })
      await expect(content).toBeVisible()
      await expect(panel).toBeVisible()
      await expect(close).toBeVisible()
      await finishFiniteEntranceAnimations(page)

      const bounds = await content.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const closeButton = document.querySelector<HTMLElement>('button[aria-label="Close menu"]')
        const closeRect = closeButton?.getBoundingClientRect()
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          bodyOverflow: getComputedStyle(document.body).overflow,
          closeLeft: closeRect?.left ?? -1,
          closeRight: closeRect?.right ?? Number.POSITIVE_INFINITY,
        }
      })
      expect(bounds.left).toBeGreaterThanOrEqual(-1)
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1)
      expect(bounds.width).toBeLessThanOrEqual(bounds.viewportWidth + 1)
      expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1)
      expect(bounds.closeLeft).toBeGreaterThanOrEqual(-1)
      expect(bounds.closeRight).toBeLessThanOrEqual(bounds.viewportWidth + 1)
      expect(bounds.bodyOverflow).toBe("hidden")

      const audit = await inspectMeaningfulHorizontalOverflow(page)
      expect(audit.scrollWidth).toBeLessThanOrEqual(audit.clientWidth + 1)
      expect(audit.findings).toEqual([])

      await page.keyboard.press("Escape")
      await expect(content).toBeHidden()
      await expect(open).toBeFocused()
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden")
    } finally {
      await context.close()
    }
  })
})

test.describe("money-page keyboard foundations", () => {
  for (const activationKey of ["Enter", "Space"] as const) {
    test(`mobile drawer contains focus after ${activationKey} and restores its trigger`, async ({ page }) => {
      await prepareKeyboardPage(page, "/")

      const open = page.getByRole("button", { name: "Open menu" })
      await page.keyboard.press("Tab")
      await expect(page.locator('a[href="#main-content"]').first()).toBeFocused()
      await tabUntilFocused(page, open, 8)
      await page.keyboard.press(activationKey)

      const close = page.getByRole("button", { name: "Close menu" })
      const content = page.locator('[data-mobile-menu-content="true"]')
      const firstNavigationLink = content.locator("ul a[href]").first()
      await expect(close).toHaveAttribute("aria-expanded", "true")
      await expect(content).toBeVisible()
      await expect(firstNavigationLink).toBeFocused()
      await expect(content.locator('li[tabindex="0"]')).toHaveCount(0)

      let reachedThemeSwitch = false
      let reachedCloseBoundary = false
      for (let index = 0; index < 80; index += 1) {
        const active = await page.evaluate(() => {
          const element = document.activeElement
          if (!(element instanceof HTMLElement)) return null
          const contentRoot = document.querySelector('[data-mobile-menu-content="true"]')
          return {
            tag: element.tagName.toLowerCase(),
            name: element.getAttribute("aria-label") || element.textContent?.trim() || "",
            insideContent: Boolean(contentRoot?.contains(element)),
            isCloseTrigger: element.matches('button[aria-label="Close menu"]'),
            isThemeSwitch: element.matches('[role="switch"][aria-label^="Switch to "]'),
          }
        })

        expect(active, `${activationKey} drawer focus ${index + 1}`).not.toBeNull()
        if (active?.isCloseTrigger) {
          reachedCloseBoundary = true
          break
        }
        expect(
          active?.insideContent,
          `${activationKey} drawer focus escaped to ${active?.tag}:${active?.name}`,
        ).toBe(true)
        expect(["a", "button"]).toContain(active?.tag)
        reachedThemeSwitch ||= Boolean(active?.isThemeSwitch)
        await page.keyboard.press("Tab")
      }

      expect(reachedThemeSwitch, `${activationKey} should reach the mobile theme switch`).toBe(true)
      expect(reachedCloseBoundary, `${activationKey} should wrap the last drawer control to Close menu`).toBe(true)

      await page.keyboard.press("Shift+Tab")
      expect(
        await content.evaluate((element) => element.contains(document.activeElement)),
        `${activationKey} reverse Tab should wrap back into drawer content`,
      ).toBe(true)
      await page.keyboard.press("Tab")
      await expect(close).toBeFocused()
      await page.keyboard.press("Tab")
      expect(
        await content.evaluate((element) => element.contains(document.activeElement)),
        `${activationKey} forward Tab from Close menu should re-enter drawer content`,
      ).toBe(true)

      await page.keyboard.press("Escape")
      await expect(content).toBeHidden()
      await expect(open).toBeFocused()
      await expect(open).toHaveAttribute("aria-expanded", "false")
    })
  }

  for (const route of MONEY_ROUTES) {
    test(`${route.path} skip navigation activates the main-content target`, async ({ page }) => {
      test.setTimeout(150_000)
      await prepareKeyboardPage(page, route.path)

      const skipLink = page.locator('a[href="#main-content"]').first()
      await page.keyboard.press("Tab")
      await expect(skipLink).toBeFocused()
      await expect(skipLink).toBeVisible()
      const skipFocus = await inspectFocusedElement(page)
      expect(skipFocus?.isSkipLink).toBe(true)
      expect(
        skipFocus?.focusIndicator,
        `${route.path} skip link focus paint:\n${JSON.stringify(skipFocus, null, 2)}`,
      ).toBe(true)

      await expect(skipLink).toHaveAttribute("href", "#main-content")
      await page.keyboard.press("Enter")
      const mainContent = page.locator("#main-content main").first()
      await expect(mainContent).toBeFocused()
      await expect(mainContent).toHaveJSProperty("tagName", "MAIN")
      expect(new URL(page.url()).hash).toBe("#main-content")
      expect(
        await mainContent.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          return rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight
        }),
        `${route.path} skip target should intersect the viewport`,
      ).toBe(true)

      await page.keyboard.press("Tab")
      expect(
        await page.evaluate(() => Boolean(document.activeElement?.closest("header"))),
        `${route.path} next Tab after skip activation must not return to route header controls`,
      ).toBe(false)
    })

    test(`${route.path} completes an uninterrupted document Tab cycle`, async ({ page }) => {
      test.setTimeout(150_000)
      await prepareKeyboardPage(page, route.path)

      const skipLink = page.locator('a[href="#main-content"]').first()
      await page.keyboard.press("Tab")
      await expect(skipLink).toBeFocused()
      const skipFocus = await inspectFocusedElement(page)
      expect(skipFocus).toMatchObject({ isSkipLink: true, focusIndicator: true })

      const expectedHeaderControls = new Set(await inspectSequentialHeaderControls(page))
      const seen = new Set<string>()
      const headerControls = new Set<string>()
      let nonHeaderControlCount = 0
      let firstPostSkipFocus: Awaited<ReturnType<typeof inspectFocusedElement>> = null
      let completedCycle = false
      let browserBoundaryTransitions = 0
      let expectingSkipAfterBoundary = false
      for (let index = 0; index < 240; index += 1) {
        await page.keyboard.press("Tab")
        const activeTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? "none")
        if (activeTag === "body" || activeTag === "nextjs-portal") {
          if (!expectingSkipAfterBoundary) browserBoundaryTransitions += 1
          expect(
            browserBoundaryTransitions,
            `${route.path} should cross the browser or Next.js dev-tools focus boundary at most once`,
          ).toBeLessThanOrEqual(1)
          expectingSkipAfterBoundary = true
          continue
        }

        let focusViewportObservation: Record<string, unknown> | null = null
        await expect(async () => {
          focusViewportObservation = await page.evaluate(() => {
            const active = document.activeElement
            if (!(active instanceof HTMLElement)) return { intersects: false, tag: "none" }
            const rect = active.getBoundingClientRect()
            const style = getComputedStyle(active)
            const inertAncestor = active.closest("[inert]")
            return {
              intersects:
                rect.right > 0 &&
                rect.left < window.innerWidth &&
                rect.bottom > 0 &&
                rect.top < window.innerHeight,
              tag: active.tagName.toLowerCase(),
              name: String(
                active.getAttribute("aria-label") ||
                active.textContent ||
                active.getAttribute("href") ||
                active.id,
              ).trim().replace(/\s+/g, " ").slice(0, 120),
              href: active.getAttribute("href") || "",
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              position: style.position,
              transform: style.transform,
              visibility: style.visibility,
              opacity: style.opacity,
              inert: Boolean(inertAncestor),
              inertAncestor: inertAncestor?.tagName.toLowerCase() ?? "",
              disabled: active.matches(":disabled"),
              connected: active.isConnected,
              scrollY: Math.round(window.scrollY),
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              intentionalOverflow: Boolean(active.closest('[role="marquee"],[data-a11y-intentional-overflow="true"]')),
            }
          })
          expect(
            focusViewportObservation,
            `${route.path} focus ${index + 1} should settle inside the viewport:\n${JSON.stringify(focusViewportObservation, null, 2)}`,
          ).toMatchObject({ intersects: true })
        }).toPass({ timeout: 5_000 })
        const focused = await inspectFocusedElement(page)
        expect(focused, `${route.path} focus ${index + 1}`).not.toBeNull()
        if (expectingSkipAfterBoundary) {
          expect(
            focused?.isSkipLink,
            `${route.path} should return directly to the skip link after the focus boundary`,
          ).toBe(true)
        }
        if (focused?.isSkipLink) {
          completedCycle = true
          break
        }
        firstPostSkipFocus ??= focused

        expect(
          seen.has(focused?.focusKey ?? ""),
          `${route.path} repeated ${focused?.focusKey} before completing the keyboard cycle`,
        ).toBe(false)
        seen.add(focused?.focusKey ?? "")
        if (focused?.insideHeader) {
          headerControls.add(`${focused.tag}:${focused.name}`)
        } else {
          nonHeaderControlCount += 1
        }

        expect(
          focused,
          `${route.path} focus ${index + 1} paint:\n${JSON.stringify(focused, null, 2)}`,
        ).toMatchObject({
          visible: true,
          intersectsViewport: true,
          focusIndicator: true,
        })
        expect(
          focused?.indicatorGeometry ?? 0,
          `${route.path} ${focused?.name} focus indicator geometry`,
        ).toBeGreaterThanOrEqual(1)
        expect(
          focused?.indicatorContrast ?? 0,
          `${route.path} ${focused?.name} focus indicator contrast`,
        ).toBeGreaterThanOrEqual(3)
      }

      expect(completedCycle, `${route.path} should complete a full keyboard focus cycle`).toBe(true)
      expect(seen.size, `${route.path} should expose at least one post-skip focus target`).toBeGreaterThan(0)
      for (const expectedControl of expectedHeaderControls) {
        expect(
          headerControls.has(expectedControl),
          `${route.path} should traverse header control ${expectedControl}; saw: ${Array.from(headerControls).join(", ")}`,
        ).toBe(true)
      }
      if (expectedHeaderControls.size > 0) {
        expect(
          firstPostSkipFocus?.insideHeader,
          `${route.path} should continue from skip navigation into its first header control`,
        ).toBe(true)
      }
      expect(
        nonHeaderControlCount,
        `${route.path} should continue from the header through the remaining document controls`,
      ).toBeGreaterThan(0)
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
        const finalState = await inspectReducedMotionFinalState(page)
        expect(
          finalState.failures,
          `${route.path} reduced-motion final paint:\n${JSON.stringify(finalState.failures, null, 2)}`,
        ).toEqual([])
        if (route.path === "/") {
          expect(finalState.count, "homepage reduced-motion final-state markers").toBeGreaterThan(1)
        }

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

    test(`${path} keeps the expanded Quick purchase usable in sticky stress states`, async ({ browser }, testInfo) => {
      test.setTimeout(120_000)

      for (const state of STICKY_STRESS_STATES) {
        const { context, page } = await newFoundationPage(browser, testInfo, state)
        try {
          await gotoPublicRoute(page, path)
          await applyRootFontSize(page, "rootFontSize" in state ? state.rootFontSize : undefined)

          const region = page.locator('[role="region"][aria-label="Quick purchase"]')
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
          await waitTwoFrames(page)
          await expect.poll(() => region.evaluate((element) => element.hasAttribute("inert"))).toBe(false)

          // An upward beat restores the expanded summary while leaving the
          // hero out of view, so the stress assertion covers every sticky row.
          await page.evaluate(() => window.scrollBy(0, -24))
          await waitTwoFrames(page)
          await expect.poll(() => region.evaluate((element) => element.hasAttribute("inert"))).toBe(false)
          await finishFiniteEntranceAnimations(page)
          await expect.poll(async () => {
            const rect = await region.boundingBox()
            return rect ? rect.y + rect.height : Number.POSITIVE_INFINITY
          }).toBeLessThanOrEqual(state.height + 1)

          const { regionMetrics, audit } = await inspectVisibleStickyRegion(page, region)
          expect(regionMetrics.top, `${path} ${state.name} sticky top`).toBeGreaterThanOrEqual(-1)
          expect(regionMetrics.bottom, `${path} ${state.name} sticky bottom`).toBeLessThanOrEqual(regionMetrics.viewportHeight + 1)
          expect(regionMetrics.left, `${path} ${state.name} sticky left`).toBeGreaterThanOrEqual(-1)
          expect(regionMetrics.right, `${path} ${state.name} sticky right`).toBeLessThanOrEqual(regionMetrics.viewportWidth + 1)
          expect(regionMetrics.scrollWidth, `${path} ${state.name} sticky local width`).toBeLessThanOrEqual(regionMetrics.clientWidth + 1)
          expect(regionMetrics.failures, `${path} ${state.name} sticky content overflow`).toEqual([])
          expect(audit.scrollWidth, `${path} ${state.name} document width`).toBeLessThanOrEqual(audit.clientWidth + 1)
          expect(audit.findings, `${path} ${state.name} semantic overflow`).toEqual([])
        } finally {
          await context.close()
        }
      }
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

  test("pricing sticky CTA remains usable in sticky stress states", async ({ browser }, testInfo) => {
    for (const state of STICKY_STRESS_STATES) {
      const { context, page } = await newFoundationPage(browser, testInfo, state)
      try {
        await gotoPublicRoute(page, "/pricing")
        await applyRootFontSize(page, "rootFontSize" in state ? state.rootFontSize : undefined)
        const pricingCards = page.locator("#pricing-cards")
        await pricingCards.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

        const sticky = page
          .locator("div.fixed.bottom-0")
          .filter({ has: page.getByRole("link", { name: "Get started", exact: true }) })
          .last()
        await expect(sticky).toBeVisible()
        await expect.poll(async () => {
          const rect = await sticky.boundingBox()
          return rect ? rect.y + rect.height : Number.POSITIVE_INFINITY
        }).toBeLessThanOrEqual(state.height + 1)
        await finishFiniteEntranceAnimations(page)

        const { regionMetrics, audit } = await inspectVisibleStickyRegion(page, sticky)
        expect(regionMetrics.top, `${state.name} pricing sticky top`).toBeGreaterThanOrEqual(-1)
        expect(regionMetrics.bottom, `${state.name} pricing sticky bottom`).toBeLessThanOrEqual(regionMetrics.viewportHeight + 1)
        expect(regionMetrics.scrollWidth, `${state.name} pricing sticky local width`).toBeLessThanOrEqual(regionMetrics.clientWidth + 1)
        expect(regionMetrics.failures, `${state.name} pricing sticky content overflow`).toEqual([])
        expect(audit.scrollWidth, `${state.name} pricing document width`).toBeLessThanOrEqual(audit.clientWidth + 1)
        expect(audit.findings, `${state.name} pricing semantic overflow`).toEqual([])
      } finally {
        await context.close()
      }
    }
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
