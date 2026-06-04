/**
 * Google Indexing API submitter (urlNotifications.publish).
 *
 * Quota: ~200 URLs/day (vs GSC "Request Indexing" ~10-20/day manual). Auth is
 * ADC (the GSC-owner account) with the auth/indexing scope — same as the
 * tools/gsc-mcp-server MCP server. This is the WRITE counterpart to the
 * read-only gsc-index-audit.mjs (kept separate so the read-only contract test
 * on the audit script stays green).
 *
 * Usage:
 *   node gsc-submit-indexing.mjs --sitemaps                 # submit every live sitemap URL (the keep-set)
 *   node gsc-submit-indexing.mjs --from-file=urls.txt       # submit URLs from a file (one per line)
 *   node gsc-submit-indexing.mjs --urls=https://a,https://b
 *   add --type=URL_DELETED to remove, --limit=N (default 200), --dry-run to preview.
 */
import { readFileSync } from "node:fs"

import { google } from "googleapis"

const SITE_ORIGIN = "https://instantmed.com.au"
const USER_AGENT = "InstantMedIndexingSubmit/1.0"

function parseArgs(argv) {
  const args = new Map()
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=")
    args.set(key, value ?? "true")
  }
  return args
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { "user-agent": USER_AGENT } })
  return { ok: r.ok, status: r.status, text: await r.text() }
}

async function sitemapUrls() {
  const robots = await fetchText(`${SITE_ORIGIN}/robots.txt`)
  const sitemaps = [...robots.text.matchAll(/^Sitemap:\s*(\S+)$/gim)].map((m) => m[1])
  const urls = new Set()
  for (const sm of sitemaps) {
    const res = await fetchText(sm)
    if (!res.ok) continue
    // sitemap index? expand nested sitemaps
    const nested = [...res.text.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    if (nested.length) {
      for (const n of nested) {
        const r2 = await fetchText(n)
        for (const m of r2.text.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>/g)) urls.add(m[1])
      }
    }
    for (const m of res.text.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>/g)) urls.add(m[1])
  }
  return [...urls]
}

function fileUrls(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const type = args.get("type") ?? "URL_UPDATED"
  const limit = Number(args.get("limit") ?? 200)
  const dryRun = args.has("dry-run")
  const delayMs = Number(args.get("delay") ?? 60)

  let urls = []
  if (args.has("sitemaps")) urls = await sitemapUrls()
  else if (args.has("from-file")) urls = fileUrls(args.get("from-file"))
  else if (args.has("urls")) urls = args.get("urls").split(",").map((u) => u.trim()).filter(Boolean)
  else {
    console.error("Provide --sitemaps, --from-file=path, or --urls=a,b")
    process.exitCode = 1
    return
  }

  urls = [...new Set(urls)].slice(0, limit)
  console.log(`${dryRun ? "[DRY RUN] " : ""}${type}: ${urls.length} URLs (limit ${limit})`)

  if (dryRun) {
    urls.forEach((u) => console.log("  " + u))
    return
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/indexing"],
  })
  const indexing = google.indexing({ version: "v3", auth })

  let submitted = 0
  const errors = []
  for (const url of urls) {
    try {
      await indexing.urlNotifications.publish({ requestBody: { url, type } })
      submitted += 1
      process.stdout.write(".")
    } catch (error) {
      errors.push({ url, error: error?.message ?? String(error) })
      process.stdout.write("x")
    }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
  }
  console.log(`\n\nSubmitted ${submitted}/${urls.length}. Errors: ${errors.length}`)
  for (const e of errors.slice(0, 15)) console.log(`  ERROR ${e.url} — ${e.error}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
