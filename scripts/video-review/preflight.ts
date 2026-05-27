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

import { getClaudeCredentialSource } from "./claude-model"

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

  if (!process.env.GEMINI_API_KEY?.trim()) {
    failures.push(
      "GEMINI_API_KEY missing or empty. Add to .env.local + Vercel env + GitHub repo secrets. " +
        "If already in .env.local: your shell may have the var pre-set to empty - " +
        "`unset GEMINI_API_KEY` and retry. See https://aistudio.google.com/apikey",
    )
  }
  if (!getClaudeCredentialSource()) {
    failures.push(
      "Claude credential missing. Set ANTHROPIC_API_KEY for direct Anthropic, or " +
        "AI_GATEWAY_API_KEY / VERCEL_AI_GATEWAY_API_KEY for Vercel AI Gateway.",
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
 * 405 specifically. Local Next dev can still be compiling when the review
 * starts, so retry a few times before failing the run.
 *
 * Timeout: 15s per attempt.
 */
async function checkUrlIs2xx(url: string): Promise<string | null> {
  try {
    new URL(url)
  } catch {
    return `Target URL is not a valid URL: ${url}`
  }

  const attempts = 6
  let lastMessage = "unknown error"
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const head = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" }, 15000)
      if (head.status === 405) {
        const get = await fetchWithTimeout(url, { method: "GET", redirect: "follow" }, 15000)
        if (get.ok) return null
        lastMessage = `returned ${get.status} (GET fallback after 405)`
      } else if (head.ok) {
        return null
      } else {
        lastMessage = `returned ${head.status}`
      }
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err)
    }
    if (attempt < attempts) await sleep(1500)
  }

  return `Target URL ${url} not ready after ${attempts} attempts: ${lastMessage}. Capture would record an error page.`
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
