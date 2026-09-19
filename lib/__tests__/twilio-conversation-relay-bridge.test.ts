import { EventEmitter } from "node:events"

import { afterEach, describe, expect, it, vi } from "vitest"

import { attachTwilioConversationRelayBridge } from "@/lib/twilio/conversation-relay-bridge"

const { keepAlive } = vi.hoisted(() => ({ keepAlive: vi.fn() }))
vi.mock("@vercel/functions", () => ({ waitUntil: keepAlive }))

class Socket extends EventEmitter {
  readyState = 1
  sent: Record<string, unknown>[] = []
  send(data: string) { this.sent.push(JSON.parse(data)) }
  close() {
    if (this.readyState === 3) return
    this.readyState = 3
    this.emit("close")
  }
  receive(data: unknown) { this.emit("message", Buffer.from(JSON.stringify(data))) }
}

const session = {
  callSid: `CA${"0".repeat(32)}`,
  startedAt: "2026-09-18T01:00:00.000Z",
  expiresAt: "2026-09-18T01:05:00.000Z",
}
const saveOutput = [{
  type: "function_call", name: "create_medical_director_message", call_id: "tool-1",
  arguments: JSON.stringify({ caller_confirmed: true, callback_requested: false,
    category: "medical_certificate", confirmed_summary: "Please correct the certificate date." }),
}]

function harness() {
  vi.useFakeTimers()
  keepAlive.mockClear()
  const phone = new Socket()
  const model = new Socket()
  const save = vi.fn(async () => '{"recorded":true}')
  const create = vi.fn(() => model)
  attachTwilioConversationRelayBridge(phone, {
    clearCallTimeout: clearTimeout, setCallTimeout: setTimeout,
    createOpenAISocket: create, executeVoiceMessageTool: save,
    parseSessionToken: (token) => {
      if (token !== "valid") throw new Error("Invalid token")
      return session
    },
  })
  function setup(token = "valid") {
    phone.receive({ type: "setup", callSid: session.callSid,
      sessionId: "VX123", customParameters: { sessionToken: token } })
  }
  function ready() {
    setup()
    model.emit("open")
    model.receive({ type: "session.updated" })
  }
  function prompt(text: string, last = true) {
    phone.receive({ type: "prompt", voicePrompt: text, lang: "en-AU", last })
  }
  function started(id = "r1") { model.receive({ type: "response.created", response: { id } }) }
  function done(output: unknown[] = [], id = "r1", status = "completed") {
    model.receive({ type: "response.done", response: { id, status, output } })
  }
  return { phone, model, save, create, setup, ready, prompt, started, done }
}

