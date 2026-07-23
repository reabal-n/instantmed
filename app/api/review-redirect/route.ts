/**
 * Review CTA Redirect
 *
 * Tracks review link clicks via PostHog, then redirects to the off-site review
 * destination (ProductReview by default; Google is the ultimate fallback).
 * Used by the dedicated review email and patient-dashboard review cards.
 */

import { NextRequest, NextResponse } from "next/server"

import { capturePersonlessPostHogEvent } from "@/lib/analytics/posthog-server"
import {
  getRotatingReviewUrl,
  PRODUCTREVIEW_REVIEW_URL,
} from "@/lib/constants"
import { consumeReviewClickKey } from "@/lib/email/review-click-consumption"
import { hashReviewClickKey } from "@/lib/email/review-click-key"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("review-redirect")

const REVIEW_SOURCES = new Set([
  "email",
  "patient_dashboard",
  "patient_documents",
  "patient_intake_detail",
])
const REVIEW_MEDIA = new Set(["review_request", "review_card", "review_cta"])
const REVIEW_CAMPAIGNS = new Set(["review"])

function allowedDimension(value: string | null, allowed: Set<string>, fallback: string): string {
  return value && allowed.has(value) ? value : fallback
}

export async function GET(req: NextRequest) {
  const source = allowedDimension(req.nextUrl.searchParams.get("utm_source"), REVIEW_SOURCES, "email")
  const medium = allowedDimension(req.nextUrl.searchParams.get("utm_medium"), REVIEW_MEDIA, "review_cta")
  const campaign = allowedDimension(req.nextUrl.searchParams.get("utm_campaign"), REVIEW_CAMPAIGNS, "review")
  const clickKey = req.nextUrl.searchParams.get("review_click_key")
  const isKeyedReviewRequest = hashReviewClickKey(clickKey) !== null

  if (isKeyedReviewRequest && clickKey) {
    try {
      const consumed = await consumeReviewClickKey(clickKey)
      if (consumed) {
        capturePersonlessPostHogEvent({
          event: "review_request_unique_traversal",
          properties: {
            source: "email",
            medium: "review_request",
            campaign: "review",
            measurement: "unique_redirect_traversal",
          },
        })
      }
    } catch {
      // The redirect remains available even when measurement is degraded.
      logger.error("Review click measurement failed")
    }
  } else if (medium !== "review_request") {
    capturePersonlessPostHogEvent({
      event: "review_cta_clicked",
      properties: {
        source,
        medium,
        campaign,
      },
    })
  }

  const destination = isKeyedReviewRequest || medium === "review_request"
    ? PRODUCTREVIEW_REVIEW_URL
    : getRotatingReviewUrl(new Date().getUTCMonth())

  const response = NextResponse.redirect(destination, { status: 302 })
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}
