/**
 * Stage 1: Playwright screencast capture.
 *
 * Hardening:
 *   - Browser lifecycle wrapped in try/finally so a thrown journey
 *     cannot leave a headless Chromium process on the runner.
 *   - SIGINT/SIGTERM handlers installed for the duration of the
 *     capture so Ctrl-C cleans up the browser too.
 *   - Captured video validated post-run: file must exist AND exceed
 *     a minimum size to catch silent journey failures (Playwright
 *     does emit a tiny webm even when nothing renders).
 *   - Per-screenshot timeout cap so a hung snapshot does not stall
 *     the journey.
 *
 * Records a webm at mobile viewport (375x812), touch-capable, and
 * extracts ~8 representative still frames during the journey.
 */

import { mkdir, readdir, rename, stat } from "node:fs/promises"
import { join, resolve } from "node:path"

import { chromium, type Browser } from "playwright"

import type { Journey } from "./journeys"

const MIN_VIDEO_BYTES = 50 * 1024

export interface CaptureResult {
  videoPath: string
  framesDir: string
  durationSeconds: number
}

export interface CaptureOptions {
  baseUrl: string
  journey: Journey
  outDir: string
}

export async function capture(opts: CaptureOptions): Promise<CaptureResult> {
  const { baseUrl, journey, outDir } = opts
  const framesDir = join(outDir, "frames")
  await mkdir(framesDir, { recursive: true })

  let browser: Browser | undefined
  const cleanup = async (): Promise<void> => {
    if (browser) {
      try {
        await browser.close()
      } catch {
        // browser may already be gone
      }
      browser = undefined
    }
  }

  const signalHandler = (): void => {
    console.warn("[capture] received signal, closing browser...")
    void cleanup().finally(() => process.exit(130))
  }
  process.once("SIGINT", signalHandler)
  process.once("SIGTERM", signalHandler)

  const startedAt = Date.now()
  let stopFrameLoop: (() => void) | undefined

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    })

    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      locale: "en-AU",
      timezoneId: "Australia/Sydney",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      recordVideo: {
        dir: outDir,
        size: { width: 375, height: 812 },
      },
    })

    const page = await context.newPage()
    page.setDefaultTimeout(30_000)
    page.setDefaultNavigationTimeout(30_000)

    const frameInterval = Math.max(4000, Math.floor((journey.targetSeconds * 1000) / 8))
    stopFrameLoop = scheduleFrameCaptures(page, framesDir, frameInterval)

    try {
      await journey.run(page, baseUrl)
    } finally {
      stopFrameLoop()
      stopFrameLoop = undefined
      await page.close().catch(() => {})
      await context.close().catch(() => {})
    }
  } finally {
    if (stopFrameLoop) stopFrameLoop()
    process.off("SIGINT", signalHandler)
    process.off("SIGTERM", signalHandler)
    await cleanup()
  }

  const durationSeconds = (Date.now() - startedAt) / 1000

  const videoFiles = (await readdir(outDir)).filter((f) => f.endsWith(".webm"))
  if (videoFiles.length === 0) {
    throw new Error(
      `Capture failed: no .webm produced in ${outDir}. Playwright may have crashed mid-journey.`,
    )
  }
  if (videoFiles.length > 1) {
    videoFiles.sort()
  }
  const firstVideo = videoFiles[0]!
  const finalVideoPath = resolve(outDir, "capture.webm")
  await rename(join(outDir, firstVideo), finalVideoPath)

  const info = await stat(finalVideoPath)
  if (info.size < MIN_VIDEO_BYTES) {
    throw new Error(
      `Capture produced a ${info.size}-byte video (< ${MIN_VIDEO_BYTES} threshold). ` +
        `The journey likely failed before any content rendered. Inspect ${finalVideoPath}.`,
    )
  }

  return { videoPath: finalVideoPath, framesDir, durationSeconds }
}

/**
 * Snapshots a PNG every `intervalMs` while the journey runs. Each
 * screenshot has a 5s individual timeout so a hung paint cannot stall
 * the next frame. Errors are swallowed: this loop is best-effort, the
 * webm is the source of truth.
 */
function scheduleFrameCaptures(
  page: import("playwright").Page,
  framesDir: string,
  intervalMs: number,
): () => void {
  let cancelled = false
  let frameNumber = 0
  const start = Date.now()

  const loop = async (): Promise<void> => {
    while (!cancelled) {
      await new Promise((r) => setTimeout(r, intervalMs))
      if (cancelled) break
      frameNumber++
      const elapsedSeconds = Math.round((Date.now() - start) / 1000)
      const fileName = `${String(elapsedSeconds).padStart(3, "0")}s.png`
      try {
        await page.screenshot({
          path: join(framesDir, fileName),
          fullPage: false,
          timeout: 5000,
        })
      } catch {
        // page closed / mid-transition / target lost. Skip.
      }
    }
  }

  void loop()

  return () => {
    cancelled = true
  }
}
