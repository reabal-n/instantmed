import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/internal/integration-readiness/route"

const originalEnv = { ...process.env }
afterEach(() => { process.env = { ...originalEnv }; vi.unstubAllGlobals() })

describe("runtime credential probe", () => {
  it("rejects unauthenticated requests before contacting a provider", async () => {
    process.env.CRON_SECRET = "private-cron-secret"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const response = await GET(new NextRequest("https://instantmed.com.au/api/internal/integration-readiness"))
    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns only bounded readiness results and prevents caching", async () => {
    process.env.CRON_SECRET = "private-cron-secret"
    process.env.OPENAI_API_KEY = "private-openai-key"
    process.env.TWILIO_AI_VOICE_ENABLED = "true"
    delete process.env.GOOGLE_ADS_API_VERSION
    delete process.env.TWILIO_VOICE_SESSION_SECRET
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-provider-body", { status: 403 })))
    const response = await GET(new NextRequest("https://instantmed.com.au/api/internal/integration-readiness", {
      headers: { Authorization: "Bearer private-cron-secret" },
    }))
    expect(response.headers.get("cache-control")).toBe("no-store")
    const payload = await response.json()
    expect(payload).toMatchObject({ success: false, source: "deployed-runtime", checks: [
      { name: "OpenAI review model", status: "fail" },
      { name: "Twilio AI voice", status: "fail" },
      { name: "Google Ads API version", status: "pass" },
    ] })
    expect(JSON.stringify(payload)).not.toMatch(/private-cron-secret|private-openai-key|private-provider-body/)
  })
})
