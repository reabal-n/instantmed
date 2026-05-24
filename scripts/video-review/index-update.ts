/**
 * Auto-maintain docs/reviews/INDEX.md.
 *
 * Scans every <runId>/report.md, extracts the YAML frontmatter, and
 * rewrites the index table sorted newest first. Stable: re-running on
 * an already-up-to-date directory is a no-op (idempotent table render).
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"

const REVIEWS_DIR = "docs/reviews"

interface RunEntry {
  runId: string
  journey: string
  url: string
  overallScore: number | string
  capturedAt: string
  headline: string
}

export async function updateIndex(reviewsDir: string = REVIEWS_DIR): Promise<void> {
  const entries: RunEntry[] = []

  let dirents: string[]
  try {
    dirents = await readdir(reviewsDir)
  } catch {
    return
  }

  for (const name of dirents) {
    if (name === "INDEX.md") continue
    const dirPath = join(reviewsDir, name)
    let info
    try {
      info = await stat(dirPath)
    } catch {
      continue
    }
    if (!info.isDirectory()) continue

    const reportPath = join(dirPath, "report.md")
    let body: string
    try {
      body = await readFile(reportPath, "utf8")
    } catch {
      continue
    }

    const parsed = parseFrontmatter(body, name)
    if (parsed) entries.push(parsed)
  }

  entries.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))

  const rows = entries.length
    ? entries
        .map(
          (e) =>
            `| ${e.capturedAt} | [${e.runId}](${e.runId}/report.md) | ${e.journey} | ${e.overallScore} | ${e.headline} |`,
        )
        .join("\n")
    : "| _no runs yet_ | | | | |"

  const indexMarkdown = `# Video review log

Auto-maintained by \`scripts/video-review/index-update.ts\`. Edit nothing here by hand. Re-run with \`pnpm review\` or by manually invoking the script.

| Captured | Run | Journey | Score | Headline |
|---|---|---|---|---|
${rows}
`

  await writeFile(join(reviewsDir, "INDEX.md"), indexMarkdown, "utf8")
}

function parseFrontmatter(body: string, fallbackRunId: string): RunEntry | null {
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return null
  const yaml = m[1] ?? ""
  const values = new Map<string, string>()
  for (const line of yaml.split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/)
    if (kv) values.set(kv[1]!, (kv[2] ?? "").trim().replace(/^['"]|['"]$/g, ""))
  }
  const headlineMatch = body.replace(m[0], "").match(/^\s*#\s+(.+)$/m)
  return {
    runId: values.get("runId") ?? fallbackRunId,
    journey: values.get("journey") ?? "unknown",
    url: values.get("url") ?? "",
    overallScore: values.get("overallScore") ?? "?",
    capturedAt: values.get("capturedAt") ?? "1970-01-01T00:00:00Z",
    headline: (headlineMatch?.[1] ?? "(no headline)").trim(),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateIndex().then(
    () => {
      console.log(`Updated ${join(REVIEWS_DIR, "INDEX.md")}`)
    },
    (err: unknown) => {
      console.error(err)
      process.exit(1)
    },
  )
}
