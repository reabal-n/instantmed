/* eslint-disable no-undef */

import { spawnSync } from "node:child_process"

import { google } from "googleapis"

const SITE_URL = "sc-domain:instantmed.com.au"
const SITE_ORIGIN = "https://instantmed.com.au"
const USER_AGENT = "InstantMedCommercialIntentInspect/1.0"

function parseArgs(argv) {
  const args = new Map()
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=")
    args.set(key, value ?? "true")
  }
  return args
}

// Targets = the LIVE med-cert reason pages at /medical-certificate/<slug>.
// The old /intent/* list (via the deleted lib/seo/commercial-intent-tracking.ts,
// removed in the 2026-07-03 hygiene batch) tracked wholesale-iceboxed pages.
function loadTargets() {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "--eval",
      [
        'import { MED_CERT_INTENT_SLUGS, MED_CERT_SLUG_CERT_TYPE, medCertIntentConfigs } from "./lib/marketing/med-cert-intent-config.ts"',
        // Unsupported use cases (centrelink, return-to-work) 308 to their
        // not-suitable boundary pages — deliberately not commercial targets.
        'import { UNSUPPORTED_MED_CERT_SLUGS } from "./lib/medical-cert/unsupported-use-cases.ts"',
        `const origin = ${JSON.stringify(SITE_ORIGIN)}`,
        "const targets = MED_CERT_INTENT_SLUGS",
        "  .filter((slug) => !UNSUPPORTED_MED_CERT_SLUGS.includes(slug))",
        "  .map((slug, index) => {",
        "    const page = medCertIntentConfigs[slug]",
        "    return {",
        "      priority: index + 1,",
        "      slug,",
        "      url: `${origin}/medical-certificate/${slug}`,",
        "      cluster: MED_CERT_SLUG_CERT_TYPE[slug],",
        "      title: page.h1,",
        "      primaryQuery: page.metadata.keywords?.[0] ?? page.metadata.title,",
        "    }",
        "  })",
        "console.log(JSON.stringify(targets))",
      ].join("\n"),
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    },
  )

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to load commercial SEO targets")
  }

  return JSON.parse(result.stdout)
}

async function fetchHead(url) {
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "manual",
    headers: { "user-agent": USER_AGENT },
  })

  return {
    status: response.status,
    location: response.headers.get("location"),
    canonicalCandidate: response.url,
  }
}

async function inspectUrl(searchconsole, target) {
  const [live, inspectionResponse] = await Promise.all([
    fetchHead(target.url).catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    })),
    searchconsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: target.url,
        siteUrl: SITE_URL,
      },
    }),
  ])

  const inspection = inspectionResponse.data.inspectionResult ?? {}
  const indexStatus = inspection.indexStatusResult ?? {}

  return {
    priority: target.priority,
    slug: target.slug,
    url: target.url,
    cluster: target.cluster,
    live,
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

function isCanonicalMismatch(row) {
  const expected = row.url.replace(/\/$/, "")
  const userCanonical = row.userCanonical?.replace(/\/$/, "")
  const googleCanonical = row.googleCanonical?.replace(/\/$/, "")
  return Boolean(
    (userCanonical && userCanonical !== expected) ||
      (googleCanonical && googleCanonical !== expected),
  )
}

function printSummary(report) {
  console.log("Commercial intent GSC inspection")
  console.log(`Generated: ${report.generatedAt}`)
  console.log(`Targets: ${report.totals.targets}`)
  console.log(`Live 200: ${report.totals.liveOk}`)
  console.log(`Canonical mismatches: ${report.totals.canonicalMismatches}`)
  console.log(`Inspection errors: ${report.totals.errors}`)

  const concerning = report.inspected.filter(
    (row) =>
      row.error ||
      row.live?.status !== 200 ||
      isCanonicalMismatch(row) ||
      row.robotsTxtState === "BLOCKED" ||
      row.indexingState === "BLOCKED",
  )

  if (concerning.length === 0) {
    console.log("\nNo live-status, robots, indexing, or canonical blockers found in inspected URLs.")
    return
  }

  console.log("\nItems to review:")
  for (const row of concerning) {
    console.log(
      [
        `${row.priority}. ${row.slug}`,
        `live=${row.live?.status ?? row.live?.error ?? "UNKNOWN"}`,
        `verdict=${row.verdict ?? row.error ?? "ERROR"}`,
        `coverage=${row.coverageState ?? "UNKNOWN"}`,
        `userCanonical=${row.userCanonical ?? "UNKNOWN"}`,
        `googleCanonical=${row.googleCanonical ?? "UNKNOWN"}`,
      ].join(" | "),
    )
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const format = args.get("format") ?? "summary"
  const dryRun = args.get("dry-run") === "true"
  const limit = Number(args.get("limit") ?? "25")
  const targets = loadTargets().slice(0, limit)

  if (dryRun) {
    const payload = {
      property: SITE_URL,
      targets,
    }
    console.log(format === "json" ? JSON.stringify(payload, null, 2) : targets.map((target) => target.url).join("\n"))
    return
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  })
  const searchconsole = google.searchconsole({ version: "v1", auth })

  const inspected = []
  for (const target of targets) {
    try {
      inspected.push(await inspectUrl(searchconsole, target))
    } catch (error) {
      inspected.push({
        priority: target.priority,
        slug: target.slug,
        url: target.url,
        cluster: target.cluster,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    property: SITE_URL,
    siteOrigin: SITE_ORIGIN,
    totals: {
      targets: targets.length,
      liveOk: inspected.filter((row) => row.live?.status === 200).length,
      canonicalMismatches: inspected.filter(isCanonicalMismatch).length,
      errors: inspected.filter((row) => row.error).length,
    },
    inspected,
  }

  if (format === "json") {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printSummary(report)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
