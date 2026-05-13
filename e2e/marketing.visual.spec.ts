/**
 * Marketing visual regression baselines.
 *
 * Locks the public marketing surface state across desktop + mobile and
 * light + dark themes. Catches silent design-system drift the unit tests
 * and brand-surfaces smoke spec cannot see.
 *
 * Surfaces covered (acquisition-critical, brand-load-bearing):
 *   - Homepage `/`
 *   - Service landing pages: medical-certificate, prescriptions,
 *     erectile-dysfunction, hair-loss, consult
 *   - Trust + brand pages: pricing, guarantee, what-we-wont-do
 *   - First step of the canonical intake flow
 *
 * Generation:
 *   pnpm e2e marketing.visual --update-snapshots
 *
 * The spec runs only on Chromium (webkit/firefox font rendering produces
 * noisy diffs on shadow tints; baseline parity is not the goal). Mobile
 * baselines use a 390x844 viewport (iPhone 12 / 13 / 14 class). Desktop
 * uses 1440x900 (canonical brand surface).
 *
 * Dynamic content is masked at the text-node level: live wait counter,
 * "Last reviewed N min ago", IM-* certificate references, and date/time
 * tokens are normalized to stable strings before screenshot. Otherwise
 * the wait counter would change every run and break the diff.
 *
 * Not in scope here:
 *   - Operator surfaces (covered by `e2e/operator.visual.spec.ts`)
 *   - Patient/admin/doctor portals (covered by `e2e/dashboard-audit.spec.ts`)
 *   - Blog guides (covered by `e2e/blog.visual.spec.ts`)
 */

import { expect, type Page, test } from "@playwright/test"

const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const

interface Surface {
  readonly slug: string
  readonly path: string
  readonly heading: RegExp
}

const SURFACES: readonly Surface[] = [
  { slug: "home",                path: "/",                       heading: /faster than your gp\.?$/i },
  { slug: "medical-certificate", path: "/medical-certificate",    heading: /medical certificate/i },
  { slug: "prescriptions",       path: "/prescriptions",          heading: /prescription|repeat medication/i },
  { slug: "erectile-dysfunction",path: "/erectile-dysfunction",   heading: /erectile|ed treatment|ed assessment/i },
  { slug: "hair-loss",           path: "/hair-loss",              heading: /hair loss/i },
  { slug: "consult",             path: "/consult",                heading: /consult|gp/i },
  { slug: "pricing",             path: "/pricing",                heading: /pricing|pay|simple|honest/i },
  { slug: "guarantee",           path: "/guarantee",              heading: /guarantee|refund/i },
  { slug: "what-we-wont-do",     path: "/what-we-wont-do",        heading: /won.?t do|won.?t/i },
] as const

type Theme = "light" | "dark"
type Viewport = "desktop" | "mobile"

async function applyTheme(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme })
  await page.addInitScript((mode: Theme) => {
    try {
      window.localStorage.setItem("theme", mode)
    } catch {
      // localStorage is unavailable in some sandbox modes; emulateMedia is the fallback.
    }
  }, theme)
}

