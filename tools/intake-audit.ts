/**
 * Intake visual audit - screenshots the service hub and first step of each
 * service pathway at mobile viewport.
 *
 * Steps are client-state driven (Zustand), so we capture:
 *   1. Service hub (/request — no service param)
 *   2. Step 1 of each active service (the form renders on first load)
 *
 * Usage:
 *   pnpm tsx tools/intake-audit.ts              # all intake screens
 *   pnpm tsx tools/intake-audit.ts med-cert     # single service
 */

import { chromium } from "@playwright/test"
import fs from "fs"
import path from "path"

const BASE = process.env.BASE_URL || "http://localhost:3000"
const OUT = path.resolve(__dirname, "screenshots/intake")

const MOBILE = { width: 375, height: 812 }

// waitForText: a string that appears INSIDE the lazy-loaded step form content
// (not in the header). Used to confirm the component has mounted and is visible
// before taking the screenshot — avoids the race where the opacity check fires
// while the step is still in Suspense (no opacity:0 elements yet, but also no
// content yet).
const INTAKE_SCREENS: Array<{ slug: string; url: string; label: string; waitForText: string }> = [
  { slug: "service-hub",   url: "/request",                                   label: "Service hub",                        waitForText: "Medical certificate" },
  { slug: "med-cert",      url: "/request?service=med-cert",                  label: "Med cert — step 1 (certificate)",    waitForText: "Certificate type" },
  { slug: "prescription",  url: "/request?service=prescription",              label: "Prescription — step 1 (medication)", waitForText: "Medication name" },
  { slug: "consult",       url: "/request?service=consult&subtype=general",   label: "General consult — step 1 (reason)",  waitForText: "General consultation" },
  { slug: "ed",            url: "/request?service=consult&subtype=ed",        label: "ED — step 1 (goals)",                waitForText: "What's your main goal" },
  { slug: "hair-loss",     url: "/request?service=consult&subtype=hair_loss", label: "Hair loss — step 1 (goals)",         waitForText: "What's your main goal" },
]

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>

async function waitForStep(page: Page, waitForText: string) {
  // Strategy: poll with page.evaluate every 500ms instead of a flat sleep.
  //
  // In headless Chromium, long flat waits (waitForTimeout) allow the browser
  // to enter a low-activity state where it may defer or skip paint operations.
  // page.evaluate forces the browser to execute JS, keeping it active and
  // ensuring rendering stays current.
  //
  // Each poll: check if the target text is visible AND no elements are at
  // opacity < 0.1 (Framer Motion animation complete). Continue polling until
  // both conditions are met or timeout.
  //
  // Also covers subtype transitions (ED/hair-loss) where:
  //   setServiceType effect → 'concern' step → 200ms animation → settled
  //   setSubtype effect → step changes → lazy load → 200ms animation → settled
  // The poll waits for text that only exists after the subtype step loads.
  const deadline = Date.now() + 20_000
  let settled = false
  while (!settled && Date.now() < deadline) {
    settled = await page.evaluate((text: string) => {
      const hasText = (document.body.innerText ?? "").includes(text)
      const hasOpacityZero = Array.from(document.querySelectorAll("*")).some((el) => {
        const op = parseFloat((el as HTMLElement).style.opacity ?? "")
        return !Number.isNaN(op) && op < 0.1
      })
      // Also force a full style recalculation on each poll to keep the
      // browser's rendering pipeline active.
      Array.from(document.querySelectorAll("*")).forEach((el) => {
        window.getComputedStyle(el as HTMLElement).opacity
      })
      return hasText && !hasOpacityZero
    }, waitForText)

    if (!settled) {
      await page.waitForTimeout(500)
    }
  }

  // Final compositing buffer.
  await page.waitForTimeout(300)
}

async function warmup(browser: Awaited<ReturnType<typeof chromium.launch>>, screens: typeof INTAKE_SCREENS) {
  // Visit each URL once to trigger webpack chunk compilation on the dev server.
  // Without this, the first visit to each route compiles the lazy step component
  // on-demand (1-5s), and the screenshot is taken before the component mounts.
  // Second visit is instant because the compiled chunk is cached.
  console.log("  Warming up dev server (first-visit compilation)...")
  for (const screen of screens) {
    const ctx = await browser.newContext({ viewport: MOBILE })
    const page = await ctx.newPage()
    await page.addInitScript(`try { localStorage.clear() } catch (e) {}`)
    try {
      await page.goto(`${BASE}${screen.url}`, { waitUntil: "networkidle", timeout: 60_000 })
    } catch {
      // ignore warmup failures
    }
    await ctx.close()
  }
  console.log("  Done warming up.\n")
}

async function run() {
  const args = process.argv.slice(2)
  const filter = args.find((a) => !a.startsWith("--"))
  const skipWarmup = args.includes("--no-warmup")

  const screens = filter
    ? INTAKE_SCREENS.filter((s) => s.slug === filter || s.url.includes(filter))
    : INTAKE_SCREENS

  if (screens.length === 0) {
    console.error(`No screens matched "${filter}". Available: ${INTAKE_SCREENS.map((s) => s.slug).join(", ")}`)
    process.exit(1)
  }

  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  console.log(`\nCapturing intake screens at ${MOBILE.width}px mobile\n`)

  // Warm up first (unless single-screen capture or explicitly skipped)
  if (!skipWarmup && !filter) {
    await warmup(browser, screens)
  }

  for (const screen of screens) {
    const ctx = await browser.newContext({
      viewport: MOBILE,
      // Do NOT use reducedMotion:"reduce" — it triggers a Framer Motion hydration race
      // where opacity:0 is set inline during SSR hydration but never cleared when the
      // reduced-motion prop changes. Let animations run at full speed; we wait them out.
      storageState: undefined,
    })
    const page = await ctx.newPage()

    // Clear Zustand persist state synchronously — addInitScript runs before page
    // scripts so this beats the persist middleware's localStorage.getItem call.
    await page.addInitScript(`try { localStorage.clear() } catch (e) {}`)

    try {
      await page.goto(`${BASE}${screen.url}`, { waitUntil: "networkidle", timeout: 30_000 })
      await waitForStep(page, screen.waitForText)

      // Final reflow flush — evaluating getComputedStyle on the full DOM
      // forces all pending Framer Motion style mutations to commit before
      // the screenshot captures the frame.
      await page.evaluate(() => {
        Array.from(document.querySelectorAll("*")).forEach((el) => {
          window.getComputedStyle(el as HTMLElement).opacity
        })
      })

      const filename = `${screen.slug}-mobile.png`
      await page.screenshot({ path: path.join(OUT, filename), fullPage: true })
      console.log(`  ✓ ${filename}  — ${screen.label}`)
    } catch (e) {
      console.error(`  ✗ ${screen.slug}: ${(e as Error).message}`)
    }

    await ctx.close()
  }

  await browser.close()
  console.log(`\nDone. Screenshots in ${OUT}\n`)
}

run()
