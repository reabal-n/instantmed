import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { adoptServerDraftSession, saveServerDraft } from "@/lib/request/server-draft"

const SESSION_ID = "11111111-1111-4111-8111-111111111111"

describe("adoptServerDraftSession", () => {
  let sessionStore: Record<string, string>

  beforeEach(() => {
    sessionStore = {}
    vi.stubGlobal("window", {})
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => sessionStore[key] ?? null,
      setItem: (key: string, value: string) => {
        sessionStore[key] = value
      },
      removeItem: (key: string) => {
        delete sessionStore[key]
      },
    })
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sessionId: SESSION_ID,
        expiresAt: "2026-07-23T00:00:00.000Z",
        updatedAt: "2026-07-16T00:00:00.000Z",
      }),
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("adopts a validated server record so later saves reuse its session", async () => {
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
    })).toBe(true)

    await saveServerDraft({
      serviceType: "med-cert",
      currentStepId: "certificate",
      answers: { certType: "work" },
    })

    expect(fetch).toHaveBeenCalledOnce()
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).toMatchObject({ sessionId: SESSION_ID })
  })

  it("rejects a malformed bearer-token session id", () => {
    expect(adoptServerDraftSession({
      sessionId: "not-a-session-id",
      serviceType: "consult",
    })).toBe(false)

    expect(sessionStore).toEqual({})
  })
})
