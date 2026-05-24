/**
 * Pre-flight checks. Run before any work to fail fast with actionable
 * errors instead of crashing 30s into a Playwright session.
 *
 * Returns nothing on success; throws on first failure.
 */

import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

interface PreflightOptions {
  skipUrlCheck?: boolean
  targetUrl: string
  resumeFromRunId?: string
}

export async function preflight(opts: PreflightOptions): Promise<void> {
  const failures: string[] = []

  if (!process.env.GEMINI_API_KEY) {
    failures.push(
      "GEMINI_API_KEY missing. Add to .env.local and Vercel env. See https://aistudio.google.com/apikey",
    )
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    failures.push("ANTHROPIC_API_KEY missing. Add to .env.local and Vercel env.")
  }

  if (!opts.resumeFromRunId) {
    const chromiumLikelyInstalled = await checkPlaywrightChromium()
    if (!chromiumLikelyInstalled) {
      failures.push(
        "Playwright chromium not installed. Run: pnpm exec playwright install chromium",
      )
    }
  }

  if (!opts.resumeFromRunId && !opts.skipUrlCheck) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 5000)
      const res = await fetch(opts.targetUrl, {
        method: "HEAD",
        redirect: "follow",
        signal: ctrl.signal,
      })
      clearTimeout(t)
      if (!res.ok && res.status !== 405) {
        failures.push(
          `Target URL ${opts.targetUrl} returned ${res.status}. Capture would fail.`,
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push(`Target URL ${opts.targetUrl} unreachable: ${msg}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Pre-flight failed (${failures.length} issue${
        failures.length === 1 ? "" : "s"
      }):\n${failures.map((f) => `  - ${f}`).join("\n")}`,
    )
  }
}

/**
 * Best-effort check that Playwright chromium is installed somewhere
 * Playwright will find it. Looks for the standard browser-cache locations
 * (PLAYWRIGHT_BROWSERS_PATH, ~/Library/Caches/ms-playwright on mac,
 * ~/.cache/ms-playwright on linux). Returns false only when nothing
 * resembling an installed browser is found.
 *
 * Not foolproof: a stale path can still fail at launch. We surface that
 * as a runtime error rather than blocking here on edge cases.
 */
async function checkPlaywrightChromium(): Promise<boolean> {
  const candidates: string[] = []

  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    candidates.push(process.env.PLAYWRIGHT_BROWSERS_PATH)
  }
  candidates.push(join(homedir(), "Library", "Caches", "ms-playwright"))
  candidates.push(join(homedir(), ".cache", "ms-playwright"))

  for (const c of candidates) {
    if (existsSync(c)) return true
  }
  return false
}
