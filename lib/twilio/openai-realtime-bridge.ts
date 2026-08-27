import "server-only"

import { createHmac } from "node:crypto"

import WebSocket from "ws"
import { z } from "zod"

import {
  buildOpenAIRealtimeSessionUpdate,
  executeMedicalDirectorVoiceMessageTool,
  LENA_EMERGENCY_DIRECTION,
  LENA_GREETING,
  LENA_SAVE_FAILURE,
  LENA_SAVE_SUCCESS,
  LENA_TIME_WARNING,
  OPENAI_REALTIME_MODEL,
} from "@/lib/twilio/openai-realtime"
import {
  parseTwilioVoiceSessionToken,
  type TwilioVoiceSession,
} from "@/lib/twilio/voice-session-token"

const OPEN_SOCKET = 1
const MAX_QUEUED_AUDIO_CHUNKS = 100
const MAX_AUDIO_CHUNK_LENGTH = 64 * 1024
const CALL_LIMIT_MS = 12 * 60 * 1000
const CALL_WARNING_MS = 11 * 60 * 1000
const OPENAI_REALTIME_URL = `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`

const startEventSchema = z.object({
  event: z.literal("start"),
  start: z.object({
    callSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
    customParameters: z.object({
      sessionToken: z.string().min(1).max(4_096),
    }),
    mediaFormat: z.object({
      channels: z.literal(1),
      encoding: z.literal("audio/x-mulaw"),
      sampleRate: z.literal(8_000),
    }),
    streamSid: z.string().regex(/^MZ[a-fA-F0-9]{32}$/),
  }),
})

const mediaEventSchema = z.object({
  event: z.literal("media"),
  media: z.object({
    payload: z.string().min(1).max(MAX_AUDIO_CHUNK_LENGTH),
  }),
})

const functionCallSchema = z.object({
  arguments: z.string().max(8_192),
  call_id: z.string().min(1).max(256),
  name: z.enum([
    "create_medical_director_message",
    "deliver_emergency_direction",
  ]),
  type: z.literal("function_call"),
})

export interface VoiceSocket {
  close(code?: number, reason?: string): void
  on(event: "close", listener: () => void): unknown
  on(event: "error", listener: (error: unknown) => void): unknown
  on(event: "message", listener: (data: unknown) => void): unknown
  on(event: "open", listener: () => void): unknown
  readyState: number
  send(data: string): void
}

type VoiceMessageTool = typeof executeMedicalDirectorVoiceMessageTool

export interface TwilioOpenAIRealtimeBridgeDependencies {
  clearCallTimeout: (timeout: ReturnType<typeof setTimeout>) => void
  createOpenAISocket: (session: TwilioVoiceSession) => VoiceSocket
  executeVoiceMessageTool: VoiceMessageTool
  parseSessionToken: typeof parseTwilioVoiceSessionToken
  setCallTimeout: (callback: () => void, milliseconds: number) => ReturnType<typeof setTimeout>
}

function messageText(data: unknown): string | null {
  if (typeof data === "string") return data
  if (Buffer.isBuffer(data)) return data.toString("utf8")
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8")
  if (Array.isArray(data) && data.every(Buffer.isBuffer)) {
    return Buffer.concat(data).toString("utf8")
  }
  return null
}

function parseJson(data: unknown): unknown {
  const text = messageText(data)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function buildSafetyIdentifier(callSid: string): string {
  const secret = process.env.TWILIO_VOICE_SESSION_SECRET?.trim()
  if (!secret) throw new Error("TWILIO_VOICE_SESSION_SECRET is not configured")
  return createHmac("sha256", secret).update(`voice-call:${callSid}`).digest("hex")
}

function defaultOpenAISocket(session: TwilioVoiceSession): VoiceSocket {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")

  return new WebSocket(OPENAI_REALTIME_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Safety-Identifier": buildSafetyIdentifier(session.callSid),
    },
  }) as unknown as VoiceSocket
}

function defaultDependencies(): TwilioOpenAIRealtimeBridgeDependencies {
  return {
    clearCallTimeout: clearTimeout,
    createOpenAISocket: defaultOpenAISocket,
    executeVoiceMessageTool: executeMedicalDirectorVoiceMessageTool,
    parseSessionToken: parseTwilioVoiceSessionToken,
    setCallTimeout: setTimeout,
  }
}

