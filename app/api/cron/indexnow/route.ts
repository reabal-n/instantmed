/**
 * IndexNow Cron Job
 *
 * Submits all sitemap URLs to IndexNow daily so search engines (Bing, Yandex,
 * and participating engines) pick up content changes promptly.
 *
 * Cron Schedule: 0 6 * * * (daily at 06:00 UTC)
 */

import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-indexnow")

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || ""
const HOST = "instantmed.com.au"
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  if (!INDEXNOW_KEY) {
    logger.error("INDEXNOW_KEY env var not configured", {})
    return NextResponse.json({ error: "IndexNow not configured" }, { status: 500 })
  }

  try {
    // Fetch sitemap from live site
    const sitemapResponse = await fetch(`https://${HOST}/sitemap.xml`, {
      headers: { "User-Agent": "InstantMed-IndexNow/1.0" },
    })

    if (!sitemapResponse.ok) {
      logger.error("Failed to fetch sitemap for IndexNow cron", { status: sitemapResponse.status })
      return NextResponse.json(
        { error: `Failed to fetch sitemap: ${sitemapResponse.status}` },
        { status: 502 }
      )
    }

    const sitemapXml = await sitemapResponse.text()

    // Parse all <loc> URLs from sitemap XML
    const urlRegex = /<loc>(.*?)<\/loc>/g
    const urls: string[] = []
    let match: RegExpExecArray | null
    while ((match = urlRegex.exec(sitemapXml)) !== null) {
      urls.push(match[1])
    }

    if (urls.length === 0) {
      logger.warn("No URLs found in sitemap - IndexNow cron skipped", {})
      return NextResponse.json({ success: false, reason: "No URLs in sitemap" })
    }

    // IndexNow accepts up to 10,000 URLs per batch
    const batch = urls.slice(0, 10000)

    const indexNowResponse = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: batch,
      }),
    })

    logger.info("IndexNow cron submission complete", {
      urlCount: batch.length,
      status: indexNowResponse.status,
    })

    return NextResponse.json({
      success: indexNowResponse.ok,
      status: indexNowResponse.status,
      urlCount: batch.length,
    })
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "indexnow_cron" },
    })
    const err = toError(error)
    logger.error("IndexNow cron failed", { error: err.message })
    captureCronError(err, { jobName: "indexnow" })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
