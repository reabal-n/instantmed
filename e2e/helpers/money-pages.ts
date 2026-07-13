import { expect, type Page } from "@playwright/test"

export type MoneyPageTheme = "light" | "dark"

export const MONEY_ROUTES = [
  { name: "Homepage", path: "/" },
  { name: "Medical Certificate", path: "/medical-certificate" },
  { name: "Prescriptions", path: "/prescriptions" },
  { name: "Erectile Dysfunction", path: "/erectile-dysfunction" },
  { name: "Hair Loss", path: "/hair-loss" },
  { name: "Women's Health", path: "/womens-health" },
  { name: "UTI Assessment", path: "/uti-assessment-online" },
  { name: "Contraceptive Pill Assessment", path: "/contraceptive-pill-assessment-online" },
  { name: "Pricing", path: "/pricing" },
  { name: "Request Flow", path: "/request" },
  { name: "Consult", path: "/consult" },
] as const

export const LEGACY_LIGHT_ROUTES = [
  { name: "FAQ", path: "/faq" },
  { name: "Contact", path: "/contact" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Sign In", path: "/sign-in" },
] as const

const COOKIE_CONSENT = JSON.stringify({
  essential: true,
  analytics: false,
  marketing: false,
  version: "1.0",
  acceptedAt: "2026-07-13T00:00:00.000Z",
})

export async function seedMoneyPageState(page: Page, theme: MoneyPageTheme = "light") {
  await page.emulateMedia({ colorScheme: theme })
  await page.addInitScript(
    ({ consent, resolvedTheme }) => {
      window.localStorage.setItem("instantmed_cookie_consent", consent)
      window.localStorage.setItem("theme", resolvedTheme)
    },
    { consent: COOKIE_CONSENT, resolvedTheme: theme },
  )
}

export async function gotoPublicRoute(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" })
  const expectedPathname = new URL(path, "https://instantmed.test").pathname

  expect(response?.status(), `${path} should return HTTP 200`).toBe(200)
  expect(new URL(page.url()).pathname, `${path} should not redirect`).toBe(expectedPathname)
  await expect(
    page.getByRole("heading", { level: 1 }).first(),
    `${path} should render an h1`,
  ).toBeVisible({ timeout: 25_000 })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))

  return response
}

export async function gotoIntakeEntry(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" })

  expect(response?.status(), `${path} should return HTTP 200`).toBe(200)
  expect(new URL(page.url()).pathname, `${path} should stay on /request`).toBe("/request")
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 25_000 })
  await expect(page.locator('[data-patient-flow="true"]')).toBeVisible({ timeout: 25_000 })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))

  return response
}

export async function assertResolvedTheme(page: Page, theme: MoneyPageTheme) {
  await expect
    .poll(
      () =>
        page.evaluate((expectedTheme) => {
          const root = document.documentElement
          return {
            stored: window.localStorage.getItem("theme"),
            resolved: root.classList.contains(expectedTheme),
            opposite: root.classList.contains(expectedTheme === "dark" ? "light" : "dark"),
          }
        }, theme),
      { message: `the app should resolve ${theme} through next-themes` },
    )
    .toEqual({ stored: theme, resolved: true, opposite: false })
}

/**
 * Fast-forward only finite entrances. Infinite status indicators and marquees
 * remain active so Axe still sees the real application state.
 */
export async function finishFiniteEntranceAnimations(page: Page) {
  await page.evaluate(async () => {
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    for (let pass = 0; pass < 6; pass += 1) {
      await nextFrame()
      await nextFrame()

      const finite = document
        .getAnimations()
        .filter((animation) => {
          const endTime = animation.effect?.getComputedTiming().endTime
          return (
            typeof endTime === "number" &&
            Number.isFinite(endTime) &&
            (animation.playState === "running" || animation.pending)
          )
        })

      if (finite.length === 0) return

      for (const animation of finite) {
        try {
          animation.finish()
        } catch {
          // A finite animation can be replaced between collection and finish.
          // The next bounded pass will observe its replacement.
        }
      }
    }
  })
}

export interface OverflowFinding {
  kind: "control" | "text"
  selector: string
  text: string
  left: number
  right: number
  boundary: "viewport" | "clipping-ancestor"
  boundarySelector?: string
  boundaryLeft?: number
  boundaryRight?: number
  localClientWidth?: number
  localScrollWidth?: number
}

export interface ReflowAudit {
  clientWidth: number
  scrollWidth: number
  findings: OverflowFinding[]
}

