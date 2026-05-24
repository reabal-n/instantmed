/**
 * Pre-flight checks. Fail fast with actionable errors instead of
 * crashing 30s into a Playwright session or 2 minutes into a Gemini
 * upload.
 *
 * Hardening:
 *   - URL check requires a 2xx response (not just "reachable"). A 404
 *     or 5xx target would record a useless capture.
 *   - Disk-space check requires >= 100MB free in the runs directory so
 *     the capture + frames have room to land.
 *   - Resume path skips URL + disk + chromium checks (no capture work).
 *
 * Returns nothing on success; throws on first failure with a numbered
 * report of every issue found.
 */

import { existsSync, statfsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const MIN_FREE_BYTES = 100 * 1024 * 1024

interface PreflightOptions {
  skipUrlCheck?: boolean
  targetUrl: string
  resumeFromRunId?: string
  /**
   * Directory where capture artefacts will be written. Used for the
   * disk-space check. If omitted the check is skipped (resume path).
   */
  outDirParent?: string
}

export async function preflight(opts: PreflightOptions): Promise<void> {
  const failures: string[] = []

  if (!process.env.GEMINI_API_KEY) {
    failures.push(
      "GEMINI_API_KEY missing. Add to .env.local + Vercel env + GitHub repo secrets. See https://aistudio.google.com/apikey",
    )
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    failures.push(
      "ANTHROPIC_API_KEY missing. Add to .env.local + Vercel env + GitHub repo secrets.",
    )
  }

  if (!opts.resumeFromRunId) {
    if (!(await checkPlaywrightChromium())) {
      failures.push(
        "Playwright chromium not installed. Run: pnpm exec playwright install chromium",
      )
    }

    if (opts.outDirParent) {
      const freeBytes = freeBytesFor(opts.outDirParent)
      if (freeBytes !== null && freeBytes < MIN_FREE_BYTES) {
        const freeMb = Math.round(freeBytes / 1024 / 1024)
        failures.push(
          `Low disk space: only ${freeMb}MB free at ${opts.outDirParent}. Need >=100MB.`,
        )
      }
    }

    if (!opts.skipUrlCheck) {
      const urlErr = await checkUrlIs2xx(opts.targetUrl)
      if (urlErr) failures.push(urlErr)
    }
  }

  if (failures.length > 0) {
    const lines = failures.map((f, i) => `  ${i + 1}. ${f}`).join("\n")
    throw new Error(
      `Pre-flight failed (${failures.length} issue${
        failures.length === 1 ? "" : "s"
      }):\n${lines}`,
    )
  }
}

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

/**
 * Check the capture URL returns 2xx via a HEAD ping. Some hosts reject
 * HEAD (returns 405) but a GET would work, so we fall back to GET on a
 * 405 specifically. Any other non-2xx fails pre-flight.
 *
 * Timeout: 5s.
 */
async function checkUrlIs2xx(url: string): Promise<string | null> {
  try {
    new URL(url)
  } catch {
    return `Target URL is not a valid URL: ${url}`
  }

  try {
    const head = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" }, 5000)
    if (head.status === 405) {
      const get = await fetchWithTimeout(url, { method: "GET", redirect: "follow" }, 5000)
      if (get.ok) return null
      return `Target URL ${url} returned ${get.status} (GET fallback after 405).`
    }
    if (head.ok) return null
    return `Target URL ${url} returned ${head.status}. Capture would record an error page.`
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `Target URL ${url} unreachable: ${msg}`
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

/**
 * Return free bytes on the filesystem hosting `path`, or null on
 * platforms where statfs is unavailable (older Node, edge cases).
 */
function freeBytesFor(path: string): number | null {
  try {
    const stats = statfsSync(path)
    return Number(stats.bsize) * Number(stats.bavail)
  } catch {
    return null
  }
}
