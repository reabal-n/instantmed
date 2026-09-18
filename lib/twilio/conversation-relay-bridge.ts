import "server-only"

import { waitUntil } from "@vercel/functions"
import { z } from "zod"

import {
  buildOpenAIRealtimeTextSessionUpdate,
  executeMedicalDirectorVoiceMessageTool,
  LENA_GREETING,
  LENA_TIME_WARNING,
} from "@/lib/twilio/openai-realtime"
import {
  createOpenAIRealtimeSocket,
  type TwilioOpenAIRealtimeBridgeDependencies,
  type VoiceSocket,
} from "@/lib/twilio/openai-realtime-bridge"
import { parseTwilioVoiceSessionToken, type TwilioVoiceSession } from "@/lib/twilio/voice-session-token"

const setupSchema = z.object({
  callSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
  customParameters: z.object({ sessionToken: z.string().min(1).max(4_096) }),
})
const toolSchema = z.object({
  type: z.literal("function_call"),
  name: z.enum(["create_medical_director_message", "deliver_emergency_direction"]),
  arguments: z.string().max(8_192),
})
type Turn = { type: "message"; role: "user" | "assistant"; content: { type: "input_text" | "output_text"; text: string }[] }
type Generation = { id?: string; cancelled: boolean; text: string; heard: string }