/**
 * Detect semantic content clipped by global overflow rules. Deliberate
 * marquees and explicitly marked decoration are the only broad exclusions;
 * neither overflow-hidden nor pointer-events-none excuses semantic content.
 */
export async function inspectMeaningfulHorizontalOverflow(page: Page): Promise<ReflowAudit> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const tolerance = 2
    const findings: OverflowFinding[] = []

    const clean = (value: string | null | undefined) =>
      String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 160)

    const selector = (element: Element) => {
      if (element.id) return `${element.tagName.toLowerCase()}#${element.id}`
      const role = element.getAttribute("role")
      const name = element.getAttribute("aria-label")
      const classes = Array.from(element.classList).slice(0, 3).join(".")
      return `${element.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}${name ? `[aria-label=${name}]` : ""}${classes ? `.${classes}` : ""}`
    }

    const isVisible = (element: Element) => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false
      if (element.closest("[hidden],[inert],[aria-hidden='true']")) return false
      if (element.closest(".sr-only")) return false

      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.01 &&
        rect.width > 0 &&
        rect.height > 0
      )
    }

    const isIntentionalOverflow = (element: Element) => {
      if (
        element.closest(
          '[role="marquee"],[data-a11y-intentional-overflow="true"],.animate-marquee,.animate-marquee-slow,.animate-marquee-fast',
        )
      ) {
        return true
      }

      return false
    }

    const record = (
      kind: OverflowFinding["kind"],
      element: Element,
      text: string,
      rect: DOMRect,
    ) => {
      const rounded = (value: number) => Math.round(value * 10) / 10
      const base = {
        kind,
        selector: selector(element),
        text: clean(text),
        left: rounded(rect.left),
        right: rounded(rect.right),
      }

      if (rect.left < -tolerance || rect.right > viewportWidth + tolerance) {
        findings.push({ ...base, boundary: "viewport" })
      }

      let ancestor = element.parentElement
      while (ancestor && ancestor !== document.body) {
        if (isIntentionalOverflow(ancestor)) break

        const style = getComputedStyle(ancestor)
        if (style.overflowX === "hidden" || style.overflowX === "clip") {
          const boundaryRect = ancestor.getBoundingClientRect()
          if (
            rect.left < boundaryRect.left - tolerance ||
            rect.right > boundaryRect.right + tolerance
          ) {
            findings.push({
              ...base,
              boundary: "clipping-ancestor",
              boundarySelector: selector(ancestor),
              boundaryLeft: rounded(boundaryRect.left),
              boundaryRight: rounded(boundaryRect.right),
              localClientWidth: ancestor.clientWidth,
              localScrollWidth: ancestor.scrollWidth,
            })
            break
          }
        }
        ancestor = ancestor.parentElement
      }
    }

    const controls = document.querySelectorAll(
      'a[href],button,input,select,textarea,summary,[role="button"],[role="switch"],[role="checkbox"],[role="radio"],[role="combobox"]',
    )
    for (const control of controls) {
      if (!isVisible(control) || isIntentionalOverflow(control)) continue
      record(
        "control",
        control,
        control.getAttribute("aria-label") || control.textContent || control.tagName,
        control.getBoundingClientRect(),
      )
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      const parent = node.parentElement
      if (!parent || !clean(node.textContent) || parent.closest("script,style,svg")) continue
      if (!isVisible(parent) || isIntentionalOverflow(parent)) continue

      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width <= 0 || rect.height <= 0) continue
        record("text", parent, node.textContent || "", rect)
      }
    }

    const unique = Array.from(
      new Map(
        findings.map((finding) => [
          `${finding.kind}:${finding.selector}:${finding.text}:${finding.left}:${finding.right}:${finding.boundary}:${finding.boundarySelector ?? ""}`,
          finding,
        ]),
      ).values(),
    )

    return {
      clientWidth: viewportWidth,
      scrollWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      findings: unique.slice(0, 200),
    }
  })
}

/**
 * Scroll-walk the entire rendered page so viewport-triggered sections reach
 * their settled state. Reflow findings are unioned at every stop; this keeps
 * below-fold text and controls from escaping the audit while they are still
 * hidden by an entrance reveal.
 */