async function stabilizeMarketingVisual(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        animation-iteration-count: 1 !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }
      /* Hide infinite-loop decorative surfaces that won't stabilize. */
      canvas, lottie-player, [data-lottie="true"] {
        visibility: hidden !important;
      }
    `,
  })

  // Force fonts ready so Plus Jakarta Sans + Source Sans 3 swap before snapshot.
  await page.evaluate(() => document.fonts.ready.then(() => undefined))

  // Trigger any lazy-loaded `<Image loading="lazy">` content by walking the
  // page once. Without this the full-page screenshot's height shifts as
  // images decode and the diff fails as "two consecutive screenshots not
  // stable" with mismatched heights.
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    const startY = window.scrollY
    const max = document.documentElement.scrollHeight
    for (let y = 0; y < max; y += 800) {
      window.scrollTo(0, y)
      await sleep(50)
    }
    window.scrollTo(0, startY)
    await sleep(50)

    // Wait until every <img> reports complete + naturalWidth > 0.
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"))
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      const pending = imgs.filter((img) => !(img.complete && img.naturalWidth > 0))
      if (pending.length === 0) return
      await sleep(100)
    }
  })

  // Normalize dynamic text nodes that would otherwise change every run:
  //   - Live wait counter ("Most med certs reviewed in ~44 min today")
  //   - "Last reviewed 26 min ago"
  //   - IM-* certificate reference IDs
  //   - Times like "12:30 pm", dates like "Mon, 11 May"
  await page.evaluate(() => {
    const root = document.body
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    while (walker.nextNode()) nodes.push(walker.currentNode as Text)

    const NORMALIZERS: Array<[RegExp, string]> = [
      [/~\s*\d+\s*min(\s+today)?/gi, "~NN min today"],
      [/Last reviewed\s+\d+\s+min ago/gi, "Last reviewed NN min ago"],
      [/\b\d+\s+min\s+ago\b/gi, "NN min ago"],
      [/IM-[A-Z0-9-]+/g, "IM-REFERENCE"],
      [/\b\d{1,2}:\d{2}\s?(?:am|pm)\b/gi, "TIME"],
      [/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+[A-Z][a-z]{2,}/gi, "DATE"],
    ]

    for (const node of nodes) {
      if (!node.textContent) continue
      let next = node.textContent
      for (const [pattern, replacement] of NORMALIZERS) {
        next = next.replace(pattern, replacement)
      }
      if (next !== node.textContent) node.textContent = next
    }
  })
}

async function snapshot(
  page: Page,
  surface: Surface,
  viewport: Viewport,
  theme: Theme,
) {
  const size = viewport === "desktop" ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT
  await page.setViewportSize(size)
  await applyTheme(page, theme)

  const response = await page.goto(surface.path, { waitUntil: "domcontentloaded" })
  expect(response?.status(), `${surface.path} should return 200`).toBe(200)

  await expect(
    page.getByRole("heading", { level: 1 }).first(),
    `${surface.path} should render an h1`,
  ).toBeVisible({ timeout: 15_000 })

  await stabilizeMarketingVisual(page)

  await expect(page).toHaveScreenshot(`${surface.slug}-${viewport}-${theme}.png`, {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  })
}

test.describe("marketing visual regression", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Marketing baselines use Chromium only")
  test.describe.configure({ mode: "parallel" })

  for (const surface of SURFACES) {
    for (const viewport of ["desktop", "mobile"] as const) {
      for (const theme of ["light", "dark"] as const) {
        test(`${surface.slug} ${viewport} ${theme}`, async ({ page }) => {
          await snapshot(page, surface, viewport, theme)
        })
      }
    }
  }
})

test.describe("intake first-step visual regression", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Intake baselines use Chromium only")

  const INTAKE_PATHS = [
    { slug: "intake-med-cert",     path: "/request?service=med-cert" },
    { slug: "intake-prescription", path: "/request?service=repeat-script" },
    { slug: "intake-consult",      path: "/request?service=consult" },
  ] as const

  for (const intake of INTAKE_PATHS) {
    for (const viewport of ["desktop", "mobile"] as const) {
      test(`${intake.slug} ${viewport} light`, async ({ page }) => {
        const size = viewport === "desktop" ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT
        await page.setViewportSize(size)
        await applyTheme(page, "light")

        await page.goto(intake.path, { waitUntil: "domcontentloaded" })

        // The consult intake without an explicit subtype lands on the service
        // hub (h1: "What brings you in today?"); the med-cert / prescription
        // flows mount their step component (h2 via IntakeStepIntro). Wait for
        // either, then idle the network so subsequent renders settle.
        await expect(
          page.locator("h1, h2").first(),
        ).toBeVisible({ timeout: 25_000 })
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined)

        await stabilizeMarketingVisual(page)

        await expect(page).toHaveScreenshot(`${intake.slug}-${viewport}-light.png`, {
          animations: "disabled",
          caret: "hide",
          fullPage: false,
          maxDiffPixelRatio: 0.02,
        })
      })
    }
  }
})
