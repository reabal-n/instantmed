/**
 * Review CTA Redirect
 *
 * Tracks review link clicks via PostHog, then redirects to the off-site review
 * destination the patient chose (allowlisted token -> fixed URL; ProductReview
 * for unknown tokens and for the email path). Used by the dedicated review
 * email and the patient post-delivery/dashboard review cards.
 */

import { NextRequest, NextResponse } from "next/server"

import { capturePersonlessPostHogEvent } from "@/lib/analytics/posthog-server"
import {
  DEFAULT_REVIEW_DESTINATION,
  PRODUCTREVIEW_REVIEW_URL,
  REVIEW_DESTINATION_URLS,
} from "@/lib/constants"
import { consumeReviewClickKey } from "@/lib/email/review-click-consumption"
import { hashReviewClickKey } from "@/lib/email/review-click-key"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("review-redirect")

// Every dimension an emitter sends MUST be listed here, or `allowedDimension`
// silently rewrites it to the fallback and the analytics lie about the
// traversal's origin. `ReviewAskCard` sent `utm_medium=post_delivery` from
// 2026-07-04 while this set lacked it, so every delivery-surface click was
// recorded as `review_cta` — the exact instrument the mid-August review
// checkpoint reads. `review-redirect-dimensions-contract.test.ts` now pins
// every live emitter literal to these sets; add the token HERE in the same
// commit as any new emitter.
const REVIEW_SOURCES = new Set([
  "email",
  "patient_dashboard",
  "patient_documents",
  "patient_intake_detail",
])
const REVIEW_MEDIA = new Set(["review_request", "review_card", "review_cta", "post_delivery"])
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
        // Allowlisted token, never a URL. Selection shares — the only claim
        // this instrument supports — are counts of this property.
        destination: allowedDimension(
          req.nextUrl.searchParams.get("destination"),
          new Set(Object.keys(REVIEW_DESTINATION_URLS)),
          DEFAULT_REVIEW_DESTINATION,
        ),
      },
    })
  }

  // Destination is a TOKEN resolved server-side against a fixed map — a
  // crafted link can only ever reach one of the two known platforms, and the
  // token (not a URL) is what enters analytics. The email/keyed path stays
  // pinned to ProductReview: its copy prepares the patient for that flow, and
  // the deliberately tiny email volume adds nothing to the selection data.
  const destinationToken = isKeyedReviewRequest || medium === "review_request"
    ? DEFAULT_REVIEW_DESTINATION
    : allowedDimension(
        req.nextUrl.searchParams.get("destination"),
        new Set(Object.keys(REVIEW_DESTINATION_URLS)),
        DEFAULT_REVIEW_DESTINATION,
      )
  const destinationUrl =
    REVIEW_DESTINATION_URLS[destinationToken] ?? PRODUCTREVIEW_REVIEW_URL

  const response = NextResponse.redirect(destinationUrl, { status: 302 })
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}