export async function walkPublicPageForReveals(
  page: Page,
  options: { inspectReflow?: boolean } = {},
): Promise<ReflowAudit> {
  const inspectReflow = options.inspectReflow ?? false
  const findings = new Map<string, OverflowFinding>()
  let clientWidth = 0
  let scrollWidth = 0

  const previousScrollBehavior = await page.evaluate(() => {
    const root = document.documentElement
    const previous = {
      value: root.style.getPropertyValue("scroll-behavior"),
      priority: root.style.getPropertyPriority("scroll-behavior"),
    }
    root.style.setProperty("scroll-behavior", "auto", "important")
    window.scrollTo(0, 0)
    return previous
  })

  for (let pass = 0; pass < 240; pass += 1) {
    await finishFiniteEntranceAnimations(page)

    if (inspectReflow) {
      const audit = await inspectMeaningfulHorizontalOverflow(page)
      clientWidth = audit.clientWidth
      scrollWidth = Math.max(scrollWidth, audit.scrollWidth)
      for (const finding of audit.findings) {
        findings.set(
          `${finding.kind}:${finding.selector}:${finding.text}:${finding.left}:${finding.right}:${finding.boundary}:${finding.boundarySelector ?? ""}`,
          finding,
        )
      }
    }

    const scroll = await page.evaluate(() => {
      const root = document.documentElement
      const max = Math.max(0, root.scrollHeight - window.innerHeight)
      const current = window.scrollY
      if (current >= max - 2) return { done: true, next: max }

      const step = Math.max(160, Math.floor(window.innerHeight * 0.75))
      return { done: false, next: Math.min(max, current + step) }
    })

    if (scroll.done) {
      await page.evaluate((next) => window.scrollTo(0, next), scroll.next)
      await finishFiniteEntranceAnimations(page)
      if (inspectReflow) {
        const audit = await inspectMeaningfulHorizontalOverflow(page)
        clientWidth = audit.clientWidth
        scrollWidth = Math.max(scrollWidth, audit.scrollWidth)
        for (const finding of audit.findings) {
          findings.set(
            `${finding.kind}:${finding.selector}:${finding.text}:${finding.left}:${finding.right}:${finding.boundary}:${finding.boundarySelector ?? ""}`,
            finding,
          )
        }
      }
      break
    }

    await page.evaluate((next) => window.scrollTo(0, next), scroll.next)

    if (pass === 239) {
      throw new Error("Public-page reveal walk exceeded 240 viewport stops")
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await finishFiniteEntranceAnimations(page)
  await page.evaluate(({ value, priority }) => {
    const root = document.documentElement
    if (value) root.style.setProperty("scroll-behavior", value, priority)
    else root.style.removeProperty("scroll-behavior")
  }, previousScrollBehavior)

  if (!inspectReflow) {
    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
    }))
    clientWidth = metrics.clientWidth
    scrollWidth = metrics.scrollWidth
  }

  return {
    clientWidth,
    scrollWidth,
    findings: Array.from(findings.values()),
  }
}

export interface MeaningfulAnimation {
  selector: string
  name: string
  playState: AnimationPlayState
  duration: number
  delay: number
  iterations: number
}

export async function inspectActiveMeaningfulAnimations(
  page: Page,
): Promise<MeaningfulAnimation[]> {
  return page.evaluate(() => {
    const selector = (element: Element | null) => {
      if (!element) return "unknown"
      if (element.id) return `${element.tagName.toLowerCase()}#${element.id}`
      const marker =
        element.getAttribute("data-mobile-menu-motion") ||
        element.getAttribute("data-mobile-menu-panel") ||
        element.getAttribute("aria-label")
      return `${element.tagName.toLowerCase()}${marker ? `[${marker}]` : ""}`
    }

    return document
      .getAnimations()
      .flatMap((animation): MeaningfulAnimation[] => {
        if (animation.playState !== "running" && !animation.pending) return []

        const effect = animation.effect
        const timing = effect?.getTiming()
        const computed = effect?.getComputedTiming()
        const rawDuration = computed?.duration
        const duration = typeof rawDuration === "number" ? rawDuration : 0
        const delay = typeof timing?.delay === "number" ? timing.delay : 0
        const iterations = typeof timing?.iterations === "number" ? timing.iterations : 1

        if (duration <= 20 && Math.abs(delay) <= 20 && iterations !== Infinity) return []

        const target = effect instanceof KeyframeEffect ? effect.target : null
        return [{
          selector: selector(target),
          name: animation.id || effect?.constructor.name || "unnamed",
          playState: animation.playState,
          duration,
          delay,
          iterations,
        }]
      })
  })
}
