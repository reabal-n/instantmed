import { afterEach, describe, expect, it, vi } from "vitest"

import { checkOpenAIReviewModel, checkTwilioVoiceReadiness } from "@/lib/integrations/credential-readiness"

const originalEnv = { ...process.env }
afterEach(() => { process.env = { ...originalEnv }; vi.unstubAllGlobals() })

describe("credential readiness without exporting secrets", () => {
  it("verifies model access without returning the key or provider payload", async () => {
    process.env.OPENAI_API_KEY = "private-test-key"
    delete process.env.OPENAI_REVIEW_MODEL
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"private":"provider-data"}', { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const result = await checkOpenAIReviewModel()
    expect(result).toEqual([{ status: "pass", name: "OpenAI review model", detail: "gpt-5.5-pro is available." }])
    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/models/gpt-5.5-pro", expect.objectContaining({
      headers: { Authorization: "Bearer private-test-key" }, signal: expect.any(AbortSignal),
    }))
    expect(JSON.stringify(result)).not.toMatch(/private-test-key|provider-data/)
  })

  it("reports missing credentials and provider rejection as failures", async () => {
    delete process.env.OPENAI_API_KEY
    expect(await checkOpenAIReviewModel()).toMatchObject([{ status: "fail" }])
    process.env.OPENAI_API_KEY = "[REDACTED]"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    expect(await checkOpenAIReviewModel()).toMatchObject([{ status: "fail" }])
    expect(fetchMock).not.toHaveBeenCalled()
    process.env.OPENAI_API_KEY = "private-test-key"
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-provider-error", { status: 401 })))
    expect(await checkOpenAIReviewModel()).toEqual([{ status: "fail", name: "OpenAI review model", detail: "OpenAI model access returned HTTP 401." }])
  })

  it("contains timeouts and does not echo exceptions", async () => {
    process.env.OPENAI_API_KEY = "private-test-key"
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private-test-key")))
    expect(await checkOpenAIReviewModel()).toEqual([{ status: "fail", name: "OpenAI review model", detail: "OpenAI model access could not be reached." }])
  })

  it("does not call disabled voice ready and catches a missing session secret when enabled", () => {
    process.env.TWILIO_AI_VOICE_ENABLED = "false"
    expect(checkTwilioVoiceReadiness()).toEqual([{ status: "pass", name: "Twilio AI voice", detail: "Disabled by the runtime kill switch; active voice readiness was not checked." }])
    process.env.TWILIO_AI_VOICE_ENABLED = "true"
    delete process.env.TWILIO_VOICE_SESSION_SECRET
    expect(checkTwilioVoiceReadiness()).toMatchObject([{ status: "fail", detail: expect.stringContaining("TWILIO_VOICE_SESSION_SECRET") }])
  })
})
