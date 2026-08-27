import { describe, expect, it, vi } from "vitest"

import {
  buildOpenAIRealtimeSessionUpdate,
  executeVoiceCallbackTool,
} from "@/lib/twilio/openai-realtime"

describe("Twilio OpenAI Realtime voice agent", () => {
  it("uses native phone audio and exposes only the durable callback tool", () => {
    const event = buildOpenAIRealtimeSessionUpdate()

    expect(event.session.audio.input.format).toEqual({ type: "audio/pcmu" })
    expect(event.session.audio.output.format).toEqual({ type: "audio/pcmu" })
    expect(event.session.output_modalities).toEqual(["audio"])
    expect(event.session.tools).toHaveLength(1)
    expect(event.session.tools[0].name).toBe("create_callback_request")
    expect(event.session.tools[0].parameters.required).toContain("caller_confirmed")
    expect(event.session.instructions).toContain("Never diagnose")
    expect(event.session.instructions).toContain("Never promise that anything will be fixed")
    expect(event.session.instructions.toLowerCase()).toContain("only after the tool returns recorded=true")
    expect(event.session.instructions).toContain("call triple zero")
  })

  it("returns a success receipt only after the encrypted callback record exists", async () => {
    const createRequest = vi.fn(async () => ({
      alertDelivered: true,
      created: true,
      id: "6d97ddf8-8d90-4c68-b951-9868d8ff129a",
    }))

    const output = await executeVoiceCallbackTool(
      JSON.stringify({
        caller_confirmed: true,
        caller_name: "Alex",
        category: "document_adjustment",
        summary: "Caller requests a correction to a document date.",
      }),
      {
        callSid: "CA00000000000000000000000000000000",
        caller: "+61412345678",
        consentedAt: "2026-08-27T10:00:00.000Z",
        expiresAt: "2026-08-27T10:05:00.000Z",
      },
      createRequest,
    )

    expect(createRequest).toHaveBeenCalledWith({
      callbackNumber: "+61412345678",
      callerName: "Alex",
      callSid: "CA00000000000000000000000000000000",
      category: "document_adjustment",
      consentedAt: "2026-08-27T10:00:00.000Z",
      summary: "Caller requests a correction to a document date.",
    })
    expect(JSON.parse(output)).toEqual({ recorded: true })
    expect(output).not.toContain("6d97ddf8-8d90-4c68-b951-9868d8ff129a")
  })

  it("refuses to record a callback without explicit summary confirmation", async () => {
    const createRequest = vi.fn()

    const output = await executeVoiceCallbackTool(
      JSON.stringify({
        caller_confirmed: false,
        category: "other",
        summary: "Please call me back.",
      }),
      {
        callSid: "CA00000000000000000000000000000000",
        caller: "+61412345678",
        consentedAt: "2026-08-27T10:00:00.000Z",
        expiresAt: "2026-08-27T10:05:00.000Z",
      },
      createRequest,
    )

    expect(createRequest).not.toHaveBeenCalled()
    expect(JSON.parse(output)).toEqual({
      recorded: false,
      reason: "request_not_confirmed",
    })
  })
})