describe("ConversationRelay voice secretary", () => {
  afterEach(() => vi.useRealTimers())

  it("rejects an invalid setup before opening the model connection", () => {
    const h = harness()
    h.setup("bad")
    expect(h.create).not.toHaveBeenCalled()
    expect(h.phone.sent.filter(e => e.type === "text")).toEqual([])
    expect(h.phone.readyState).toBe(3)
  })

  it("greets after valid setup without waiting for the model, then sends only final speech as text", () => {
    const h = harness()
    h.setup()
    h.model.emit("open")
    expect(h.phone.sent).toEqual([{ type: "text", token: "Hi, this is Lenna from InstantMed support. How can I help?", last: true }])
    expect(h.model.sent[0]).toMatchObject({ type: "session.update", session: { output_modalities: ["text"] } })
    h.model.receive({ type: "session.updated" })
    h.model.receive({ type: "session.updated" })
    expect(h.phone.sent).toEqual([{ type: "text", token: "Hi, this is Lenna from InstantMed support. How can I help?", last: true }])
    h.prompt("My certificate ", false)
    expect(h.model.sent.filter(e => e.type === "response.create")).toHaveLength(0)
    h.prompt("has the wrong date.")
    expect(h.model.sent.at(-1)).toMatchObject({ type: "response.create", response: {
      conversation: "none", input: expect.arrayContaining([
        { type: "message", role: "user", content: [{ type: "input_text", text: "My certificate has the wrong date." }] },
      ]),
    } })
    h.started()
    h.model.receive({ type: "response.output_text.delta", response_id: "r1", delta: "Of course, " })
    h.done()
    expect(h.phone.sent.slice(-2)).toEqual([
      { type: "text", token: "Of course, ", last: false },
      { type: "text", token: "", last: true },
    ])
  })

  it("holds an early caller reply until model readiness without repeating the greeting", () => {
    const h = harness()
    h.setup()
    h.prompt("Please correct the date on my certificate.")
    expect(h.model.sent.filter(e => e.type === "response.create")).toHaveLength(0)
    expect(h.phone.sent.filter(e => e.type === "text")).toHaveLength(1)
    h.model.emit("open")
    h.model.receive({ type: "session.updated" })
    expect(h.phone.sent.filter(e => e.type === "text")).toHaveLength(1)
    expect(h.model.sent.at(-1)).toMatchObject({ type: "response.create", response: {
      input: [
        { role: "assistant", content: [{ type: "output_text", text: "Hi, this is Lenna from InstantMed support. How can I help?" }] },
        { role: "user", content: [{ type: "input_text", text: "Please correct the date on my certificate." }] },
      ],
    } })
  })

  it("retains only the heard pronunciation-adjusted greeting when interrupted before model readiness", () => {
    const h = harness()
    h.setup()
    h.phone.receive({ type: "interrupt", utteranceUntilInterrupt: "Hi, this is Lenna" })
    h.prompt("My name is Lena, and my certificate has the wrong date.")
    h.model.emit("open")
    h.model.receive({ type: "session.updated" })
    expect(h.phone.sent.filter(e => e.type === "text")).toHaveLength(1)
    expect(h.model.sent.at(-1)).toMatchObject({ type: "response.create", response: {
      input: [
        { role: "assistant", content: [{ type: "output_text", text: "Hi, this is Lenna" }] },
        { role: "user", content: [{ type: "input_text", text: "My name is Lena, and my certificate has the wrong date." }] },
      ],
    } })
  })

  it("cancels an interrupted response and never executes its late save tool", async () => {
    const h = harness()
    h.ready(); h.prompt("Please fix it"); h.started()
    h.model.receive({ type: "response.output_text.delta", response_id: "r1", delta: "Your message is about the date. Is that right?" })
    h.phone.receive({ type: "interrupt", utteranceUntilInterrupt: "Your message is about" })
    h.prompt("No, the name")
    h.done(saveOutput)
    await Promise.resolve()
    expect(h.save).not.toHaveBeenCalled()
    expect(h.model.sent).toContainEqual({ type: "response.cancel", response_id: "r1", event_id: expect.any(String) })
    const request = h.model.sent.at(-1)
    expect(JSON.stringify(request)).toContain("Your message is about")
    expect(JSON.stringify(request)).not.toContain("Is that right?")
    expect(JSON.stringify(request)).toContain("No, the name")
  })

  it("cancels even when the caller interrupts before response.created arrives", () => {
    const h = harness()
    h.ready(); h.prompt("First message"); h.prompt("Actually, correction")
    h.started()
    expect(h.model.sent.at(-1)).toMatchObject({ type: "response.cancel", response_id: "r1" })
    h.done(saveOutput)
    expect(h.save).not.toHaveBeenCalled()
    expect(h.model.sent.filter(e => e.type === "response.create")).toHaveLength(2)
  })

  it("waits for durable save before success, deduplicates tools, and survives caller disconnect", async () => {
    const h = harness()
    let resolve!: (value: string) => void
    h.save.mockImplementation(() => new Promise<string>(r => { resolve = r }))
    h.ready(); h.prompt("Yes, send it"); h.started(); h.done(saveOutput); h.done(saveOutput)
    expect(h.save).toHaveBeenCalledExactlyOnceWith(saveOutput[0].arguments, session)
    expect(JSON.stringify(h.phone.sent)).not.toContain("sent your message")
    h.phone.close()
    resolve('{"recorded":true}')
    await Promise.resolve(); await Promise.resolve()
    expect(keepAlive).toHaveBeenCalledOnce()
    await expect(keepAlive.mock.calls[0][0]).resolves.toBeUndefined()
    expect(h.save).toHaveBeenCalledOnce()
    expect(JSON.stringify(h.phone.sent)).not.toContain("sent your message")
    expect(h.model.readyState).toBe(3)
  })

  it.each([['{"recorded":true}', "saved"], ['{"recorded":false}', "unconfirmed"]])(
    "hands off the truthful result %s for TwiML playback followed by hangup", async (result, outcome) => {
      const h = harness()
      h.save.mockResolvedValue(result)
      h.ready(); h.prompt("Yes"); h.started(); h.done(saveOutput)
      await Promise.resolve(); await Promise.resolve()
      expect(h.phone.sent.at(-1)).toEqual({ type: "end", handoffData: JSON.stringify({ outcome }) })
      expect(h.phone.readyState).toBe(3)
      h.prompt("Do it again")
      expect(h.model.sent.filter(e => e.type === "response.create")).toHaveLength(1)
    },
  )

  it("does not save an incomplete response and falls back on model failures", () => {
    const h = harness()
    h.ready(); h.prompt("Yes"); h.started(); h.done(saveOutput, "r1", "incomplete")
    expect(h.save).not.toHaveBeenCalled()
    expect(h.phone.sent.at(-1)).toMatchObject({ type: "end" })
  })

  it("repairs history when playback is interrupted after generation completed", () => {
    const h = harness()
    h.ready(); h.prompt("Wrong date"); h.started()
    h.model.receive({ type: "response.output_text.delta", response_id: "r1", delta: "I'll note the date. Is that correct?" })
    h.done()
    h.phone.receive({ type: "interrupt", utteranceUntilInterrupt: "I'll note the date." })
    h.prompt("It should say Friday")
    expect(JSON.stringify(h.model.sent.at(-1))).not.toContain("Is that correct?")
    expect(JSON.stringify(h.model.sent.at(-1))).toContain("I'll note the date.")
  })

  it("fails safely without echoing provider errors or opening another session", () => {
    const h = harness()
    h.ready()
    h.model.receive({ type: "error", error: { message: "Private caller content" } })
    expect(JSON.stringify(h.phone.sent)).not.toContain("Private caller content")
    expect(h.phone.sent.at(-1)).toMatchObject({ type: "end" })
    expect(h.phone.readyState).toBe(3)
    expect(h.model.readyState).toBe(3)
  })

  it("times out stalled turns and closes at twelve minutes without claiming a saved message failed", async () => {
    const h = harness()
    h.ready(); h.prompt("Yes"); h.started(); h.done(saveOutput)
    await Promise.resolve(); await Promise.resolve()
    await vi.advanceTimersByTimeAsync(12 * 60_000)
    expect(h.phone.sent.at(-1)).toEqual({ type: "end", handoffData: '{"outcome":"saved"}' })
    expect(h.phone.readyState).toBe(3)
    const stalled = harness()
    stalled.ready(); stalled.prompt("Hello")
    await vi.advanceTimersByTimeAsync(30_000)
    expect(stalled.phone.sent.at(-1)).toMatchObject({ type: "end" })
  })

  it("prioritises the fixed emergency response over a save in the same response", async () => {
    const h = harness()
    h.ready(); h.prompt("Emergency"); h.started()
    h.done([...saveOutput, { type: "function_call", name: "deliver_emergency_direction", arguments: "{}" }])
    await Promise.resolve()
    expect(h.save).not.toHaveBeenCalled()
    expect(h.phone.sent.at(-1)).toEqual({ type: "end", handoffData: '{"outcome":"emergency"}' })
  })

  it("ignores only the correlated already-completed cancellation error", () => {
    const h = harness()
    h.ready(); h.prompt("First"); h.started(); h.prompt("Correction")
    const cancellation = h.model.sent.at(-1)
    h.done()
    h.model.receive({ type: "error", error: { code: "response_cancel_not_active", event_id: cancellation?.event_id } })
    expect(h.phone.readyState).toBe(1)
    h.model.receive({ type: "error", error: { code: "response_cancel_not_active", event_id: "unrelated" } })
    expect(h.phone.readyState).toBe(3)
  })

  it("reports an unconfirmed outcome if the deadline crosses a pending save", async () => {
    const h = harness()
    let resolve!: (value: string) => void
    h.save.mockImplementation(() => new Promise<string>(r => { resolve = r }))
    h.ready()
    await vi.advanceTimersByTimeAsync(12 * 60_000 - 1_000)
    h.prompt("Yes"); h.started(); h.done(saveOutput)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(h.phone.sent.at(-1)).toEqual({ type: "end", handoffData: '{"outcome":"unconfirmed"}' })
    resolve('{"recorded":true}')
    await Promise.resolve(); await Promise.resolve()
    expect(h.phone.sent.at(-1)).toEqual({ type: "end", handoffData: '{"outcome":"unconfirmed"}' })
  })

  it("bounds the wait for saving without abandoning its runtime keep-alive", async () => {
    const h = harness()
    let resolve!: (value: string) => void
    h.save.mockImplementation(() => new Promise<string>(r => { resolve = r }))
    h.ready(); h.prompt("Yes"); h.started(); h.done(saveOutput)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(h.phone.sent.at(-1)).toEqual({ type: "end", handoffData: '{"outcome":"unconfirmed"}' })
    resolve('{"recorded":true}')
    await expect(keepAlive.mock.calls[0][0]).resolves.toBeUndefined()
    expect(h.save).toHaveBeenCalledOnce()
  })

  it("falls back when the handshake stalls and bounds oversized speech", async () => {
    const h = harness()
    h.setup()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(h.phone.sent.at(-1)).toMatchObject({ type: "end" })
    const next = harness()
    next.ready(); next.prompt("x".repeat(8_193))
    expect(next.phone.sent.at(-1)).toMatchObject({ type: "end" })
    expect(next.model.sent.filter(e => e.type === "response.create")).toHaveLength(0)
  })
})
