import { execFileSync } from "node:child_process"
import { google } from "googleapis"

const SITE_URL = "sc-domain:instantmed.com.au"
const SITE_ORIGIN = "https://instantmed.com.au"

function parseArgs(argv) {
  const args = new Map()
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=")
    args.set(key, value ?? "true")
  }
  return args
}

function daysAgo(days) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function loadTrackingTargets(siteOrigin) {
  const code = [
    'import { getCommercialSeoTrackingTargets } from "./lib/seo/commercial-intent-tracking.ts"',
    `console.log(JSON.stringify(getCommercialSeoTrackingTargets(${JSON.stringify(siteOrigin)})))`,
  ].join("\n")

  const output = execFileSync("pnpm", ["exec", "tsx", "--eval", code], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })

  return JSON.parse(output)
}

function weightedPosition(rows) {
  const impressions = rows.reduce((total, row) => total + (row.impressions ?? 0), 0)
  if (impressions === 0) return 0
  return rows.reduce(
    (total, row) => total + ((row.position ?? 0) * (row.impressions ?? 0)),
    0,
  ) / impressions
}

function summariseRows(rows) {
  const clicks = rows.reduce((total, row) => total + (row.clicks ?? 0), 0)
  const impressions = rows.reduce((total, row) => total + (row.impressions ?? 0), 0)

  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: weightedPosition(rows),
  }
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function formatPosition(value) {
  return value > 0 ? value.toFixed(1) : "n/a"
}

async function getIntentRows(searchconsole, startDate, endDate) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page", "query"],
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: "page",
              operator: "contains",
              expression: `${SITE_ORIGIN}/intent/`,
            },
          ],
        },
      ],
      rowLimit: 25000,
      dataState: "final",
    },
  })

  return response.data.rows ?? []
}

function buildReport(targets, rows, startDate, endDate) {
  const rowsByUrl = new Map()
  for (const row of rows) {
    const url = row.keys?.[0] ?? ""
    const query = row.keys?.[1] ?? ""
    const entry = {
      query,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }

    rowsByUrl.set(url, [...(rowsByUrl.get(url) ?? []), entry])
  }

  const pages = targets.map((target) => {
    const pageRows = rowsByUrl.get(target.url) ?? []
    const summary = summariseRows(pageRows)
    const primaryQuery = pageRows.find((row) => row.query === target.primaryQuery)
    const topQueries = [...pageRows]
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 5)

    return {
      ...target,
      metrics: {
        clicks: summary.clicks,
        impressions: summary.impressions,
        ctr: summary.ctr,
        position: summary.position,
      },
      primaryQueryMetrics: primaryQuery ?? null,
      topQueries,
      status:
        summary.clicks > 0
          ? "clicking"
          : summary.impressions > 0
            ? "visible"
            : "no_gsc_rows",
    }
  })

  const clusters = Object.values(
    pages.reduce((acc, page) => {
      const bucket = acc[page.cluster] ?? {
        cluster: page.cluster,
        targetCount: 0,
        clicks: 0,
        impressions: 0,
      }
      bucket.targetCount += 1
      bucket.clicks += page.metrics.clicks
      bucket.impressions += page.metrics.impressions
      acc[page.cluster] = bucket
      return acc
    }, {}),
  ).map((cluster) => ({
    ...cluster,
    ctr: cluster.impressions > 0 ? cluster.clicks / cluster.impressions : 0,
  }))

  const totals = {
    targetCount: targets.length,
    rows: rows.length,
    clickingPages: pages.filter((page) => page.status === "clicking").length,
    visiblePages: pages.filter((page) => page.metrics.impressions > 0).length,
    clicks: pages.reduce((total, page) => total + page.metrics.clicks, 0),
    impressions: pages.reduce((total, page) => total + page.metrics.impressions, 0),
  }

  return {
    generatedAt: new Date().toISOString(),
    property: SITE_URL,
    siteOrigin: SITE_ORIGIN,
    dateRange: { startDate, endDate },
    totals: {
      ...totals,
      ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
    },
    clusters: clusters.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions),
    pages: pages.sort((a, b) => a.priority - b.priority),
  }
}

function printSummary(report) {
  console.log(`Commercial SEO Pulse: ${report.dateRange.startDate} to ${report.dateRange.endDate}`)
  console.log(
    `Targets: ${report.totals.targetCount} | Visible: ${report.totals.visiblePages} | Clicks: ${report.totals.clicks} | Impressions: ${report.totals.impressions} | CTR: ${formatPercent(report.totals.ctr)}`,
  )
  console.log("")
  console.table(
    report.clusters.map((cluster) => ({
      cluster: cluster.cluster,
      pages: cluster.targetCount,
      clicks: cluster.clicks,
      impressions: cluster.impressions,
      ctr: formatPercent(cluster.ctr),
    })),
  )
  console.log("")
  console.table(
    report.pages.map((page) => ({
      priority: page.priority,
      slug: page.slug,
      cluster: page.cluster,
      status: page.status,
      clicks: page.metrics.clicks,
      impressions: page.metrics.impressions,
      ctr: formatPercent(page.metrics.ctr),
      position: formatPosition(page.metrics.position),
      primaryQuery: page.primaryQuery,
    })),
  )
}

function printTargets(targets) {
  console.log(`Commercial SEO tracking targets: ${targets.length}`)
  console.table(
    targets.map((target) => ({
      priority: target.priority,
      slug: target.slug,
      cluster: target.cluster,
      primaryQuery: target.primaryQuery,
    })),
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const startDate = args.get("start-date") ?? daysAgo(93)
  const endDate = args.get("end-date") ?? daysAgo(3)
  const format = args.get("format") ?? "summary"

  const targets = loadTrackingTargets(SITE_ORIGIN)

  if (args.get("dry-run") === "true") {
    if (format === "json") {
      console.log(JSON.stringify({ siteOrigin: SITE_ORIGIN, targets }, null, 2))
      return
    }
    printTargets(targets)
    return
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  })
  const searchconsole = google.searchconsole({ version: "v1", auth })
  const rows = await getIntentRows(searchconsole, startDate, endDate)
  const report = buildReport(targets, rows, startDate, endDate)

  if (format === "json") {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  printSummary(report)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
