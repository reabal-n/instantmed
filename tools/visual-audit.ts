/**
 * Visual audit script - screenshots marketing pages at multiple viewports.
 *
 * Usage:
 *   pnpm tsx tools/visual-audit.ts                # all pages, all viewports
 *   pnpm tsx tools/visual-audit.ts homepage        # single page
 *   pnpm tsx tools/visual-audit.ts --desktop-only  # single viewport
 */

import { chromium } from "@playwright/test"
import fs from "fs"
import path from "path"

const BASE = process.env.BASE_URL || "http://localhost:3000"
const OUT = path.resolve(__dirname, "screenshots")

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const

const PAGES: Record<string, string> = {
  homepage: "/",
  "med-cert": "/medical-certificate",
  prescriptions: "/prescriptions",
  consult: "/consult",
  ed: "/erectile-dysfunction",
  "hair-loss": "/hair-loss",
  pricing: "/pricing",
  "how-it-works": "/how-it-works",
  about: "/about",
  reviews: "/reviews",
  faq: "/faq",
  contact: "/contact",
  trust: "/trust",
  employers: "/for/employers",
}

async function run() {
  const args = process.argv.slice(2)
  const pageFilter = args.find((a) => !a.startsWith("--"))
  const desktopOnly = args.includes("--desktop-only")

  const viewports = desktopOnly
    ? { desktop: VIEWPORTS.desktop }
    : VIEWPORTS

  const pages = pageFilter
    ? { [pageFilter]: PAGES[pageFilter] || `/${pageFilter}` }
    : PAGES

  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()

  for (const [name, route] of Object.entries(pages)) {
    for (const [vp, size] of Object.entries(viewports)) {
      const ctx = await browser.newContext({ viewport: size })
      const page = await ctx.newPage()

      try {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30_000 })

        // Scroll to bottom to trigger all whileInView animations, then back to top
        await page.evaluate(`(async () => {
          const delay = ms => new Promise(r => setTimeout(r, ms));
          const step = window.innerHeight;
          const max = document.documentElement.scrollHeight;
          for (let y = 0; y <= max; y += step) {
            window.scrollTo(0, y);
            await delay(150);
          }
          window.scrollTo(0, 0);
          await delay(300);
        })()`)

        const filename = `${name}-${vp}.png`
        await page.screenshot({ path: path.join(OUT, filename), fullPage: true })
        console.log(`  ${filename}`)
      } catch (e) {
        console.error(`  FAIL ${name}-${vp}: ${(e as Error).message}`)
      }

      await ctx.close()
    }
  }

  await browser.close()
  console.log(`\nDone. Screenshots in ${OUT}`)
}

run()
