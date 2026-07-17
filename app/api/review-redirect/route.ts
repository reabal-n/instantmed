/**
 * Review CTA Redirect
 *
 * Tracks review link clicks via PostHog, then redirects to the off-site review
 * destination (ProductReview by default; Google is the ultimate fallback).
 * Used by the dedicated review email and patient-dashboard review cards.
 */

import { NextRequest, NextResponse } from "next/server"

import {
  getRotatingReviewUrl,
  PRODUCTREVIEW_REVIEW_URL,
} from "@/lib/constants"

const REVIEW_SOURCES = new Set(["email", "patient_dashboard"])
const REVIEW_MEDIA = new Set(["review_request", "review_card", "review_cta"])
const REVIEW_CAMPAIGNS = new Set(["review"])

function allowedDimension(value: string | null, allowed: Set<string>, fallback: string): string {
  return value && allowed.has(value) ? value : fallback
}

export async function GET(req: NextRequest) {
  const source = allowedDimension(req.nextUrl.searchParams.get("utm_source"), REVIEW_SOURCES, "email")
  const medium = allowedDimension(req.nextUrl.searchParams.get("utm_medium"), REVIEW_MEDIA, "review_cta")
  const campaign = allowedDimension(req.nextUrl.searchParams.get("utm_campaign"), REVIEW_CAMPAIGNS, "review")

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
          source,
          medium,
          campaign,
        },
        distinct_id: "review_cta_aggregate",
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {}) // Swallow errors - tracking should never block
  }

  const destination = medium === "review_request"
    ? PRODUCTREVIEW_REVIEW_URL
    : getRotatingReviewUrl(new Date().getUTCMonth())

  return NextResponse.redirect(destination, { status: 302 })
}
