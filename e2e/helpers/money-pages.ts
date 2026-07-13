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
      if (rect.left >= -tolerance && rect.right <= viewportWidth + tolerance) return
      findings.push({
        kind,
        selector: selector(element),
        text: clean(text),
        left: Math.round(rect.left * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
      })
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
          `${finding.kind}:${finding.selector}:${finding.text}:${finding.left}:${finding.right}`,
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
      findings: unique.slice(0, 40),
    }
  })
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
