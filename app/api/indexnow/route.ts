/**
 * IndexNow API Route
 *
 * Submits all sitemap URLs to IndexNow (Bing, Yandex, and participating engines)
 * for immediate indexing. Protected by INDEXNOW_SECRET to prevent abuse.
 *
 * Usage:
 *   POST /api/indexnow
 *   Body: { "secret": "<INDEXNOW_SECRET>" }
 */

import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { createLogger } from "@/lib/observability/logger"
import { collectIndexNowUrls, DEFAULT_INDEXNOW_KEY, submitIndexNowUrls } from "@/lib/seo/indexnow"

const logger = createLogger("indexnow")

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const { secret } = body

  const indexNowSecret = process.env.INDEXNOW_SECRET
  if (!indexNowSecret) {
    logger.error("INDEXNOW_SECRET not configured", {})
    return NextResponse.json({ error: "IndexNow not configured" }, { status: 500 })
  }

  if (secret !== indexNowSecret) {
    logger.warn("Unauthorized IndexNow submission attempt", {
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { urls, sitemaps } = await collectIndexNowUrls()

    if (urls.length === 0) {
      logger.warn("No URLs found in sitemap", {})
      return NextResponse.json({ error: "No URLs found in sitemap" }, { status: 400 })
    }

    const indexNowResponse = await submitIndexNowUrls({ key: INDEXNOW_KEY, urls })

    logger.info("IndexNow submission complete", {
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
      tags: { context: "indexnow_submission" },
    })
    logger.error("IndexNow submission failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
