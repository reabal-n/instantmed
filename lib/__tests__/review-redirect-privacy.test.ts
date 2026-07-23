import { NextRequest } from "next/server"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ReviewRequestEmail } from "@/lib/email/components/templates/review-request"

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  consume: vi.fn(),
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  capturePersonlessPostHogEvent: mocks.capture,
}))

vi.mock("@/lib/email/review-click-consumption", () => ({
  consumeReviewClickKey: mocks.consume,
}))

describe("review redirect tracking privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consume.mockResolvedValue(true)
  })

  it("counts one keyed email traversal without exporting the key or identifiers", async () => {
    const clickKey = "A".repeat(43)
    const { GET } = await import("@/app/api/review-redirect/route")
    const response = await GET(new NextRequest(
      `https://instantmed.com.au/api/review-redirect?utm_source=email&utm_medium=review_request&utm_campaign=review&review_click_key=${clickKey}&intake_id=intake-sensitive&user_id=user-sensitive&service=prescription`,
    ))

    expect(response.status).toBe(302)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(response.headers.get("location")).not.toContain(clickKey)
    expect(mocks.consume).toHaveBeenCalledWith(clickKey)
    expect(mocks.capture).toHaveBeenCalledOnce()

    const capture = mocks.capture.mock.calls[0]?.[0] as Record<string, unknown>
    expect(capture).toEqual({
      event: "review_request_unique_traversal",
      properties: {
        campaign: "review",
        measurement: "unique_redirect_traversal",
        medium: "review_request",
        source: "email",
      },
    })
    expect(JSON.stringify(capture)).not.toContain(clickKey)
    expect(JSON.stringify(capture)).not.toContain("intake-sensitive")
    expect(JSON.stringify(capture)).not.toContain("user-sensitive")
    expect(JSON.stringify(capture)).not.toContain("prescription")
  })

  it("uses the opaque key as the email classifier when UTM dimensions are stripped or mutated", async () => {
    const clickKey = "E".repeat(43)
    const { GET } = await import("@/app/api/review-redirect/route")
    const response = await GET(new NextRequest(
      `https://instantmed.com.au/api/review-redirect?review_click_key=${clickKey}&utm_source=patient_dashboard&utm_medium=review_card&utm_campaign=unexpected`,
    ))

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toContain("productreview.com.au")
    expect(mocks.consume).toHaveBeenCalledWith(clickKey)
    expect(mocks.capture).toHaveBeenCalledWith({
      event: "review_request_unique_traversal",
      properties: {
        campaign: "review",
        measurement: "unique_redirect_traversal",
        medium: "review_request",
        source: "email",
      },
    })
  })

  it("redirects missing, invalid, and already-consumed email keys without counting", async () => {
    const { GET } = await import("@/app/api/review-redirect/route")

    const missing = await GET(new NextRequest(
      "https://instantmed.com.au/api/review-redirect?utm_source=email&utm_medium=review_request&utm_campaign=review",
    ))
    expect(missing.status).toBe(302)
    expect(mocks.consume).not.toHaveBeenCalled()
    expect(mocks.capture).not.toHaveBeenCalled()

    mocks.consume.mockResolvedValueOnce(false)
    const rejected = await GET(new NextRequest(
      "https://instantmed.com.au/api/review-redirect?utm_source=patient@example.com&utm_medium=review_request&utm_campaign=user-sensitive&review_click_key=invalid",
    ))
    expect(rejected.status).toBe(302)
    expect(mocks.capture).not.toHaveBeenCalled()
  })

  it("keeps the redirect available when durable measurement fails", async () => {
    mocks.consume.mockRejectedValueOnce(new Error("database unavailable"))
    const { GET } = await import("@/app/api/review-redirect/route")

    const response = await GET(new NextRequest(
      `https://instantmed.com.au/api/review-redirect?utm_source=email&utm_medium=review_request&utm_campaign=review&review_click_key=${"A".repeat(43)}`,
    ))

    expect(response.status).toBe(302)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(mocks.capture).not.toHaveBeenCalled()
  })

  it("preserves aggregate patient-dashboard CTA tracking without a capability key", async () => {
    const { GET } = await import("@/app/api/review-redirect/route")
    await GET(new NextRequest(
      "https://instantmed.com.au/api/review-redirect?utm_source=patient_dashboard&utm_medium=review_card&utm_campaign=review",
    ))

    expect(mocks.consume).not.toHaveBeenCalled()
    expect(mocks.capture).toHaveBeenCalledWith({
      event: "review_cta_clicked",
      properties: {
        campaign: "review",
        medium: "review_card",
        source: "patient_dashboard",
      },
    })
  })

  it("never places patient or intake identifiers in review CTA URLs", () => {
    const html = renderToStaticMarkup(React.createElement(ReviewRequestEmail, {
      appUrl: "https://instantmed.com.au",
      patientName: "Sarah",
    }))

    expect(html).toContain("utm_source=email")
    expect(html).toContain("utm_medium=review_request")
    expect(html).not.toContain("intake-sensitive")
    expect(html).not.toContain("user-sensitive")
    expect(html).not.toContain("intake_id=")
    expect(html).not.toContain("user_id=")
  })

  it("places only the opaque click key in a keyed review email URL", () => {
    const clickKey = "A".repeat(43)
    const html = renderToStaticMarkup(React.createElement(ReviewRequestEmail, {
      appUrl: "https://instantmed.com.au",
      patientName: "Sarah",
      reviewClickKey: clickKey,
    }))

    expect(html).toContain(`review_click_key=${clickKey}`)
    expect(html.match(/(?:\?|&amp;)review_click_key=/g)).toHaveLength(1)
    expect(html).not.toContain("intake_id=")
    expect(html).not.toContain("patient_id=")
    expect(html).not.toContain("user_id=")
  })
})
