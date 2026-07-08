import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { flushServerDraft } from "@/lib/request/server-draft"

// flushServerDraft is the pagehide/visibilitychange escape hatch: it must send
// the CURRENT draft immediately via sendBeacon (bypassing the debounce that dies
// with the page), so a just-typed recovery email is not silently lost for
// cross-device resume + the recovery-email cron.

type BeaconCall = { url: string; body: string }

class FakeBlob {
  type: string
  parts: string[]
  size: number
  constructor(parts: string[], opts?: { type?: string }) {
    this.parts = parts
    this.type = opts?.type ?? ""
    this.size = parts.join("").length
  }
}

describe("flushServerDraft (pagehide beacon)", () => {
  let beaconCalls: BeaconCall[]
  let sessionStore: Record<string, string>

  beforeEach(() => {
    beaconCalls = []
    sessionStore = {}
    vi.stubGlobal("window", {})
    vi.stubGlobal("Blob", FakeBlob)
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k in sessionStore ? sessionStore[k] : null),
      setItem: (k: string, v: string) => {
        sessionStore[k] = v
      },
      removeItem: (k: string) => {
        delete sessionStore[k]
      },
    })
    vi.stubGlobal("navigator", {
      sendBeacon: (url: string, data: FakeBlob) => {
        beaconCalls.push({ url, body: data.parts.join("") })
        return true
      },
    })
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("beacons the current draft to /api/draft with the identity in the body", () => {
    flushServerDraft({
      serviceType: "med-cert",
      currentStepId: "certificate",
      answers: { certType: "work" },
      identity: { email: "patient@example.com" },
    })

    expect(beaconCalls).toHaveLength(1)
    expect(beaconCalls[0].url).toBe("/api/draft")
    const body = JSON.parse(beaconCalls[0].body)
    expect(body.serviceType).toBe("med-cert")
    expect(body.identity.email).toBe("patient@example.com")
    expect(body.sessionId).toBeUndefined()
    // sendBeacon path succeeded → no keepalive-fetch fallback.
    expect(fetch).not.toHaveBeenCalled()
  })

  it("includes the stored sessionId so the existing row is upserted, not duplicated", () => {
    sessionStore["instantmed-server-draft-med-cert"] = "sess-abc"

    flushServerDraft({
      serviceType: "med-cert",
      identity: { email: "patient@example.com" },
    })

    expect(beaconCalls).toHaveLength(1)
    const body = JSON.parse(beaconCalls[0].body)
    expect(body.sessionId).toBe("sess-abc")
  })

  it("falls back to keepalive fetch when sendBeacon is unavailable", () => {
    vi.stubGlobal("navigator", {}) // no sendBeacon

    flushServerDraft({
      serviceType: "med-cert",
      identity: { email: "patient@example.com" },
    })

    expect(beaconCalls).toHaveLength(0)
    expect(fetch).toHaveBeenCalledWith(
      "/api/draft",
      expect.objectContaining({ method: "POST", keepalive: true }),
    )
  })
})
