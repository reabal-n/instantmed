/**
 * Video review pipeline orchestrator.
 *
 * Stages: capture (Playwright) → critique (Gemini 2.5 Pro) → synthesize
 * (Claude Opus 4.7) → index update.
 *
 * Output: docs/reviews/<runId>/{capture.webm, frames/, critique.json, report.md}
 *
 * CLI:
 *   pnpm review                          # paid-funnel against prod
 *   pnpm review --journey=brand-spine
 *   pnpm review --url=https://preview-xyz.vercel.app
 *   pnpm review --from-run=<runId>       # skip capture+critique, only re-synthesize
 */

import { mkdir, readFile, stat } from "node:fs/promises"
import { join, resolve } from "node:path"

import { capture, type CaptureResult } from "./capture"
import { critique, type CritiqueResult, type StructuredCritique } from "./critique"
import { updateIndex } from "./index-update"
import { getJourney, type Journey } from "./journeys"
import { preflight } from "./preflight"
import { synthesize } from "./synthesize"

const REVIEWS_ROOT = "docs/reviews"
const DEFAULT_URL = "https://instantmed.com.au"

interface ParsedArgs {
  journey?: string
  url: string
  fromRun?: string
  skipUrlCheck: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { url: DEFAULT_URL, skipUrlCheck: false }
  for (const raw of argv.slice(2)) {
    if (raw.startsWith("--journey=")) args.journey = raw.slice("--journey=".length)
    else if (raw.startsWith("--url=")) args.url = raw.slice("--url=".length)
    else if (raw.startsWith("--from-run=")) args.fromRun = raw.slice("--from-run=".length)
    else if (raw === "--skip-url-check") args.skipUrlCheck = true
    else if (raw === "--help" || raw === "-h") {
      printHelp()
      process.exit(0)
    } else {
      console.warn(`[review] ignoring unknown arg: ${raw}`)
    }
  }
  return args
}

function printHelp(): void {
  console.log(`pnpm review [flags]

Flags:
  --journey=<name>     paid-funnel | brand-spine | homepage  (default: paid-funnel)
  --url=<url>          Capture target. Default: https://instantmed.com.au
  --from-run=<runId>   Skip capture + critique. Only re-run synthesis on an existing run.
                       Useful when iterating on the voice prompt (saves ~90% cost).
  --skip-url-check     Skip the pre-flight HEAD ping. Use when the target blocks HEAD.
  -h, --help           Show this.

Output:
  docs/reviews/<runId>/
    capture.webm
    frames/*.png
    critique.json
    report.md`)
}

function makeRunId(journeyName: string): string {
  const date = new Date()
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(date.getUTCDate()).padStart(2, "0")
  const hash = Math.random().toString(36).slice(2, 6)
  return `${yyyy}-${mm}-${dd}-${journeyName}-${hash}`
}

async function loadExistingCritique(runId: string): Promise<StructuredCritique> {
  const path = join(REVIEWS_ROOT, runId, "critique.json")
  try {
    const raw = await readFile(path, "utf8")
    return JSON.parse(raw) as StructuredCritique
  } catch (err) {
    throw new Error(
      `Cannot resume from run '${runId}': ${path} not found or unreadable. ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

async function loadJourneyFromExistingRun(runId: string): Promise<{
  journey: Journey
  capturedUrl: string
  capturedAt: string
}> {
  const reportPath = join(REVIEWS_ROOT, runId, "report.md")
  let body: string
  try {
    body = await readFile(reportPath, "utf8")
  } catch {
    body = ""
  }
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  let journeyName: string | undefined
  let capturedUrl = DEFAULT_URL
  let capturedAt = new Date().toISOString()
  if (m) {
    for (const line of (m[1] ?? "").split(/\r?\n/)) {
      const kv = line.match(/^(\w+):\s*(.*)$/)
      if (!kv) continue
      const v = (kv[2] ?? "").trim().replace(/^['"]|['"]$/g, "")
      if (kv[1] === "journey") {
        const inferred = Object.keys({
          "paid-funnel": 1,
          "brand-spine": 1,
          homepage: 1,
        }).find((name) => v.toLowerCase().includes(name))
        journeyName = inferred
      } else if (kv[1] === "url") capturedUrl = v
      else if (kv[1] === "capturedAt") capturedAt = v
    }
  }
  if (!journeyName) {
    const inferred = runId.match(/^\d{4}-\d{2}-\d{2}-([a-z-]+)-[a-z0-9]{4}$/)?.[1]
    journeyName = inferred
  }
  const journey = getJourney(journeyName)
  return { journey, capturedUrl, capturedAt }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  if (args.fromRun) {
    console.log(`[review] resuming synthesis from existing run: ${args.fromRun}`)
    const outDir = resolve(REVIEWS_ROOT, args.fromRun)
    try {
      const info = await stat(outDir)
      if (!info.isDirectory()) throw new Error("not a directory")
    } catch {
      throw new Error(`Run directory ${outDir} not found.`)
    }
    const existing = await loadExistingCritique(args.fromRun)
    const journeyInfo = await loadJourneyFromExistingRun(args.fromRun)
    await preflight({
      targetUrl: journeyInfo.capturedUrl,
      skipUrlCheck: true,
      resumeFromRunId: args.fromRun,
    })
    const synthResult = await synthesize({
      critique: existing,
      outDir,
      runId: args.fromRun,
      journeyLabel: journeyInfo.journey.label,
      capturedUrl: journeyInfo.capturedUrl,
      capturedAt: journeyInfo.capturedAt,
      framesDir: join(outDir, "frames"),
    })
    await updateIndex()
    console.log(`[review] re-synthesized report: ${synthResult.reportPath}`)
    return
  }

  const journey = getJourney(args.journey)
  const runId = makeRunId(journey.name)
  const outDir = resolve(REVIEWS_ROOT, runId)
  await mkdir(outDir, { recursive: true })

  console.log(`[review] runId: ${runId}`)
  console.log(`[review] journey: ${journey.label}`)
  console.log(`[review] url: ${args.url}`)

  await preflight({ targetUrl: args.url, skipUrlCheck: args.skipUrlCheck })

  const captureResult: CaptureResult = await capture({
    baseUrl: args.url,
    journey,
    outDir,
  })
  console.log(`[review] captured ${captureResult.durationSeconds.toFixed(1)}s → ${captureResult.videoPath}`)

  const critiqueResult: CritiqueResult = await critique({
    videoPath: captureResult.videoPath,
    outDir,
    journeyLabel: journey.label,
    capturedUrl: args.url,
  })
  console.log(`[review] critique scored ${critiqueResult.critique.overall_score}/10 → ${critiqueResult.critiqueJsonPath}`)

  const capturedAt = new Date().toISOString()
  const synthResult = await synthesize({
    critique: critiqueResult.critique,
    outDir,
    runId,
    journeyLabel: journey.label,
    capturedUrl: args.url,
    capturedAt,
    framesDir: captureResult.framesDir,
  })
  console.log(`[review] report written: ${synthResult.reportPath}`)

  await updateIndex()
  console.log(`[review] index updated`)

  console.log(`\n✅ Done. Open ${synthResult.reportPath}`)
}

main().catch((err) => {
  console.error(`[review] ❌ ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