/** Text exists only in this call's bounded memory; never log provider frames. */
export function attachTwilioConversationRelayBridge(
  phone: VoiceSocket,
  deps: TwilioOpenAIRealtimeBridgeDependencies = {
    clearCallTimeout: clearTimeout, setCallTimeout: setTimeout,
    createOpenAISocket: createOpenAIRealtimeSocket,
    executeVoiceMessageTool: executeMedicalDirectorVoiceMessageTool,
    parseSessionToken: parseTwilioVoiceSessionToken,
  },
): void {
  let model: VoiceSocket | undefined
  let session: TwilioVoiceSession | null = null
  let ready = false
  let closed = false
  let terminal = false
  let saving = false
  let partial = ""
  let generation: Generation | undefined
  let lastAssistant: Turn | undefined
  const history: Turn[] = []
  const pending: string[] = []
  const cancellations = new Set<string>()
  let cancellationSequence = 0
  const timers = new Set<ReturnType<typeof setTimeout>>()

  function later(callback: () => void, delay: number) {
    const timer = deps.setCallTimeout(() => { timers.delete(timer); callback() }, delay)
    timers.add(timer)
    return timer
  }
  function clear(timer: ReturnType<typeof setTimeout>) {
    deps.clearCallTimeout(timer)
    timers.delete(timer)
  }
  function send(socket: VoiceSocket | undefined, event: unknown) {
    if (!closed && socket?.readyState === 1) socket.send(JSON.stringify(event))
  }
  function close() {
    if (closed) return
    closed = true
    for (const timer of timers) deps.clearCallTimeout(timer)
    timers.clear()
    history.length = 0
    pending.length = 0
    cancellations.clear()
    partial = ""
    generation = undefined
    lastAssistant = undefined
    model?.close()
    phone.close()
  }
  function finish(outcome: "saved" | "emergency" | "unconfirmed" | "unavailable" = saving ? "unconfirmed" : "unavailable") {
    // TwiML plays the fixed closeout then hangs up, so final speech is neither
    // clipped by a socket close nor followed by minutes of dead air.
    send(phone, { type: "end", handoffData: JSON.stringify({ outcome }) })
    close()
  }
  function speak(text: string) { send(phone, { type: "text", token: text, last: true }) }
  function add(role: Turn["role"], text: string) {
    const turn: Turn = { type: "message", role, content: [{ type: role === "user" ? "input_text" : "output_text", text }] }
    history.push(turn)
    if (role === "assistant") lastAssistant = turn
  }
  function cancel() {
    if (!generation || generation.cancelled) return
    generation.cancelled = true
    if (generation.id) sendCancellation(generation.id)
  }
  function sendCancellation(id: string) {
    const eventId = `lena_cancel_${++cancellationSequence}`
    cancellations.add(eventId)
    send(model, { type: "response.cancel", response_id: id, event_id: eventId })
  }
  let responseTimer: ReturnType<typeof setTimeout> | undefined
  function respond() {
    if (!ready || closed || terminal || generation || pending.length === 0) return
    for (const text of pending.splice(0)) add("user", text)
    const size = history.reduce((n, turn) => n + turn.content[0].text.length, 0)
    if (history.length > 80 || size > 24_000) { finish(); return }
    generation = { cancelled: false, text: "", heard: "" }
    // Own the transient history so interrupted, unheard readbacks never become
    // confirmation context in the next model turn.
    send(model, { type: "response.create", response: { conversation: "none", input: history } })
    responseTimer = later(() => finish(), 30_000)
  }
  const handshake = later(() => finish(), 10_000)
  later(() => { if (!terminal) speak(LENA_TIME_WARNING) }, 11 * 60_000)
  later(() => finish(), 12 * 60_000)

  async function onModel(event: Record<string, unknown>) {
    if (closed) return
    if (event.type === "session.updated") {
      if (ready) return
      ready = true
      clear(handshake)
      respond()
    } else if (event.type === "error") {
      const error = event.error as { code?: string; event_id?: string } | undefined
      // Cancellation can arrive after a completed response. Only this exact,
      // correlated benign error is ignored; other provider errors fail closed.
      if (error?.code === "response_cancel_not_active" && error.event_id && cancellations.delete(error.event_id)) return
      finish()
    } else if (event.type === "response.created") {
      const response = event.response as { id?: string } | undefined
      if (!generation || typeof response?.id !== "string") { finish(); return }
      generation.id = response.id
      if (generation.cancelled) sendCancellation(response.id)
    } else if (event.type === "response.output_text.delta") {
      if (!generation || generation.cancelled || event.response_id !== generation.id) return
      if (typeof event.delta !== "string" || generation.text.length + event.delta.length > 4_096) { finish(); return }
      generation.text += event.delta
      send(phone, { type: "text", token: event.delta, last: false })
    } else if (event.type === "response.done") {
      const response = event.response as { id?: string; status?: string; output?: unknown[] } | undefined
      if (!generation || !response || response.id !== generation.id) return
      if (responseTimer) clear(responseTimer)
      const completed = generation
      generation = undefined
      if (completed.cancelled) {
        if (completed.heard) add("assistant", completed.heard)
        respond()
        return
      }
      if (response.status !== "completed" || !Array.isArray(response.output)) { finish(); return }
      if (completed.text) {
        send(phone, { type: "text", token: "", last: true })
        add("assistant", completed.text)
      }
      const tools = response.output.flatMap(item => {
        const parsed = toolSchema.safeParse(item)
        return parsed.success ? [parsed.data] : []
      })
      if (tools.some(tool => tool.name === "deliver_emergency_direction")) {
        terminal = true
        finish("emergency")
      } else if (tools.length && !terminal && session) {
        terminal = true // Set before awaiting: duplicate completion cannot save twice.
        saving = true
        const saveDeadline = later(() => finish("unconfirmed"), 15_000)
        // Saving is deliberately not cancelled by a caller disconnect.
        let recorded = false
        try {
          const persistence = deps.executeVoiceMessageTool(tools[0].arguments, session)
          waitUntil(persistence.then(() => undefined, () => undefined))
          const result = JSON.parse(await persistence)
          recorded = result.recorded === true
        } catch { recorded = false }
        clear(saveDeadline)
        saving = false
        finish(recorded ? "saved" : "unconfirmed")
      } else {
        respond()
      }
    }
  }

  function decode(data: unknown): Record<string, unknown> | null {
    try {
      const text = typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString("utf8") : ""
      if (text.length > 64 * 1024) return null
      const event: unknown = JSON.parse(text)
      return event && typeof event === "object" && !Array.isArray(event) ? event as Record<string, unknown> : null
    } catch { return null }
  }

  phone.on("message", data => {
    if (closed) return
    const event = decode(data)
    if (!event) { finish(); return }
    if (event.type === "setup") {
      if (model) { finish(); return }
      const parsed = setupSchema.safeParse(event)
      if (!parsed.success) { close(); return }
      try {
        session = deps.parseSessionToken(parsed.data.customParameters.sessionToken)
        if (session.callSid !== parsed.data.callSid) { close(); return }
        // The fixed greeting needs no model. Start speech while its connection
        // warms up; respond() queues any early caller reply until session.updated.
        speak(LENA_GREETING)
        add("assistant", LENA_GREETING)
        model = deps.createOpenAISocket(session)
        model.on("open", () => send(model, buildOpenAIRealtimeTextSessionUpdate()))
        model.on("message", data => {
          const event = decode(data)
          if (!event) { finish(); return }
          void onModel(event).catch(() => finish())
        })
        model.on("error", () => finish())
        model.on("close", () => { if (!closed && !terminal) finish() })
      } catch { finish() }
    } else if (event.type === "prompt" && !terminal) {
      if (!session || typeof event.voicePrompt !== "string" || typeof event.last !== "boolean") { finish(); return }
      partial += event.voicePrompt
      if (partial.length > 8_192) { finish(); return }
      if (event.last) {
        const text = partial.trim()
        partial = ""
        if (!text) return
        pending.push(text)
        if (pending.length > 4) { finish(); return }
        cancel()
        respond()
      }
    } else if (event.type === "interrupt" && !terminal) {
      const heard = typeof event.utteranceUntilInterrupt === "string" ? event.utteranceUntilInterrupt : ""
      if (generation?.text) {
        generation.heard = generation.text.startsWith(heard) ? heard : ""
      } else if (lastAssistant) {
        const text = lastAssistant.content[0].text
        lastAssistant.content[0].text = text.startsWith(heard) ? heard : ""
        if (!lastAssistant.content[0].text) history.splice(history.indexOf(lastAssistant), 1)
        lastAssistant = undefined
      }
      cancel()
    } else if (event.type === "error") {
      finish()
    }
  })
  phone.on("error", () => finish())
  phone.on("close", close)
}
