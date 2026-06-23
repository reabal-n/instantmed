/**
 * Review CTA Redirect
 *
 * Tracks review link clicks via PostHog, then redirects to the off-site review
 * destination (ProductReview by default; Google is the ultimate fallback).
 * Used by both the day-2 review email and the inline approval-email CTA.
 */

import { NextRequest, NextResponse } from "next/server"

import { getRotatingReviewUrl } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("utm_source") || "email"
  const medium = req.nextUrl.searchParams.get("utm_medium") || "review_cta"
  const campaign = req.nextUrl.searchParams.get("utm_campaign") || "review"
  const intakeId = req.nextUrl.searchParams.get("intake_id")
  const userId = req.nextUrl.searchParams.get("user_id")

  // Fire PostHog event server-side if API key available
  const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

  if (phKey) {
    // Fire and forget - don't block the redirect
    fetch(`${phHost}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: phKey,
        event: "review_cta_clicked",
        properties: {
          $current_url: req.url,
          source,
          medium,
          campaign,
          intake_id: intakeId || undefined,
          service: req.nextUrl.searchParams.get("service") || undefined,
        },
        distinct_id: userId || (intakeId ? `intake_${intakeId}` : "anonymous_email_click"),
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {}) // Swallow errors - tracking should never block
  }

  return NextResponse.redirect(getRotatingReviewUrl(new Date().getUTCMonth()), { status: 302 })
}
