/**
 * Video review pipeline orchestrator.
 *
 * Stages: capture (Playwright) -> critique (Gemini 3.5 Flash + Claude
 * Opus 4.7 vision) -> synthesize (Claude Opus 4.7) -> index update.
 *
 * Output: docs/reviews/<runId>/{capture.webm, frames/, critique.json,
 * claude-critique.json, report.md}
 *
 * Hardening:
 *   - Granular resume: --from-run auto-detects which stage to start at
 *     by inspecting which artifacts already exist. Re-runnable
 *     end-to-end after any kind of mid-pipeline failure without
 *     burning the upstream work.
 *   - Journey name validated against the registry BEFORE pre-flight,
 *     URL parsed BEFORE any setup, so typos fail in milliseconds.
 *   - Errors include a "next step" hint where possible.
 *   - --list-runs + --list-journeys for discoverability.
 *   - SIGINT bubbles to capture.ts's browser cleanup handler.
 */

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { capture, type CaptureResult } from "./capture"
import { critiqueWithClaudeVision, type ClaudeCritiqueResult } from "./claude-critique"
import { critique, type CritiqueResult } from "./critique"
import { updateIndex } from "./index-update"
import { JOURNEYS, getJourney, type Journey } from "./journeys"
import { preflight } from "./preflight"
import { CritiqueSchema, type StructuredCritique } from "./schema"
import { synthesize } from "./synthesize"

const REVIEWS_ROOT = "docs/reviews"
const DEFAULT_URL = "https://instantmed.com.au"

interface ParsedArgs {
  journey?: string
  url: string
  fromRun?: string
  skipUrlCheck: boolean
  listRuns: boolean
  listJourneys: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    url: DEFAULT_URL,
    skipUrlCheck: false,
    listRuns: false,
    listJourneys: false,
  }
  for (const raw of argv.slice(2)) {
    if (raw.startsWith("--journey=")) args.journey = raw.slice("--journey=".length)
    else if (raw.startsWith("--url=")) args.url = raw.slice("--url=".length)
    else if (raw.startsWith("--from-run=")) args.fromRun = raw.slice("--from-run=".length)
    else if (raw === "--skip-url-check") args.skipUrlCheck = true
    else if (raw === "--list-runs") args.listRuns = true
    else if (raw === "--list-journeys") args.listJourneys = true
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
  --from-run=<runId>   Resume an existing run. Auto-detects which stage to
                       restart from based on artefacts present in the run dir.
  --skip-url-check     Skip the pre-flight 2xx ping. Use when the target
                       blocks HEAD + GET.
  --list-runs          Print every run directory under docs/reviews/ and exit.
  --list-journeys      Print every registered journey and exit.
  -h, --help           Show this.

Output:
  docs/reviews/<runId>/
    capture.webm
    frames/*.png
    critique.json
    claude-critique.json
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

/**
 * Inspect a run directory to figure out which artefacts already exist
 * and thus where to resume from. Order matters: report.md implies
 * critique.json which implies capture.webm.
 */
interface RunArtifacts {
  hasVideo: boolean
  hasCritique: boolean
  hasClaudeCritique: boolean
  hasReport: boolean
  videoPath: string
  critiqueJsonPath: string
  claudeCritiqueJsonPath: string
}

async function detectArtifacts(outDir: string): Promise<RunArtifacts> {
  const videoPath = join(outDir, "capture.webm")
  const critiqueJsonPath = join(outDir, "critique.json")
  const claudeCritiqueJsonPath = join(outDir, "claude-critique.json")
  const reportPath = join(outDir, "report.md")
  const [video, critiqueJson, claudeCritiqueJson, report] = await Promise.all([
    fileExists(videoPath),
    fileExists(critiqueJsonPath),
    fileExists(claudeCritiqueJsonPath),
    fileExists(reportPath),
  ])
  return {
    hasVideo: video,
    hasCritique: critiqueJson,
    hasClaudeCritique: claudeCritiqueJson,
    hasReport: report,
    videoPath,
    critiqueJsonPath,
    claudeCritiqueJsonPath,
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path)
    return info.isFile() && info.size > 0
  } catch {
    return false
  }
}

