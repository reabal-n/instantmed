import { NextRequest } from "next/server"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ReviewRequestEmail } from "@/lib/email/components/templates/review-request"

describe("review redirect tracking privacy", () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: true }))
  const originalPostHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

  beforeEach(() => {
    fetchMock.mockClear()
    vi.stubGlobal("fetch", fetchMock)
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "ph_test"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env.NEXT_PUBLIC_POSTHOG_KEY = originalPostHogKey
  })

  it("captures only aggregate campaign dimensions", async () => {
    const { GET } = await import("@/app/api/review-redirect/route")
    const response = await GET(new NextRequest(
      "https://instantmed.com.au/api/review-redirect?utm_source=email&utm_medium=review_request&utm_campaign=review&intake_id=intake-sensitive&user_id=user-sensitive&service=prescription",
    ))

    expect(response.status).toBe(302)
    expect(fetchMock).toHaveBeenCalledOnce()

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const payload = JSON.parse(String(init.body)) as {
      distinct_id: string
      properties: Record<string, unknown>
    }

    expect(payload.distinct_id).toBe("review_cta_aggregate")
    expect(payload.properties).toEqual({
      campaign: "review",
      medium: "review_request",
      source: "email",
    })
    expect(JSON.stringify(payload)).not.toContain("intake-sensitive")
    expect(JSON.stringify(payload)).not.toContain("user-sensitive")
    expect(JSON.stringify(payload)).not.toContain("prescription")
  })

  it("normalizes unknown tracking dimensions to the aggregate defaults", async () => {
    const { GET } = await import("@/app/api/review-redirect/route")
    await GET(new NextRequest(
      "https://instantmed.com.au/api/review-redirect?utm_source=patient@example.com&utm_medium=intake-sensitive&utm_campaign=user-sensitive",
    ))

    const init = fetchMock.mock.calls[0]?.[1]
    const payload = JSON.parse(String(init?.body)) as {
      properties: Record<string, unknown>
    }

    expect(payload.properties).toEqual({
      campaign: "review",
      medium: "review_cta",
      source: "email",
    })
    expect(JSON.stringify(payload)).not.toContain("patient@example.com")
    expect(JSON.stringify(payload)).not.toContain("intake-sensitive")
    expect(JSON.stringify(payload)).not.toContain("user-sensitive")
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
})
