/**
 * Patient portal visual regression baselines.
 *
 * Locks the post-rebuild patient portal state (DESIGN_SYSTEM_VERSION 2.0.3)
 * so silent drift back toward the legacy "21st.dev glass-forward" patterns
 * fails CI. Pairs with `scripts/check-portal-no-legacy-classes.sh` (which
 * catches className drift) by catching visual drift the className guard
 * cannot see (spacing, shadow tone, hierarchy).
 *
 * Surfaces covered:
 *   - /patient                   (Hero / Activity / Manage three-zone IA)
 *   - /patient/intakes           (intakes list with stat grid + tabs)
 *   - /patient/prescriptions     (active + expired sections)
 *   - /patient/documents         (documents list)
 *   - /patient/messages          (messages list)
 *   - /patient/settings          (tabbed settings)
 *   - /patient/payment-history   (payment history)
 *
 * Auth via E2E test seam (PLAYWRIGHT=1 + loginAsPatient). All seeded data
 * is masked at the text-node level so PHI from the seed never lands in
 * a committed baseline image.
 *
 * Generation:
 *   pnpm e2e patient-portal.visual --update-snapshots --project=chromium
 *
 * Skipped when the SUPABASE_SERVICE_ROLE_KEY is not available (matches
 * `e2e/operator.visual.spec.ts` so this can run in the same E2E env).
 */

import { expect, type Page, test } from "@playwright/test"

import { loginAsPatient, logoutTestUser } from "./helpers/auth"
import { isDbAvailable } from "./helpers/db"

const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const

type Theme = "light" | "dark"
type Viewport = "desktop" | "mobile"

interface Surface {
  readonly slug: string
  readonly path: string
  /**
   * A heading or anchor we expect to be present once the page settles. Matched
   * loosely with `locator("h1, h2").first()` since some patient surfaces use
   * `<DashboardPageHeader>` (h1) and others lead with a `<DashboardSection>` h2.
   */
  readonly waitForHeadingTimeoutMs?: number
}

const SURFACES: readonly Surface[] = [
  { slug: "dashboard",        path: "/patient" },
  { slug: "intakes",          path: "/patient/intakes" },
  { slug: "prescriptions",    path: "/patient/prescriptions" },
  { slug: "documents",        path: "/patient/documents" },
  { slug: "messages",         path: "/patient/messages" },
  { slug: "settings",         path: "/patient/settings" },
  { slug: "payment-history",  path: "/patient/payment-history" },
] as const

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

async function stabilizePatientPortal(page: Page) {
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
      canvas, lottie-player, [data-lottie="true"] {
        visibility: hidden !important;
      }
    `,
  })

  await page.evaluate(() => document.fonts.ready.then(() => undefined))

  // Anonymize seeded patient PHI. The seed creates "E2E Test Patient" and
  // attendant rows; replace anything alphanumeric inside `<main>` with X so
  // committed baselines never carry seed-data fragments.
  await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    while (walker.nextNode()) nodes.push(walker.currentNode as Text)

    const NORMALIZERS: Array<[RegExp, string]> = [
      [/IM-[A-Z0-9-]+/g, "IM-REFERENCE"],
      [/e2e[0-9a-f-]{20,}/gi, "E2E-ID"],
      [/\b\d{1,2}\s+[A-Z][a-z]{2,}\s+\d{4}(?:,\s+\d{1,2}:\d{2}\s?(?:am|pm))?/gi, "DATE"],
      [/\b\d{1,2}:\d{2}\s?(?:am|pm)\b/gi, "TIME"],
      [/\b\d+\s+min\s+ago\b/gi, "NN min ago"],
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

  // Trigger lazy-loaded images by walking through scroll positions, then wait
  // for every <img> to decode. Without this, full-page snapshots fail with
  // "Failed to take two consecutive stable screenshots" as image sizes change.
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

    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"))
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      const pending = imgs.filter((img) => !(img.complete && img.naturalWidth > 0))
      if (pending.length === 0) return
      await sleep(100)
    }
  })
}

async function snapshot(page: Page, surface: Surface, viewport: Viewport, theme: Theme) {
  const size = viewport === "desktop" ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT
  await page.setViewportSize(size)
  await applyTheme(page, theme)

  const response = await page.goto(surface.path, { waitUntil: "domcontentloaded" })
  expect(response?.status(), `${surface.path} should return 200`).toBe(200)

  await expect(
    page.locator("h1, h2").first(),
    `${surface.path} should render an h1 or h2`,
  ).toBeVisible({ timeout: surface.waitForHeadingTimeoutMs ?? 25_000 })
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined)

  await stabilizePatientPortal(page)

  await expect(page).toHaveScreenshot(`${surface.slug}-${viewport}-${theme}.png`, {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  })
}

test.describe("patient portal visual regression", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Patient portal baselines use Chromium only")

  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "SUPABASE_SERVICE_ROLE_KEY required")
    const result = await loginAsPatient(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

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
