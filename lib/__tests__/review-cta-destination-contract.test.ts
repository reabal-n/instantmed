/**
 * Review-CTA destination contract.
 *
 * The review CTAs in our emails redirect through /api/review-redirect to a
 * rotating OFF-SITE destination — ProductReview.com.au by default — never
 * directly to a single named platform.
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
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { getRotatingReviewUrl } from "@/lib/constants"

const reviewCtaSource = readFileSync(
  join(process.cwd(), "lib/email/components/review-cta.tsx"),
  "utf8",
)
const reviewRequestTemplateSource = readFileSync(
  join(process.cwd(), "lib/email/components/templates/review-request.tsx"),
  "utf8",
)
const reviewAskCardSource = readFileSync(
  join(process.cwd(), "components/patient/review-ask-card.tsx"),
  "utf8",
)

describe("review CTA destination contract", () => {
  it("does not hardcode platform-specific 'Google review' copy in review email surfaces", () => {
    // The destination is the rotating redirect (ProductReview by default), so
    // naming Google in the button/body is misleading + reads as single-platform
    // solicitation. Keep the copy destination-neutral ("Leave a review").
    for (const [label, source] of [
      ["review CTA", reviewCtaSource],
      ["review request template", reviewRequestTemplateSource],
      ["review ask card", reviewAskCardSource],
    ] as const) {
      expect(source, label).not.toMatch(/Google review/i)
    }
  })

  it("routes the on-site review ask through the rotating redirect, never a hardcoded platform", () => {
    // The web ask card must use /api/review-redirect (tracked + rotating
    // destination) rather than linking a review platform directly, and must
    // not render star glyphs — rating imagery on our own surface is the
    // s133 line the email decorations deliberately stay off the web for.
    expect(reviewAskCardSource).toContain("/api/review-redirect")
    expect(reviewAskCardSource).not.toMatch(/productreview\.com\.au|g\.page|trustpilot/i)
    expect(reviewAskCardSource).not.toContain("★")
    expect(reviewAskCardSource).not.toContain("⭐")
  })

  it("defaults the off-site review destination to ProductReview, not Google", () => {
    // Must hold for every month — ProductReview is the baked default so prod
    // never falls back to Google when the optional env override is unset.
    for (const month of [0, 1, 5, 6, 11]) {
      const url = getRotatingReviewUrl(month)
      expect(url, `month ${month}`).toContain("productreview.com.au")
      expect(url, `month ${month}`).not.toContain("g.page")
    }
  })
})
