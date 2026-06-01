/**
 * Health check for the video review pipeline. Runs in 5-10 seconds
 * without burning an upload or a full critique. Useful before kicking
 * off CI or after rotating an API key.
 *
 * Checks:
 *   1. GEMINI_API_KEY present + a minimal generateContent succeeds
 *      against `gemini-3.5-flash` (catches expired keys, model removal,
 *      quota issues).
 *   2. A Claude credential is present + a minimal generateText succeeds
 *      against the configured/discovered Claude Opus model (catches auth
 *      failures, plan-restricted models, and model-name drift).
 *   3. OPENAI_API_KEY present + the configured GPT review model exists.
 *   4. Playwright chromium installed.
 *   5. Default capture URL returns 2xx.
 *   6. docs/reviews/ has >= 100MB free.
 *
 * Exits 0 on all-green, 1 on any failure. Each failure logged with the
 * exact fix command where possible.
 */

import { existsSync, statfsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { GoogleGenAI } from "@google/genai"
import { generateText } from "ai"

import { getClaudeCredentialSource, getClaudeModel, resolveClaudeModelConfig } from "./claude-model"
import { getEnv, hydrateLocalEnv } from "./local-env"

const DEFAULT_URL = "https://instantmed.com.au"
const REVIEWS_ROOT = "docs/reviews"
const MIN_FREE_BYTES = 100 * 1024 * 1024
const DEFAULT_OPENAI_REVIEW_MODEL = "gpt-5.5-pro"

interface CheckResult {
  name: string
  ok: boolean
  detail: string
  fix?: string
}

async function checkGemini(): Promise<CheckResult> {
  const apiKey = getEnv("GEMINI_API_KEY")
  if (!apiKey) {
    return {
      name: "Gemini API key + model",
      ok: false,
      detail: "GEMINI_API_KEY not set in the shell, .env.local, or .env.",
      fix: "Add GEMINI_API_KEY to .env.local and retry.",
    }
  }
  try {
    const ai = new GoogleGenAI({ apiKey })
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: "Reply with only the word OK." }] }],
    })
    const text = (res.text ?? "").trim()
    if (!text) {
      return {
        name: "Gemini API key + model",
        ok: false,
        detail: "API key works but model returned empty text.",
        fix: "Check the model name 'gemini-3.5-flash' is still available at https://aistudio.google.com/",
      }
    }
    return {
      name: "Gemini API key + model",
      ok: true,
      detail: `gemini-3.5-flash responded (${text.length} chars).`,
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

async function checkClaude(): Promise<CheckResult> {
  const source = getClaudeCredentialSource()
  if (!source) {
    return {
      name: "Claude API key + Opus model",
      ok: false,
      detail: "No Claude credential set in the shell, .env.local, or .env.",
      fix:
        "Add ANTHROPIC_API_KEY to .env.local, or set AI_GATEWAY_API_KEY / VERCEL_AI_GATEWAY_API_KEY.",
    }
  }

  try {
    const resolution = await resolveClaudeModelConfig()
    const model = await getClaudeModel()
    const { text } = await generateText({
      model,
      messages: [{ role: "user", content: "Reply with only the word OK." }],
      maxOutputTokens: 16,
      maxRetries: 0,
      // Temperature intentionally omitted. Some Claude Opus versions reject it.
    })

    if (text.trim()) {
      return {
        name: "Claude API key + Opus model",
        ok: true,
        detail: `${resolution.modelId} responded (${text.length} chars, ${resolution.configuredBy}, ${source}).`,
      }
    }

    return {
      name: "Claude API key + Opus model",
      ok: false,
      detail: `${resolution.modelId} returned empty text.`,
      fix: "Check the resolved model name in .env.local or Anthropic workspace model access.",
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const fix = msg.toLowerCase().includes("not found")
      ? "Either the resolved model name is wrong or the API key lacks access. Set CLAUDE_MODEL in .env.local to a model listed in Anthropic Console."
      : msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("authentication")
        ? "Rotate at https://console.anthropic.com/settings/keys + update .env.local + Vercel + GitHub secrets."
        : undefined
    return {
      name: "Claude API key + Opus model",
      ok: false,
      detail: msg.slice(0, 200),
      fix,
    }
  }
}

async function checkOpenAI(): Promise<CheckResult> {
  const apiKey = getEnv("OPENAI_API_KEY")
  const model = getEnv("OPENAI_REVIEW_MODEL") || DEFAULT_OPENAI_REVIEW_MODEL

  if (!apiKey) {
    return {
      name: "OpenAI API key + GPT review model",
      ok: false,
      detail: "OPENAI_API_KEY not set in the shell, .env.local, or .env.",
      fix: "Add OPENAI_API_KEY to .env.local and Vercel, then retry.",
    }
  }

  try {
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) {
      return {
        name: "OpenAI API key + GPT review model",
        ok: false,
        detail: `${model} returned ${response.status}.`,
        fix: "Set OPENAI_REVIEW_MODEL to a model listed by the OpenAI Models API for this key.",
      }
    }
    return {
      name: "OpenAI API key + GPT review model",
      ok: true,
      detail: `${model} is available.`,
    }
  } catch (err) {
    return {
      name: "OpenAI API key + GPT review model",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
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
  hydrateLocalEnv([
    "GEMINI_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_REVIEW_MODEL",
    "AI_GATEWAY_API_KEY",
    "VERCEL_AI_GATEWAY_API_KEY",
    "CLAUDE_MODEL",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_CLAUDE_MODEL",
    "CLAUDE_GATEWAY_MODEL",
    "AI_GATEWAY_CLAUDE_MODEL",
    "VERCEL_AI_GATEWAY_CLAUDE_MODEL",
  ])

  console.log("Running pre-flight doctor for the video-review pipeline...\n")

  const results = await Promise.all([
    checkGemini(),
    checkClaude(),
    checkOpenAI(),
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