async function loadCritique(critiqueJsonPath: string): Promise<StructuredCritique> {
  const raw = await readFile(critiqueJsonPath, "utf8")
  const parsed = JSON.parse(raw) as unknown
  const result = CritiqueSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Existing critique.json at ${critiqueJsonPath} no longer matches the schema. Delete it and re-run without --from-run, or fix it by hand.`,
    )
  }
  return result.data
}

interface ResumeMetadata {
  journey: Journey
  capturedUrl: string
  capturedAt: string
}

async function loadResumeMetadata(runId: string, capturedUrlOverride?: string): Promise<ResumeMetadata> {
  const metadataPath = join(REVIEWS_ROOT, runId, "metadata.json")
  try {
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as {
      journeyName?: string
      capturedUrl?: string
      capturedAt?: string
    }
    if (metadata.journeyName) {
      return {
        journey: getJourney(metadata.journeyName),
        capturedUrl: capturedUrlOverride ?? metadata.capturedUrl ?? DEFAULT_URL,
        capturedAt: metadata.capturedAt ?? new Date().toISOString(),
      }
    }
  } catch {
    // Older runs do not have metadata.json. Fall through to frontmatter / run-id inference.
  }

  const reportPath = join(REVIEWS_ROOT, runId, "report.md")
  let body = ""
  try {
    body = await readFile(reportPath, "utf8")
  } catch {
    // No report yet - infer from runId suffix
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
        journeyName = Object.keys(JOURNEYS).find((n) => v.toLowerCase().includes(n))
      } else if (kv[1] === "url") capturedUrl = v
      else if (kv[1] === "capturedAt") capturedAt = v
    }
  }
  if (!journeyName) {
    journeyName = runId.match(/^\d{4}-\d{2}-\d{2}-([a-z-]+)-[a-z0-9]{4}$/)?.[1]
  }
  const journey = getJourney(journeyName)
  return { journey, capturedUrl: capturedUrlOverride ?? capturedUrl, capturedAt }
}

async function listRuns(): Promise<void> {
  try {
    const entries = await readdir(REVIEWS_ROOT)
    const runs = entries.filter((e) => e !== "INDEX.md" && !e.startsWith("."))
    if (runs.length === 0) {
      console.log("No runs found in docs/reviews/.")
      return
    }
    runs.sort().reverse()
    console.log(`${runs.length} run${runs.length === 1 ? "" : "s"} in docs/reviews/:\n`)
    for (const runId of runs) {
      const arts = await detectArtifacts(join(REVIEWS_ROOT, runId))
      const flags = [
        arts.hasVideo ? "video" : "-",
        arts.hasCritique ? "gemini" : "-",
        arts.hasClaudeCritique ? "claude" : "-",
        arts.hasReport ? "report" : "-",
      ].join(" / ")
      console.log(`  ${runId}   [${flags}]`)
    }
    console.log(`\nResume any with: pnpm review --from-run=<runId>`)
  } catch (err) {
    console.error(`Could not list runs: ${err instanceof Error ? err.message : String(err)}`)
  }
}

function listJourneys(): void {
  console.log("Registered journeys:\n")
  for (const j of Object.values(JOURNEYS)) {
    console.log(`  ${j.name.padEnd(14)}  ${j.label}  (~${j.targetSeconds}s)`)
  }
  console.log(`\nDefault: paid-funnel. Override with --journey=<name>.`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  if (args.listRuns) {
    await listRuns()
    return
  }
  if (args.listJourneys) {
    listJourneys()
    return
  }

  if (args.fromRun) {
    await runResume(args.fromRun, args.url === DEFAULT_URL ? undefined : args.url)
    return
  }

  await runFresh(args)
}

async function runFresh(args: ParsedArgs): Promise<void> {
  const journey = getJourney(args.journey)
  try {
    new URL(args.url)
  } catch {
    throw new Error(`--url is not a valid URL: ${args.url}`)
  }

  const runId = makeRunId(journey.name)
  const outDir = resolve(REVIEWS_ROOT, runId)
  await mkdir(outDir, { recursive: true })
  const capturedAt = new Date().toISOString()

  console.log(`[review] runId: ${runId}`)
  console.log(`[review] journey: ${journey.label}`)
  console.log(`[review] url: ${args.url}`)

  await writeFile(
    join(outDir, "metadata.json"),
    JSON.stringify(
      {
        runId,
        journeyName: journey.name,
        journeyLabel: journey.label,
        capturedUrl: args.url,
        capturedAt,
      },
      null,
      2,
    ),
    "utf8",
  )

  await preflight({
    targetUrl: args.url,
    skipUrlCheck: args.skipUrlCheck,
    outDirParent: REVIEWS_ROOT,
  })

  const captureResult: CaptureResult = await capture({
    baseUrl: args.url,
    journey,
    outDir,
  })
  console.log(`[review] captured ${captureResult.durationSeconds.toFixed(1)}s -> ${captureResult.videoPath}`)

  const critiqueResult: CritiqueResult = await critique({
    videoPath: captureResult.videoPath,
    outDir,
    journeyLabel: journey.label,
    capturedUrl: args.url,
  })
  console.log(`[review] Gemini critique scored ${critiqueResult.critique.overall_score}/10 -> ${critiqueResult.critiqueJsonPath}`)

  const claudeCritiqueResult: ClaudeCritiqueResult = await critiqueWithClaudeVision({
    framesDir: captureResult.framesDir,
    outDir,
    journeyLabel: journey.label,
    capturedUrl: args.url,
  })
  console.log(
    `[review] Claude vision critique scored ${claudeCritiqueResult.critique.overall_score}/10 -> ${claudeCritiqueResult.critiqueJsonPath}`,
  )

  const synthResult = await synthesize({
    critique: critiqueResult.critique,
    claudeCritique: claudeCritiqueResult.critique,
    outDir,
    runId,
    journeyLabel: journey.label,
    capturedUrl: args.url,
    capturedAt,
    framesDir: captureResult.framesDir,
    domEvidencePath: captureResult.domEvidencePath,
  })
  console.log(`[review] report written: ${synthResult.reportPath}`)

  await updateIndex()
  console.log(`[review] index updated`)

  console.log(`\n✅ Done. Open ${synthResult.reportPath}`)
}

async function runResume(runId: string, capturedUrlOverride?: string): Promise<void> {
  const outDir = resolve(REVIEWS_ROOT, runId)
  try {
    const info = await stat(outDir)
    if (!info.isDirectory()) throw new Error("not a directory")
  } catch {
    throw new Error(
      `Run directory ${outDir} not found. Use \`pnpm review --list-runs\` to see available runs.`,
    )
  }

  const arts = await detectArtifacts(outDir)
  const meta = await loadResumeMetadata(runId, capturedUrlOverride)

  console.log(`[review] resuming run: ${runId}`)
  console.log(
    `[review] artefacts: video=${arts.hasVideo} gemini=${arts.hasCritique} claude=${arts.hasClaudeCritique} report=${arts.hasReport}`,
  )

  await preflight({
    targetUrl: meta.capturedUrl,
    skipUrlCheck: true,
    resumeFromRunId: runId,
  })

  let captureResult: { videoPath: string; framesDir: string; durationSeconds: number; domEvidencePath: string }
  if (arts.hasVideo) {
    captureResult = {
      videoPath: arts.videoPath,
      framesDir: join(outDir, "frames"),
      durationSeconds: 0,
      domEvidencePath: join(outDir, "dom-evidence.json"),
    }
    console.log(`[review] reusing existing capture.webm`)
  } else {
    console.log(`[review] no capture.webm - running capture stage...`)
    captureResult = await capture({
      baseUrl: meta.capturedUrl,
      journey: meta.journey,
      outDir,
    })
  }

  let critiqueData: StructuredCritique
  if (arts.hasCritique) {
    critiqueData = await loadCritique(arts.critiqueJsonPath)
    console.log(`[review] reusing existing critique.json (Gemini score ${critiqueData.overall_score}/10)`)
  } else {
    console.log(`[review] no critique.json - running critique stage...`)
    const c = await critique({
      videoPath: captureResult.videoPath,
      outDir,
      journeyLabel: meta.journey.label,
      capturedUrl: meta.capturedUrl,
    })
    critiqueData = c.critique
  }

  let claudeCritiqueData: StructuredCritique
  if (arts.hasClaudeCritique) {
    claudeCritiqueData = await loadCritique(arts.claudeCritiqueJsonPath)
    console.log(
      `[review] reusing existing claude-critique.json (Claude score ${claudeCritiqueData.overall_score}/10)`,
    )
  } else {
    console.log(`[review] no claude-critique.json - running Claude vision critique stage...`)
    const c = await critiqueWithClaudeVision({
      framesDir: captureResult.framesDir,
      outDir,
      journeyLabel: meta.journey.label,
      capturedUrl: meta.capturedUrl,
    })
    claudeCritiqueData = c.critique
  }

  console.log(`[review] running synthesize stage...`)
  const synthResult = await synthesize({
    critique: critiqueData,
    claudeCritique: claudeCritiqueData,
    outDir,
    runId,
    journeyLabel: meta.journey.label,
    capturedUrl: meta.capturedUrl,
    capturedAt: meta.capturedAt,
    framesDir: captureResult.framesDir,
    domEvidencePath: captureResult.domEvidencePath,
  })

  await updateIndex()
  console.log(`[review] index updated`)
  console.log(`\n✅ Done. Open ${synthResult.reportPath}`)
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`\n[review] ❌ ${msg}`)
  process.exit(1)
})
