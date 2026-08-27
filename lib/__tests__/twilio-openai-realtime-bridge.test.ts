import { EventEmitter } from "node:events"

import { describe, expect, it, vi } from "vitest"

import { attachTwilioOpenAIRealtimeBridge } from "@/lib/twilio/openai-realtime-bridge"

class FakeSocket extends EventEmitter {
  readyState = 1
  sent: string[] = []

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.emit("close")
  }
}

function startEvent(sessionToken = "valid-session-token") {
  return {
    event: "start",
    sequenceNumber: "1",
    streamSid: "MZ00000000000000000000000000000000",
    start: {
      accountSid: "AC00000000000000000000000000000000",
      callSid: "CA00000000000000000000000000000000",
      customParameters: { sessionToken },
      mediaFormat: {
        channels: 1,
        encoding: "audio/x-mulaw",
        sampleRate: 8_000,
      },
      streamSid: "MZ00000000000000000000000000000000",
      tracks: ["inbound"],
    },
  }
}

describe("Twilio to OpenAI Realtime bridge", () => {
  it("opens OpenAI only after a valid consent token and relays native PCMU audio both ways", () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const createOpenAISocket = vi.fn(() => openai)

    attachTwilioOpenAIRealtimeBridge(twilio, {
      createOpenAISocket,
      executeCallbackTool: vi.fn(),
      parseSessionToken: () => ({
        callSid: "CA00000000000000000000000000000000",
        caller: "+61412345678",
        consentedAt: "2026-08-27T10:00:00.000Z",
        expiresAt: "2026-08-27T10:05:00.000Z",
      }),
      setCallTimeout: () => ({}) as ReturnType<typeof setTimeout>,
      clearCallTimeout: vi.fn(),
    })

    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    expect(createOpenAISocket).toHaveBeenCalledOnce()

    openai.emit("open")
    expect(JSON.parse(openai.sent[0])).toMatchObject({
      type: "session.update",
      session: {
        audio: {
          input: { format: { type: "audio/pcmu" } },
          output: { format: { type: "audio/pcmu" } },
        },
      },
    })
    expect(JSON.parse(openai.sent[1])).toEqual({
      type: "response.create",
      response: {
        instructions: "Briefly thank the caller for consenting, identify yourself as InstantMed's automated support assistant, and ask what you can help with.",
      },
    })

    twilio.emit("message", Buffer.from(JSON.stringify({
      event: "media",
      streamSid: "MZ00000000000000000000000000000000",
      media: { payload: "dHdpbGlvLWF1ZGlv" },
    })))
    expect(JSON.parse(openai.sent[2])).toEqual({
      type: "input_audio_buffer.append",
      audio: "dHdpbGlvLWF1ZGlv",
    })

    openai.emit("message", Buffer.from(JSON.stringify({
      type: "response.output_audio.delta",
      delta: "b3BlbmFpLWF1ZGlv",
    })))
    expect(JSON.parse(twilio.sent[0])).toEqual({
      event: "media",
      streamSid: "MZ00000000000000000000000000000000",
      media: { payload: "b3BlbmFpLWF1ZGlv" },
    })

    openai.emit("message", Buffer.from(JSON.stringify({
      type: "input_audio_buffer.speech_started",
    })))
    expect(JSON.parse(twilio.sent[1])).toEqual({
      event: "clear",
      streamSid: "MZ00000000000000000000000000000000",
    })
  })

  it("returns the durable callback tool result to OpenAI before asking the model to continue", async () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const executeCallbackTool = vi.fn(async () => JSON.stringify({ recorded: true }))

    attachTwilioOpenAIRealtimeBridge(twilio, {
      createOpenAISocket: () => openai,
      executeCallbackTool,
      parseSessionToken: () => ({
        callSid: "CA00000000000000000000000000000000",
        caller: "+61412345678",
        consentedAt: "2026-08-27T10:00:00.000Z",
        expiresAt: "2026-08-27T10:05:00.000Z",
      }),
      setCallTimeout: () => ({}) as ReturnType<typeof setTimeout>,
      clearCallTimeout: vi.fn(),
    })

    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    openai.emit("open")
    openai.emit("message", Buffer.from(JSON.stringify({
      type: "response.done",
      response: {
        output: [{
          type: "function_call",
          name: "create_callback_request",
          call_id: "call_123",
          arguments: "{\"category\":\"other\",\"summary\":\"Please call me back.\"}",
        }],
      },
    })))

    await vi.waitFor(() => expect(executeCallbackTool).toHaveBeenCalledOnce())
    expect(JSON.parse(openai.sent.at(-2)!)).toEqual({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: "call_123",
        output: "{\"recorded\":true}",
      },
    })
    expect(JSON.parse(openai.sent.at(-1)!)).toEqual({ type: "response.create" })
  })

  it("rejects a stream when its call SID does not match the consent token", () => {
    const twilio = new FakeSocket()
    const createOpenAISocket = vi.fn(() => new FakeSocket())

    attachTwilioOpenAIRealtimeBridge(twilio, {
      createOpenAISocket,
      executeCallbackTool: vi.fn(),
      parseSessionToken: () => ({
        callSid: "CA11111111111111111111111111111111",
        caller: "+61412345678",
        consentedAt: "2026-08-27T10:00:00.000Z",
        expiresAt: "2026-08-27T10:05:00.000Z",
      }),
      setCallTimeout: () => ({}) as ReturnType<typeof setTimeout>,
      clearCallTimeout: vi.fn(),
    })

    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))

    expect(createOpenAISocket).not.toHaveBeenCalled()
    expect(twilio.readyState).toBe(3)
  })
})