export function attachTwilioOpenAIRealtimeBridge(
  twilioSocket: VoiceSocket,
  dependencies: TwilioOpenAIRealtimeBridgeDependencies = defaultDependencies(),
): void {
  let closed = false
  let voiceMessageToolUsed = false
  let openaiReady = false
  let openaiSocket: VoiceSocket | null = null
  let session: TwilioVoiceSession | null = null
  let streamSid: string | null = null
  const queuedAudio: string[] = []

  const callTimeout = dependencies.setCallTimeout(() => {
    if (!closed) twilioSocket.close(1000, "Call duration limit reached")
  }, CALL_LIMIT_MS)
  const warningTimeout = dependencies.setCallTimeout(() => {
    if (!closed) {
      send(openaiSocket, {
        type: "response.create",
        response: {
          instructions: `Say exactly: "${LENA_TIME_WARNING}"`,
        },
      })
    }
  }, CALL_WARNING_MS)

  function send(socket: VoiceSocket | null, event: unknown): boolean {
    if (!socket || socket.readyState !== OPEN_SOCKET) return false
    socket.send(JSON.stringify(event))
    return true
  }

  function shutdown(origin: "openai" | "twilio", code = 1000, reason = "Stream ended") {
    if (closed) return
    closed = true
    dependencies.clearCallTimeout(callTimeout)
    dependencies.clearCallTimeout(warningTimeout)
    if (origin !== "openai" && openaiSocket?.readyState === OPEN_SOCKET) {
      openaiSocket.close(code, reason)
    }
    if (origin !== "twilio" && twilioSocket.readyState === OPEN_SOCKET) {
      twilioSocket.close(code, reason)
    }
  }

  async function handleFunctionCall(value: unknown) {
    if (!session || !openaiSocket) return
    const parsed = functionCallSchema.safeParse(value)
    if (!parsed.success) return

    if (parsed.data.name === "deliver_emergency_direction") {
      const output = JSON.stringify({ delivered: true })
      if (!send(openaiSocket, {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: parsed.data.call_id,
          output,
        },
      })) return
      send(openaiSocket, {
        type: "response.create",
        response: {
          instructions: `Say exactly: "${LENA_EMERGENCY_DIRECTION}" Then stop and wait.`,
        },
      })
      return
    }

    let output: string
    if (voiceMessageToolUsed) {
      output = JSON.stringify({ recorded: false, reason: "message_already_recorded" })
    } else {
      voiceMessageToolUsed = true
      // Once the caller has confirmed and the model invokes the save tool, the
      // durable write is allowed to finish even if the media socket drops. No
      // socket AbortSignal is passed into the persistence path.
      output = await dependencies.executeVoiceMessageTool(parsed.data.arguments, session)
    }

    if (!send(openaiSocket, {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: parsed.data.call_id,
        output,
      },
    })) return

    let recorded = false
    try {
      recorded = JSON.parse(output)?.recorded === true
    } catch {
      recorded = false
    }
    const finalLine = recorded ? LENA_SAVE_SUCCESS : LENA_SAVE_FAILURE
    send(openaiSocket, {
      type: "response.create",
      response: {
        instructions: `Say exactly: "${finalLine}"`,
      },
    })
  }

  function handleOpenAIMessage(data: unknown) {
    const event = parseJson(data)
    if (!event || typeof event !== "object") return
    const value = event as Record<string, unknown>

    if (value.type === "response.output_audio.delta" && typeof value.delta === "string" && streamSid) {
      send(twilioSocket, {
        event: "media",
        streamSid,
        media: { payload: value.delta },
      })
      return
    }

    if (value.type === "input_audio_buffer.speech_started" && streamSid) {
      send(twilioSocket, { event: "clear", streamSid })
      return
    }

    if (value.type === "response.done") {
      const output = (value.response as { output?: unknown } | undefined)?.output
      if (!Array.isArray(output)) return
      const call = output.find((item) =>
        typeof item === "object" && item !== null && (item as { type?: unknown }).type === "function_call",
      )
      if (call) void handleFunctionCall(call)
    }
  }

  function openOpenAI(start: z.infer<typeof startEventSchema>) {
    try {
      const parsedSession = dependencies.parseSessionToken(start.start.customParameters.sessionToken)
      if (parsedSession.callSid !== start.start.callSid) {
        shutdown("openai", 1008, "Invalid call session")
        return
      }

      session = parsedSession
      streamSid = start.start.streamSid
      openaiSocket = dependencies.createOpenAISocket(parsedSession)
      openaiSocket.on("open", () => {
        openaiReady = true
        send(openaiSocket, buildOpenAIRealtimeSessionUpdate())
        send(openaiSocket, {
          type: "response.create",
          response: {
            instructions: `Say exactly: "${LENA_GREETING}"`,
          },
        })
        for (const audio of queuedAudio.splice(0)) {
          send(openaiSocket, { type: "input_audio_buffer.append", audio })
        }
      })
      openaiSocket.on("message", handleOpenAIMessage)
      openaiSocket.on("error", () => shutdown("openai", 1011, "Assistant connection failed"))
      openaiSocket.on("close", () => shutdown("openai", 1011, "Assistant disconnected"))
    } catch {
      shutdown("openai", 1008, "Invalid call session")
    }
  }

  twilioSocket.on("message", (data) => {
    const event = parseJson(data)
    if (!event || typeof event !== "object") return

    const maybeStart = startEventSchema.safeParse(event)
    if (maybeStart.success) {
      if (!openaiSocket) openOpenAI(maybeStart.data)
      return
    }

    const maybeMedia = mediaEventSchema.safeParse(event)
    if (maybeMedia.success) {
      const audio = maybeMedia.data.media.payload
      if (openaiReady) {
        send(openaiSocket, { type: "input_audio_buffer.append", audio })
      } else if (queuedAudio.length < MAX_QUEUED_AUDIO_CHUNKS) {
        queuedAudio.push(audio)
      }
      return
    }

    if ((event as { event?: unknown }).event === "stop") {
      shutdown("twilio")
    }
  })
  twilioSocket.on("error", () => shutdown("twilio", 1011, "Voice stream failed"))
  twilioSocket.on("close", () => shutdown("twilio"))
}
