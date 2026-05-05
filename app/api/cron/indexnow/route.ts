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
import { collectIndexNowUrls, DEFAULT_INDEXNOW_KEY, submitIndexNowUrls } from "@/lib/seo/indexnow"

const logger = createLogger("cron-indexnow")

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  try {
    const { urls, sitemaps } = await collectIndexNowUrls()

    if (urls.length === 0) {
      logger.warn("No URLs found in sitemap - IndexNow cron skipped", {})
      return NextResponse.json({ success: false, reason: "No URLs in sitemap" })
    }

    const indexNowResponse = await submitIndexNowUrls({ key: INDEXNOW_KEY, urls })

    logger.info("IndexNow cron submission complete", {
      sitemapCount: sitemaps.length,
      urlCount: urls.length,
      status: indexNowResponse.status,
    })

    return NextResponse.json({
      success: indexNowResponse.ok,
      status: indexNowResponse.status,
      sitemapCount: sitemaps.length,
      urlCount: urls.length,
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
