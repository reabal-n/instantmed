/**
 * Stage 1: Playwright screencast capture.
 *
 * Records a webm video of the journey at mobile viewport (375x812),
 * touch-capable browser context. Also extracts ~8 representative
 * still frames from the video for the final report's embed images.
 *
 * Returns the absolute path to the .webm and the frames directory.
 */

import { mkdir, readdir, rename } from "node:fs/promises"
import { join, resolve } from "node:path"

import { chromium } from "playwright"

import type { Journey } from "./journeys"

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

  const browser = await chromium.launch({
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
  const startedAt = Date.now()

  const frameInterval = Math.max(4000, Math.floor((journey.targetSeconds * 1000) / 8))
  const stopFrameLoop = scheduleFrameCaptures(page, framesDir, frameInterval)

  try {
    await journey.run(page, baseUrl)
  } finally {
    stopFrameLoop()
    await page.close()
    await context.close()
    await browser.close()
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
  const finalVideoPath = resolve(outDir, "capture.webm")
  await rename(join(outDir, videoFiles[0]!), finalVideoPath)

  return { videoPath: finalVideoPath, framesDir, durationSeconds }
}

/**
 * Snapshots a PNG every `intervalMs` while the journey runs. The
 * returned `stop` cancels the loop without throwing on the in-flight
 * screenshot.
 *
 * Note: page.screenshot during navigation throws "Target closed".
 * We swallow those — the loop is best-effort, not strict.
 */
function scheduleFrameCaptures(
  page: import("playwright").Page,
  framesDir: string,
  intervalMs: number,
): () => void {
  let cancelled = false
  let frameNumber = 0
  const start = Date.now()

  const loop = async () => {
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
        // Page closed mid-screenshot or transition mid-flight. Skip and continue.
      }
    }
  }

  void loop()

  return () => {
    cancelled = true
  }
}
