/* eslint-disable no-console */

import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  assertCanonicalDeadCodeKeys,
  compareDeadCodeKeys,
  type DeadCodeMode,
  type KnipJsonReport,
  normalizeKnipReport,
} from "./dead-code-baseline-lib"

interface DeadCodeBaselineFile {
  version: 1
  keys: string[]
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const BASELINE_PATH = join(ROOT, "scripts/dead-code-baseline.json")
const KNIP_BINARY = join(
  ROOT,
  "node_modules/.bin",
  process.platform === "win32" ? "knip.cmd" : "knip",
)

function main() {
  const writeBaseline = process.argv.slice(2).includes("--write")
  const unknownArgs = process.argv.slice(2).filter((arg) => arg !== "--write")
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(", ")}`)
  }

  const keys = uniqueSorted([
    ...runKnip("full"),
    ...runKnip("production"),
  ])

  if (writeBaseline) {
    const baseline: DeadCodeBaselineFile = { version: 1, keys }
    writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8")
    console.log(`Wrote ${keys.length} dead-code baseline keys.`)
    return
  }

  const baseline = readBaseline()
  const comparison = compareDeadCodeKeys(keys, baseline.keys)
  console.log(
    `Dead-code ratchet: current=${keys.length} baseline=${baseline.keys.length}`,
  )

  if (comparison.newKeys.length > 0) {
    console.error("New dead-code findings:")
    for (const key of comparison.newKeys) console.error(`  + ${key}`)
  }

  if (comparison.staleKeys.length > 0) {
    console.error("Resolved findings still present in the baseline:")
    for (const key of comparison.staleKeys) console.error(`  - ${key}`)
  }

  if (comparison.newKeys.length > 0 || comparison.staleKeys.length > 0) {
    process.exitCode = 1
    return
  }

  console.log("Dead-code baseline matches both Knip modes.")
}

function runKnip(mode: DeadCodeMode): string[] {
  const args = [
    ...(mode === "production" ? ["--production"] : []),
    "--reporter",
    "json",
    "--no-exit-code",
    "--no-progress",
  ]
  const result = spawnSync(KNIP_BINARY, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 64 * 1024 * 1024,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    const details = (result.stderr || result.stdout).trim()
    throw new Error(
      `Knip ${mode} scan failed with exit ${result.status ?? "unknown"}${details ? `\n${details}` : ""}`,
    )
  }

  let report: KnipJsonReport
  try {
    report = JSON.parse(result.stdout) as KnipJsonReport
  } catch (error) {
    throw new Error(`Knip ${mode} scan returned invalid JSON`, { cause: error })
  }
  return normalizeKnipReport(mode, report)
}

function readBaseline(): DeadCodeBaselineFile {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as {
    version?: unknown
    keys?: unknown
  }
  if (baseline.version !== 1) {
    throw new Error("Unsupported dead-code baseline format")
  }
  assertCanonicalDeadCodeKeys(baseline.keys)
  return { version: 1, keys: baseline.keys }
}

function uniqueSorted(keys: string[]): string[] {
  return [...new Set(keys)].sort()
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
