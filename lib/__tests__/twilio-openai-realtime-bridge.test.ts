import { EventEmitter } from "node:events"

import { describe, expect, it, vi } from "vitest"

import {
  LENA_EMERGENCY_DIRECTION,
  LENA_GREETING,
  LENA_SAVE_FAILURE,
  LENA_SAVE_SUCCESS,
} from "@/lib/twilio/openai-realtime"
import { attachTwilioOpenAIRealtimeBridge } from "@/lib/twilio/openai-realtime-bridge"

class FakeSocket extends EventEmitter {
  readyState = 1
  sent: string[] = []

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    if (this.readyState === 3) return
    this.readyState = 3
    this.emit("close")
  }
}

const parsedSession = {
  callSid: "CA00000000000000000000000000000000",
  startedAt: "2026-08-27T10:00:00.000Z",
  expiresAt: "2026-08-27T10:05:00.000Z",
}

function startEvent(sessionToken = "valid-session-token") {
  return {
    event: "start",
    sequenceNumber: "1",
    streamSid: "MZ00000000000000000000000000000000",
    start: {
      accountSid: "AC00000000000000000000000000000000",
      callSid: parsedSession.callSid,
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

function functionCall(name: string, argumentsValue = "{}") {
  return Buffer.from(JSON.stringify({
    type: "response.done",
    response: {
      output: [{
        type: "function_call",
        name,
        call_id: "call_123",
        arguments: argumentsValue,
      }],
    },
  }))
}

function dependencies(openai: FakeSocket, executeVoiceMessageTool = vi.fn()) {
  return {
    clearCallTimeout: vi.fn(),
    createOpenAISocket: vi.fn(() => openai),
    executeVoiceMessageTool,
    parseSessionToken: vi.fn(() => parsedSession),
    setCallTimeout: vi.fn((
      _callback: () => void,
      _milliseconds: number,
    ) => ({}) as ReturnType<typeof setTimeout>),
  }
}

describe("Twilio to OpenAI Realtime bridge", () => {
  it("opens after a valid session, delivers the exact greeting, and relays native PCMU audio", () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const deps = dependencies(openai)

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    expect(deps.createOpenAISocket).toHaveBeenCalledOnce()

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
      response: { instructions: `Say exactly: "${LENA_GREETING}"` },
    })

    twilio.emit("message", Buffer.from(JSON.stringify({
      event: "media",
      media: { payload: "dHdpbGlvLWF1ZGlv", timestamp: "1200" },
    })))
    expect(JSON.parse(openai.sent[2])).toEqual({
      type: "input_audio_buffer.append",
      audio: "dHdpbGlvLWF1ZGlv",
    })

    openai.emit("message", Buffer.from(JSON.stringify({
      type: "response.output_audio.delta",
      delta: "b3BlbmFpLWF1ZGlv",
      item_id: "assistant_item_1",
    })))
    expect(JSON.parse(twilio.sent[0])).toEqual({
      event: "media",
      streamSid: "MZ00000000000000000000000000000000",
      media: { payload: "b3BlbmFpLWF1ZGlv" },
    })
    expect(JSON.parse(twilio.sent[1])).toMatchObject({
      event: "mark",
      streamSid: "MZ00000000000000000000000000000000",
    })
  })

  it("clears queued audio and truncates unheard model context when the caller interrupts", () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const deps = dependencies(openai)
    const assistantAudio = Buffer.alloc(800).toString("base64")

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    openai.emit("open")
    twilio.emit("message", Buffer.from(JSON.stringify({
      event: "media",
      media: { payload: "dHdpbGlvLWF1ZGlv", timestamp: "1200" },
    })))
    openai.emit("message", Buffer.from(JSON.stringify({
      type: "response.output_audio.delta",
      delta: assistantAudio,
      item_id: "assistant_item_1",
    })))
    twilio.emit("message", Buffer.from(JSON.stringify({
      event: "media",
      media: { payload: "bW9yZS10d2lsaW8tYXVkaW8=", timestamp: "1650" },
    })))

    openai.emit("message", Buffer.from(JSON.stringify({
      type: "input_audio_buffer.speech_started",
    })))

    expect(JSON.parse(twilio.sent.at(-1)!)).toEqual({
      event: "clear",
      streamSid: "MZ00000000000000000000000000000000",
    })
    expect(JSON.parse(openai.sent.at(-1)!)).toEqual({
      type: "conversation.item.truncate",
      item_id: "assistant_item_1",
      content_index: 0,
      audio_end_ms: 100,
    })
  })

  it("does not truncate a completed assistant turn when the caller speaks next", () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const deps = dependencies(openai)

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    openai.emit("open")
    twilio.emit("message", Buffer.from(JSON.stringify({
      event: "media",
      media: { payload: "dHdpbGlvLWF1ZGlv", timestamp: "1200" },
    })))
    openai.emit("message", Buffer.from(JSON.stringify({
      type: "response.output_audio.delta",
      delta: Buffer.alloc(800).toString("base64"),
      item_id: "assistant_item_1",
    })))
    const markName = JSON.parse(twilio.sent.at(-1)!).mark.name as string
    openai.emit("message", Buffer.from(JSON.stringify({
      type: "response.done",
      response: { output: [] },
    })))
    twilio.emit("message", Buffer.from(JSON.stringify({
      event: "mark",
      mark: { name: markName },
    })))
    twilio.emit("message", Buffer.from(JSON.stringify({
      event: "media",
      media: { payload: "bmV4dC11c2VyLXR1cm4=", timestamp: "2500" },
    })))

    openai.emit("message", Buffer.from(JSON.stringify({
      type: "input_audio_buffer.speech_started",
    })))

    expect(openai.sent.map((event) => JSON.parse(event))).not.toContainEqual(
      expect.objectContaining({ type: "conversation.item.truncate" }),
    )
    expect(JSON.parse(twilio.sent.at(-1)!)).toEqual({
      event: "clear",
      streamSid: "MZ00000000000000000000000000000000",
    })
  })

  it("closes both sockets when OpenAI reports a server error", () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const deps = dependencies(openai)

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    openai.emit("open")
    openai.emit("message", Buffer.from(JSON.stringify({
      type: "error",
      error: { message: "provider detail must not be logged" },
    })))

    expect(twilio.readyState).toBe(3)
    expect(openai.readyState).toBe(3)
  })

  it.each([
    [true, LENA_SAVE_SUCCESS],
    [false, LENA_SAVE_FAILURE],
  ])("speaks the code-gated final line after save recorded=%s", async (recorded, finalLine) => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const executeVoiceMessageTool = vi.fn(async () => JSON.stringify({ recorded }))
    const deps = dependencies(openai, executeVoiceMessageTool)

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    openai.emit("open")
    openai.emit("message", functionCall(
      "create_medical_director_message",
      JSON.stringify({ callback_requested: false }),
    ))

    await vi.waitFor(() => expect(executeVoiceMessageTool).toHaveBeenCalledOnce())
    expect(JSON.parse(openai.sent.at(-2)!)).toEqual({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: "call_123",
        output: JSON.stringify({ recorded }),
      },
    })
    expect(JSON.parse(openai.sent.at(-1)!)).toEqual({
      type: "response.create",
      response: { instructions: `Say exactly: "${finalLine}"` },
    })
  })

  it("uses the fixed triple-zero direction without assessing the caller", async () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const deps = dependencies(openai)

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    openai.emit("open")
    openai.emit("message", functionCall("deliver_emergency_direction"))

    await vi.waitFor(() => expect(openai.sent.at(-1)).toBeTruthy())
    expect(JSON.parse(openai.sent.at(-1)!)).toEqual({
      type: "response.create",
      response: {
        instructions: `Say exactly: "${LENA_EMERGENCY_DIRECTION}" Then stop and wait.`,
      },
    })
    expect(deps.executeVoiceMessageTool).not.toHaveBeenCalled()
  })

  it("prioritizes the emergency direction if a response contains another tool call", async () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const deps = dependencies(openai)

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    openai.emit("open")
    openai.emit("message", Buffer.from(JSON.stringify({
      type: "response.done",
      response: {
        output: [
          {
            type: "function_call",
            name: "create_medical_director_message",
            call_id: "call_save",
            arguments: JSON.stringify({ caller_confirmed: true }),
          },
          {
            type: "function_call",
            name: "deliver_emergency_direction",
            call_id: "call_emergency",
            arguments: "{}",
          },
        ],
      },
    })))

    await vi.waitFor(() => expect(openai.sent.at(-1)).toBeTruthy())
    expect(JSON.parse(openai.sent.at(-1)!)).toEqual({
      type: "response.create",
      response: {
        instructions: `Say exactly: "${LENA_EMERGENCY_DIRECTION}" Then stop and wait.`,
      },
    })
    expect(deps.executeVoiceMessageTool).not.toHaveBeenCalled()
  })

  it("lets a confirmed durable save finish if the caller disconnects", async () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    let resolveSave: ((value: string) => void) | undefined
    const save = new Promise<string>((resolve) => {
      resolveSave = resolve
    })
    const executeVoiceMessageTool = vi.fn(() => save)
    const deps = dependencies(openai, executeVoiceMessageTool)

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))
    openai.emit("open")
    openai.emit("message", functionCall("create_medical_director_message"))

    await vi.waitFor(() => expect(executeVoiceMessageTool).toHaveBeenCalledOnce())
    twilio.close()
    resolveSave?.(JSON.stringify({ recorded: true }))

    await expect(save).resolves.toBe(JSON.stringify({ recorded: true }))
    expect(executeVoiceMessageTool).toHaveBeenCalledOnce()
  })

  it("rejects a stream whose call SID does not match its session token", () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const deps = dependencies(openai)
    deps.parseSessionToken.mockReturnValue({
      ...parsedSession,
      callSid: "CA11111111111111111111111111111111",
    })

    attachTwilioOpenAIRealtimeBridge(twilio, deps)
    twilio.emit("message", Buffer.from(JSON.stringify(startEvent())))

    expect(deps.createOpenAISocket).not.toHaveBeenCalled()
    expect(twilio.readyState).toBe(3)
  })

  it("installs the one-minute warning and hard call limit", () => {
    const twilio = new FakeSocket()
    const openai = new FakeSocket()
    const deps = dependencies(openai)

    attachTwilioOpenAIRealtimeBridge(twilio, deps)

    expect(deps.setCallTimeout.mock.calls.map((call) => call[1])).toEqual([
      12 * 60 * 1_000,
      11 * 60 * 1_000,
    ])
  })
})
