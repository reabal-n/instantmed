#!/usr/bin/env node
/**
 * Semrush organic pulse — read-only SEO snapshot for instantmed.com.au.
 *
 * Pulls the domain overview + top organic positions from the Semrush Analytics
 * API so we can track ranking progress (positions, keywords, traffic) over time
 * without opening the Semrush UI. This is the standard Analytics API; the newer
 * "AI Visibility" score (14/100 as of 2026-06-20) is a separate Semrush product
 * not exposed here — track that in the UI.
 *
 * Auth: set SEMRUSH_API_KEY in the environment (.env.local / Vercel). The key is
 * NEVER hardcoded or logged. Get/rotate it in Semrush → Subscription → API.
 *
 * Usage:
 *   SEMRUSH_API_KEY=... node tools/semrush/semrush-pulse.mjs
 *   pnpm seo:semrush-pulse                      # if key is in the shell env
 *   pnpm seo:semrush-pulse -- --limit=40 --db=au --domain=instantmed.com.au
 *
 * Each call costs Semrush API units; check the balance line in the output.
 */

const API = "https://api.semrush.com/"

function parseArgs(argv) {
  const a = new Map()
  for (const raw of argv) {
    const [k, v] = raw.replace(/^--/, "").split("=")
    a.set(k, v ?? "true")
  }
  return a
}

async function call(params, key) {
  const url = new URL(API)
  url.searchParams.set("key", key)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url, { headers: { "user-agent": "InstantMedSemrushPulse/1.0" } })
  const text = await res.text()
  if (!res.ok || text.startsWith("ERROR")) {
    throw new Error(`Semrush ${params.type} failed (HTTP ${res.status}): ${text.slice(0, 160)}`)
  }
  return text
}

/** Semrush returns ;-separated CSV with a header row. */
function parseRows(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(";")
  return lines.slice(1).map((line) => {
    const cells = line.split(";")
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]))
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const key = process.env.SEMRUSH_API_KEY
  if (!key) {
    console.error("Missing SEMRUSH_API_KEY. Set it in .env.local / Vercel, then re-run.")
    process.exitCode = 1
    return
  }
  const domain = args.get("domain") ?? "instantmed.com.au"
  const database = args.get("db") ?? "au"
  const limit = Number(args.get("limit") ?? 25)

  // Units balance (cheap, informational)
  let units = "?"
  try {
    units = (await (await fetch(`https://www.semrush.com/users/countapiunits.html?key=${key}`)).text()).trim()
  } catch { /* non-fatal */ }

  const overview = parseRows(
    await call(
      {
        type: "domain_ranks",
        domain,
        database,
        export_columns: "Db,Dn,Rk,Or,Ot,Oc,Ad,At",
      },
      key,
    ),
  )[0]

  const positions = parseRows(
    await call(
      {
        type: "domain_organic",
        domain,
        database,
        display_limit: limit,
        display_sort: "tr_desc",
        export_columns: "Ph,Po,Pp,Nq,Cp,Ur,Tr",
      },
      key,
    ),
  )

  const report = {
    generatedAt: new Date().toISOString(),
    domain,
    database,
    apiUnitsRemaining: units,
    overview: overview
      ? {
          semrushRank: overview["Rank"],
          organicKeywords: overview["Organic Keywords"],
          organicTrafficEst: overview["Organic Traffic"],
          organicCostEst: overview["Organic Cost"],
        }
      : null,
    topPositions: positions.map((r) => ({
      keyword: r["Keyword"],
      position: Number(r["Position"]),
      prevPosition: r["Previous Position"] ? Number(r["Previous Position"]) : null,
      volume: Number(r["Search Volume"]),
      url: r["Url"],
      trafficShare: r["Traffic (%)"],
    })),
    positionBuckets: positions.reduce(
      (acc, r) => {
        const p = Number(r["Position"])
        if (p <= 3) acc["1-3"]++
        else if (p <= 10) acc["4-10"]++
        else if (p <= 20) acc["11-20"]++
        else if (p <= 50) acc["21-50"]++
        else acc["51+"]++
        return acc
      },
      { "1-3": 0, "4-10": 0, "11-20": 0, "21-50": 0, "51+": 0 },
    ),
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
