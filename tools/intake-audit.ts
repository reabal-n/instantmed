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

// Each entry: [slug, URL, description]
const INTAKE_SCREENS: Array<{ slug: string; url: string; label: string }> = [
  { slug: "service-hub",   url: "/request",                                   label: "Service hub" },
  { slug: "med-cert",      url: "/request?service=med-cert",                  label: "Med cert — step 1 (certificate)" },
  { slug: "prescription",  url: "/request?service=prescription",              label: "Prescription — step 1 (medication)" },
  { slug: "consult",       url: "/request?service=consult&subtype=general",   label: "General consult — step 1 (reason)" },
  { slug: "ed",            url: "/request?service=consult&subtype=ed",        label: "ED — step 1 (goals)" },
  { slug: "hair-loss",     url: "/request?service=consult&subtype=hair_loss", label: "Hair loss — step 1 (goals)" },
]

async function waitForStep(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>) {
  // After networkidle we still need to wait for:
  //   1. React hydration to complete
  //   2. Zustand store to init (reads localStorage, triggers setServiceType useEffect)
  //   3. Lazy step chunk to download and mount inside <Suspense>
  //   4. Framer Motion enter→center animation to finish (opacity 0→1, 150–200ms)
  //
  // Phase 1 — flat wait for React hydration + all mount effects to fire.
  // The subtype effect has an empty dep array so it runs after the first render
  // cycle. 2s is more than enough for:
  //   • React hydration (~50ms)
  //   • setServiceType effect → step A renders at opacity:0 → animates to 1 (~200ms)
  //   • subtype effect fires → step sequence changes → step A exits → step B enters (~300ms)
  // If we only wait for the first "no opacity:0" we catch step A in its settled
  // state before the subtype transition starts.
  await page.waitForTimeout(5_000)

  // Phase 2 — wait for the subtype-triggered step transition to fully settle.
  // After phase 1, any in-progress Framer Motion animations (step B entering)
  // should complete within the next timeout.
  try {
    await page.waitForFunction(
      () => !Array.from(document.querySelectorAll<HTMLElement>("*"))
        .some((el) => {
          const op = parseFloat(el.style.opacity ?? "")
          return !Number.isNaN(op) && op < 0.1
        }),
      { timeout: 10_000 },
    )
  } catch {
    // Fall through
  }
  // Final paint flush
  await page.waitForTimeout(200)
}

async function run() {
  const args = process.argv.slice(2)
  const filter = args.find((a) => !a.startsWith("--"))

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
      await waitForStep(page)


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
