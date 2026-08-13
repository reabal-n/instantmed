/**
 * Review-CTA destination contract.
 *
 * The dedicated review email redirects through /api/review-redirect to the
 * OFF-SITE ProductReview.com.au destination, never directly to a named
 * platform from the template.
 *
 * Regression guard (2026-06-23): `PRODUCTREVIEW_REVIEW_URL` was an unset env
 * with a `|| ""` fallback, so getRotatingReviewUrl silently resolved to Google
 * for ~97 day-2 sends while the copy still said "Leave a Google review" — and
 * the AU answer-engine-cited ProductReview listing (already entity-linked from
 * our `sameAs`) sat at 0 reviews. This pins the fix both directions: the copy
 * must not name a platform, and the default destination must be ProductReview.
 *
 * Compliance note: asking for off-site reviews is permitted; displaying,
 * counting, rating, quoting, or schema-marking any review on our own surfaces
 * is the s133 line (ADVERTISING_COMPLIANCE.md §6) — out of scope for this file.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  DEFAULT_REVIEW_DESTINATION,
  GOOGLE_REVIEW_URL,
  PRODUCTREVIEW_REVIEW_URL,
  REVIEW_DESTINATION_URLS,
} from "@/lib/constants"

const reviewRequestTemplateSource = readFileSync(
  join(process.cwd(), "lib/email/components/templates/review-request.tsx"),
  "utf8",
)
const reviewRedirectSource = readFileSync(
  join(process.cwd(), "app/api/review-redirect/route.ts"),
  "utf8",
)
const reviewAskCardSource = readFileSync(
  join(process.cwd(), "components/patient/review-ask-card.tsx"),
  "utf8",
)
const reviewNudgeCardSource = readFileSync(
  join(process.cwd(), "components/patient/review-nudge-card.tsx"),
  "utf8",
)
const patientIntakeSource = readFileSync(
  join(process.cwd(), "app/patient/intakes/[id]/client.tsx"),
  "utf8",
)
const patientDocumentsSource = readFileSync(
  join(process.cwd(), "app/patient/documents/documents-client.tsx"),
  "utf8",
)

describe("review CTA destination contract", () => {
  it("keeps the EMAIL destination-neutral: its copy prepares for ProductReview only", () => {
    // The email is pinned to ProductReview, so naming Google there would be
    // misleading. The post-delivery CARD is different since 2026-08-07: it
    // offers an explicit two-platform choice, so platform names appear there
    // as choice labels — that is the point, not a violation.
    expect(reviewRequestTemplateSource).not.toMatch(/Google review/i)
    expect(reviewRequestTemplateSource).not.toMatch(/Review on Google/i)
  })

  it("offers both destinations on the post-delivery card, ProductReview first", () => {
    const productReviewIndex = reviewAskCardSource.indexOf('token: "productreview"')
    const googleIndex = reviewAskCardSource.indexOf('token: "google"')
    expect(productReviewIndex).toBeGreaterThan(-1)
    expect(googleIndex).toBeGreaterThan(-1)
    // Keystone platform leads; Google is the secondary choice.
    expect(productReviewIndex).toBeLessThan(googleIndex)
    // Labelled actions, not icon-only controls.
    expect(reviewAskCardSource).toContain("Review on ProductReview")
    expect(reviewAskCardSource).toContain("Review on Google")
    // The honest-ask guardrails stay: no coaching, and the full public-details warning.
    expect(reviewAskCardSource).toMatch(/good or bad/i)
    expect(reviewAskCardSource).toContain("Please leave out personal or medical details:")
    expect(reviewAskCardSource).not.toContain("—")
  })

  it("offers both destinations on the dashboard nudge, ProductReview first", () => {
    const productReviewIndex = reviewNudgeCardSource.indexOf('token: "productreview"')
    const googleIndex = reviewNudgeCardSource.indexOf('token: "google"')
    expect(productReviewIndex).toBeGreaterThan(-1)
    expect(googleIndex).toBeGreaterThan(-1)
    expect(productReviewIndex).toBeLessThan(googleIndex)
    expect(reviewNudgeCardSource).toContain("Review on ProductReview")
    expect(reviewNudgeCardSource).toContain("Review on Google")
    expect(reviewNudgeCardSource).toContain('utm_source: "patient_dashboard"')
    expect(reviewNudgeCardSource).toContain('utm_medium: "review_card"')
    expect(reviewNudgeCardSource).toContain('utm_campaign: "review"')
    expect(reviewNudgeCardSource).toContain('className="min-h-11')
    expect(reviewNudgeCardSource.replace(/\s+/g, " ")).toContain(
      "Please leave out personal or medical details: reviews are public.",
    )
  })

  it("keeps the reusable email review/referral block deleted", () => {
    expect(
      existsSync(join(process.cwd(), "lib/email/components/review-cta.tsx")),
    ).toBe(false)
  })

  it("pins the dedicated review email medium to ProductReview", () => {
    expect(reviewRequestTemplateSource).toContain('utm_medium: "review_request"')
    expect(reviewRedirectSource).toContain('medium === "review_request"')
    expect(reviewRedirectSource).toContain("PRODUCTREVIEW_REVIEW_URL")
  })

  it("routes the on-site review ask through the rotating redirect, never a hardcoded platform", () => {
    // The web ask card must use /api/review-redirect (tracked + rotating
    // destination) rather than linking a review platform directly, and must
    // not render star glyphs — rating imagery on our own surface is the
    // s133 line the email decorations deliberately stay off the web for.
    expect(reviewAskCardSource).toContain("/api/review-redirect")
    expect(reviewNudgeCardSource).toContain("/api/review-redirect")
    expect(reviewAskCardSource).not.toMatch(/productreview\.com\.au|g\.page|trustpilot/i)
    expect(reviewNudgeCardSource).not.toMatch(/productreview\.com\.au|g\.page|trustpilot/i)
    expect(reviewAskCardSource).not.toContain("★")
    expect(reviewAskCardSource).not.toContain("⭐")
    expect(reviewNudgeCardSource).not.toContain("★")
    expect(reviewNudgeCardSource).not.toContain("⭐")
  })

  it("never threads an intake identifier into an off-site review redirect", () => {
    expect(reviewAskCardSource).not.toContain("intakeId")
    expect(reviewAskCardSource).not.toContain("intake_id")
    expect(patientIntakeSource).not.toMatch(/<ReviewAskCard[^>]*intakeId=/)
    expect(patientDocumentsSource).not.toMatch(/<ReviewAskCard[^>]*intakeId=/)
  })

  it("defaults the off-site review destination to ProductReview, not Google", () => {
    // The silent month-rotation helper is gone (patient choice supersedes it);
    // the default token and unknown-token fallback are the keystone platform.
    expect(DEFAULT_REVIEW_DESTINATION).toBe("productreview")
    expect(REVIEW_DESTINATION_URLS[DEFAULT_REVIEW_DESTINATION]).toBe(PRODUCTREVIEW_REVIEW_URL)
    expect(REVIEW_DESTINATION_URLS["google"]).toBe(GOOGLE_REVIEW_URL)
    expect(Object.keys(REVIEW_DESTINATION_URLS).sort()).toEqual(["google", "productreview"])
    expect(reviewRedirectSource).toContain("DEFAULT_REVIEW_DESTINATION")
    expect(reviewRedirectSource).not.toContain("getRotatingReviewUrl")
  })
})
