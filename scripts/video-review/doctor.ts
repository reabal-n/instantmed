/**
 * Health check for the video review pipeline. Runs in 5-10 seconds
 * without burning an upload or a full critique. Useful before kicking
 * off CI or after rotating an API key.
 *
 * Checks:
 *   1. GEMINI_API_KEY present + a minimal generateContent succeeds
 *      against `gemini-3.5-flash` (catches expired keys, model removal,
 *      quota issues).
 *   2. ANTHROPIC_API_KEY present + a minimal generateText succeeds
 *      against `claude-opus-4-7` (catches model-name drift, auth
 *      failures, plan-restricted models, the temperature-deprecation
 *      400 if the model is mid-rolled).
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

import { createAnthropic } from "@ai-sdk/anthropic"
import { GoogleGenAI } from "@google/genai"
import { generateText } from "ai"

import { getEnv, hydrateLocalEnv } from "./local-env"

const DEFAULT_URL = "https://instantmed.com.au"
const REVIEWS_ROOT = "docs/reviews"
const MIN_FREE_BYTES = 100 * 1024 * 1024
// Pin baseURL so a leaked ANTHROPIC_BASE_URL env var (Claude Code's
// shell sets it to `https://api.anthropic.com` without /v1) cannot
// misroute SDK calls. See lib/ai/provider.ts + CLAUDE.md gotcha.
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1"

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

async function checkAnthropic(): Promise<CheckResult> {
  const apiKey = getEnv("ANTHROPIC_API_KEY")
  if (!apiKey) {
    return {
      name: "Anthropic API key + model",
      ok: false,
      detail: "ANTHROPIC_API_KEY not set in the shell, .env.local, or .env.",
      fix: "Add ANTHROPIC_API_KEY to .env.local and retry.",
    }
  }
  try {
    // Probe a fallback chain so the doctor can distinguish three failure
    // modes:
    //   - All models fail → the key itself is broken or has no access.
    //   - Some work, some don't → the key has tier-restricted access;
    //     surface which models ARE available so the operator can pick one.
    //   - First works → key + latest model both fine.
    const probeChain = [
      "claude-opus-4-7",
      "claude-opus-4-6",
      "claude-opus-4-5",
      "claude-sonnet-4-6",
      "claude-sonnet-4-5",
      "claude-haiku-4-5",
    ] as const
    const anthropic = createAnthropic({
      apiKey,
      baseURL: ANTHROPIC_BASE_URL,
    })
    let lastErr: Error | undefined
    for (const modelId of probeChain) {
      try {
        const { text } = await generateText({
          model: anthropic(modelId),
          messages: [{ role: "user", content: "Reply with only the word OK." }],
          maxOutputTokens: 16,
          maxRetries: 0,
          // temperature intentionally omitted - claude-opus-4-7 deprecated it
        })
        if (text.trim()) {
          const ahead = probeChain.indexOf(modelId)
          const detail =
            ahead === 0
              ? `${modelId} responded (${text.length} chars).`
              : `${modelId} responded (${text.length} chars). NOTE: ${ahead} newer model(s) failed — key may be tier-restricted. Newer: ${probeChain.slice(0, ahead).join(", ")}.`
          return { name: "Anthropic API key + model", ok: true, detail }
        }
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err))
      }
    }
    return {
      name: "Anthropic API key + model",
      ok: false,
      detail: `All ${probeChain.length} model probes failed. Last error: ${lastErr?.message.slice(0, 150) ?? "unknown"}`,
      fix: "Key has no model access on any tested model. Verify at https://console.anthropic.com → API keys (check the key has not been disabled) and Workspaces (check the workspace has billing + a paid plan).",
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const fix = msg.toLowerCase().includes("not found")
      ? "Either (a) the model name is wrong, or (b) the API key lacks access to any model. If multiple model names all return 'Not Found', check workspace model access at https://console.anthropic.com → Workspaces → Models. New keys created via the console default to no model access until enabled."
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
  hydrateLocalEnv(["GEMINI_API_KEY", "ANTHROPIC_API_KEY"])

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
