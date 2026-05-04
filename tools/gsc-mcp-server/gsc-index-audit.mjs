import { google } from "googleapis"

const SITE_URL = "sc-domain:instantmed.com.au"
const SITE_ORIGIN = "https://instantmed.com.au"
const USER_AGENT = "InstantMedGscIndexAudit/1.0"

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

function getLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
  })

  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  }
}

function metricRow(row) {
  return {
    page: row.keys?.[0] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }
}

function sitemapGroup(url) {
  return new URL(url).pathname
}

async function getLiveSitemaps() {
  const robots = await fetchText(`${SITE_ORIGIN}/robots.txt`)
  const sitemapUrls = [...robots.text.matchAll(/^Sitemap:\s*(\S+)$/gim)].map(
    (match) => match[1],
  )

  const sitemaps = []
  for (const sitemap of sitemapUrls) {
    const response = await fetchText(sitemap)
    sitemaps.push({
      sitemap,
      status: response.status,
      ok: response.ok,
      urls: getLocs(response.text),
    })
  }

  return {
    robots: {
      status: robots.status,
      ok: robots.ok,
    },
    sitemaps,
  }
}

async function getPerformancePages(searchconsole, startDate, endDate) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 25000,
      dataState: "final",
    },
  })

  return (response.data.rows ?? [])
    .map(metricRow)
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
}

async function inspectUrl(searchconsole, url) {
  const response = await searchconsole.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl: url,
      siteUrl: SITE_URL,
    },
  })
  const inspection = response.data.inspectionResult ?? {}
  const indexStatus = inspection.indexStatusResult ?? {}

  return {
    url,
    verdict: indexStatus.verdict ?? "UNKNOWN",
    coverageState: indexStatus.coverageState ?? "UNKNOWN",
    robotsTxtState: indexStatus.robotsTxtState ?? "UNKNOWN",
    indexingState: indexStatus.indexingState ?? "UNKNOWN",
    pageFetchState: indexStatus.pageFetchState ?? "UNKNOWN",
    lastCrawlTime: indexStatus.lastCrawlTime ?? null,
    googleCanonical: indexStatus.googleCanonical ?? null,
    userCanonical: indexStatus.userCanonical ?? null,
    crawledAs: indexStatus.crawledAs ?? "UNKNOWN",
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const startDate = args.get("start-date") ?? daysAgo(93)
  const endDate = args.get("end-date") ?? daysAgo(3)
  const inspectLimit = Number(args.get("inspect-limit") ?? 12)

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  })
  const searchconsole = google.searchconsole({ version: "v1", auth })

  const [submittedSitemaps, live, performancePages] = await Promise.all([
    searchconsole.sitemaps.list({ siteUrl: SITE_URL }),
    getLiveSitemaps(),
    getPerformancePages(searchconsole, startDate, endDate),
  ])

  const performanceSet = new Set(performancePages.map((row) => row.page))
  const liveUrls = live.sitemaps.flatMap((sitemap) => sitemap.urls)
  const zeroPerformanceUrls = liveUrls.filter((url) => !performanceSet.has(url))
  const priorityUrls = [
    `${SITE_ORIGIN}/medical-certificate`,
    `${SITE_ORIGIN}/prescriptions`,
    `${SITE_ORIGIN}/consult`,
    `${SITE_ORIGIN}/online-doctor-australia`,
    `${SITE_ORIGIN}/telehealth-australia`,
    `${SITE_ORIGIN}/pricing`,
    `${SITE_ORIGIN}/our-doctors`,
    `${SITE_ORIGIN}/reviews`,
    ...zeroPerformanceUrls.slice(0, Math.max(0, inspectLimit - 8)),
  ]

  const inspected = []
  for (const url of [...new Set(priorityUrls)].slice(0, inspectLimit)) {
    try {
      inspected.push(await inspectUrl(searchconsole, url))
    } catch (error) {
      inspected.push({
        url,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    property: SITE_URL,
    siteOrigin: SITE_ORIGIN,
    dateRange: { startDate, endDate },
    submittedSitemaps: (submittedSitemaps.data.sitemap ?? []).map((sitemap) => ({
      path: sitemap.path,
      lastSubmitted: sitemap.lastSubmitted,
      lastDownloaded: sitemap.lastDownloaded,
      isPending: sitemap.isPending,
      warnings: sitemap.warnings,
      errors: sitemap.errors,
      contents: sitemap.contents ?? [],
    })),
    liveSitemaps: live.sitemaps.map((sitemap) => ({
      sitemap: sitemap.sitemap,
      status: sitemap.status,
      ok: sitemap.ok,
      urlCount: sitemap.urls.length,
      performanceRows: sitemap.urls.filter((url) => performanceSet.has(url)).length,
      zeroPerformanceSample: sitemap.urls
        .filter((url) => !performanceSet.has(url))
        .slice(0, 10),
    })),
    totals: {
      liveSitemapUrls: liveUrls.length,
      uniqueLiveSitemapUrls: new Set(liveUrls).size,
      performancePages: performancePages.length,
      pagesWithClicks: performancePages.filter((page) => page.clicks > 0).length,
      zeroPerformanceSitemapUrls: zeroPerformanceUrls.length,
    },
    topPages: performancePages.slice(0, 25),
    weakSitemapGroups: live.sitemaps
      .map((sitemap) => ({
        group: sitemapGroup(sitemap.sitemap),
        urlCount: sitemap.urls.length,
        performanceRows: sitemap.urls.filter((url) => performanceSet.has(url)).length,
      }))
      .filter((group) => group.urlCount > 0 && group.performanceRows === 0),
    inspected,
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
