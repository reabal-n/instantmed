/**
 * Health check for the video review pipeline. Runs in 5-10 seconds
 * without burning an upload or a full critique. Useful before kicking
 * off CI or after rotating an API key.
 *
 * Checks:
 *   1. GEMINI_API_KEY present + a minimal generateContent succeeds
 *      against `gemini-2.5-pro` (catches expired keys, model removal,
 *      quota issues).
 *   2. ANTHROPIC_API_KEY present + a minimal generateText succeeds
 *      against `claude-opus-4-7` (catches the temperature deprecation
 *      and other 400-class breakage).
 *   3. Playwright chromium installed.
 *   4. Default capture URL returns 2xx.
 *   5. docs/reviews/ has >= 100MB free.
 *
 * Exits 0 on all-green, 1 on any failure. Each failure logged with the
 * exact fix command where possible.
 */

import { existsSync, statfsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { anthropic } from "@ai-sdk/anthropic"
import { GoogleGenAI } from "@google/genai"
import { generateText } from "ai"

const DEFAULT_URL = "https://instantmed.com.au"
const REVIEWS_ROOT = "docs/reviews"
const MIN_FREE_BYTES = 100 * 1024 * 1024

interface CheckResult {
  name: string
  ok: boolean
  detail: string
  fix?: string
}

async function checkGemini(): Promise<CheckResult> {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return {
      name: "Gemini API key + model",
      ok: false,
      detail: "GEMINI_API_KEY not set (or empty) in this shell.",
      fix:
        "If the value is in .env.local, your shell may have the var pre-set to empty: " +
        "run `unset GEMINI_API_KEY` and try again. Node --env-file does not override " +
        "existing env vars even when they are empty.",
    }
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const res = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ role: "user", parts: [{ text: "Reply with only the word OK." }] }],
    })
    const text = (res.text ?? "").trim()
    if (!text) {
      return {
        name: "Gemini API key + model",
        ok: false,
        detail: "API key works but model returned empty text.",
        fix: "Check the model name 'gemini-2.5-pro' is still available at https://aistudio.google.com/",
      }
    }
    return {
      name: "Gemini API key + model",
      ok: true,
      detail: `gemini-2.5-pro responded (${text.length} chars).`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      name: "Gemini API key + model",
      ok: false,
      detail: msg.slice(0, 200),
      fix:
        msg.toLowerCase().includes("api key")
          ? "Rotate the key at https://aistudio.google.com/apikey + update .env.local + Vercel + GitHub secrets."
          : undefined,
    }
  }
}

async function checkAnthropic(): Promise<CheckResult> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return {
      name: "Anthropic API key + model",
      ok: false,
      detail: "ANTHROPIC_API_KEY not set (or empty) in this shell.",
      fix:
        "If the value is in .env.local, your shell may have the var pre-set to empty: " +
        "run `unset ANTHROPIC_API_KEY` and try again. Node --env-file does not override " +
        "existing env vars even when they are empty.",
    }
  }
  try {
    const { text } = await generateText({
      model: anthropic("claude-opus-4-7"),
      messages: [{ role: "user", content: "Reply with only the word OK." }],
      maxOutputTokens: 16,
      maxRetries: 1,
    })
    if (!text.trim()) {
      return {
        name: "Anthropic API key + model",
        ok: false,
        detail: "API key works but model returned empty text.",
        fix: "Check claude-opus-4-7 is still available at https://docs.anthropic.com/en/docs/about-claude/models",
      }
    }
    return {
      name: "Anthropic API key + model",
      ok: true,
      detail: `claude-opus-4-7 responded (${text.length} chars).`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const fix = msg.toLowerCase().includes("temperature")
      ? "Remove any 'temperature' arg from synthesize.ts - opus 4.7 deprecated it."
      : msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("authentication")
        ? "Rotate at https://console.anthropic.com/settings/keys + update .env.local + Vercel + GitHub secrets."
        : undefined
    return {
      name: "Anthropic API key + model",
      ok: false,
      detail: msg.slice(0, 200),
      fix,
    }
  }
}

function checkChromium(): CheckResult {
  const candidates = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    join(homedir(), "Library", "Caches", "ms-playwright"),
    join(homedir(), ".cache", "ms-playwright"),
  ].filter((c): c is string => Boolean(c))
  for (const c of candidates) {
    if (existsSync(c)) {
      return {
        name: "Playwright chromium",
        ok: true,
        detail: `Browser cache found at ${c}.`,
      }
    }
  }
  return {
    name: "Playwright chromium",
    ok: false,
    detail: "No Playwright browser cache found.",
    fix: "pnpm exec playwright install chromium",
  }
}

async function checkTargetUrl(): Promise<CheckResult> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(DEFAULT_URL, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (res.ok || res.status === 405) {
      return {
        name: "Default target URL",
        ok: true,
        detail: `${DEFAULT_URL} -> ${res.status}.`,
      }
    }
    return {
      name: "Default target URL",
      ok: false,
      detail: `${DEFAULT_URL} returned ${res.status}.`,
      fix: "Check production deploy at https://vercel.com/rey-project/instantmed.",
    }
  } catch (err) {
    return {
      name: "Default target URL",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

function checkDiskSpace(): CheckResult {
  try {
    const stats = statfsSync(REVIEWS_ROOT)
    const free = Number(stats.bsize) * Number(stats.bavail)
    const freeMb = Math.round(free / 1024 / 1024)
    if (free >= MIN_FREE_BYTES) {
      return {
        name: "Disk space at docs/reviews/",
        ok: true,
        detail: `${freeMb}MB free.`,
      }
    }
    return {
      name: "Disk space at docs/reviews/",
      ok: false,
      detail: `${freeMb}MB free (need >= 100MB).`,
      fix: "Delete old runs in docs/reviews/ or free disk.",
    }
  } catch {
    return {
      name: "Disk space at docs/reviews/",
      ok: true,
      detail: "statfs unavailable - skipping check.",
    }
  }
}

async function main(): Promise<void> {
  console.log("Running pre-flight doctor for the video-review pipeline...\n")

  const results = await Promise.all([
    checkGemini(),
    checkAnthropic(),
    Promise.resolve(checkChromium()),
    checkTargetUrl(),
    Promise.resolve(checkDiskSpace()),
  ])

  for (const r of results) {
    const icon = r.ok ? "✅" : "❌"
    console.log(`${icon} ${r.name}`)
    console.log(`   ${r.detail}`)
    if (!r.ok && r.fix) console.log(`   Fix: ${r.fix}`)
  }

  const failures = results.filter((r) => !r.ok)
  console.log("")
  if (failures.length === 0) {
    console.log("All green. pnpm review is ready to fly.")
    process.exit(0)
  }
  console.log(`${failures.length} check${failures.length === 1 ? "" : "s"} failed.`)
  process.exit(1)
}

main().catch((err) => {
  console.error(`doctor crashed: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(2)
})
