import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  adoptServerDraftSession,
  deleteServerDraft,
  flushServerDraft,
  getActiveServerDraftSessionId,
  resetServerDraftClientStateForTests,
  retryPendingServerDraftDiscards,
  saveServerDraft,
  saveServerDraftDebounced,
} from "@/lib/request/server-draft"

const SESSION_ID = "11111111-1111-4111-8111-111111111111"
const FRESH_SESSION_ID = "22222222-2222-4222-8222-222222222222"
const RETRY_SESSION_ID = "33333333-3333-4333-8333-333333333333"
const EXHAUST_SESSION_ID = "44444444-4444-4444-8444-444444444444"
const FLOW_INSTANCE_ID = "55555555-5555-4555-8555-555555555555"
const FRESH_FLOW_INSTANCE_ID = "66666666-6666-4666-8666-666666666666"
const PENDING_DISCARD_KEY_PREFIX = "instantmed-server-draft-discard-pending-v1:"
const pendingDiscardKey = (sessionId: string) => `${PENDING_DISCARD_KEY_PREFIX}${sessionId}`
const pendingDiscardMarker = (
  serviceType: "med-cert" | "prescription" | "consult" = "med-cert",
  requestedAt = new Date().toISOString(),
  flowInstanceId?: string,
) => JSON.stringify({ v: 1, serviceType, requestedAt, flowInstanceId })
const DISCARD_FENCE_MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260722231500_fence_discarded_partial_intake_drafts.sql",
  ),
  "utf8",
).toLowerCase().replace(/\s+/g, " ")

describe("adoptServerDraftSession", () => {
  let sessionStore: Record<string, string>

  beforeEach(() => {
    sessionStore = {}
    vi.stubGlobal("window", {})
    vi.stubGlobal("localStorage", {
      get length() {
        return Object.keys(sessionStore).length
      },
      getItem: (key: string) => sessionStore[key] ?? null,
      key: (index: number) => Object.keys(sessionStore)[index] ?? null,
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
    resetServerDraftClientStateForTests()
    vi.useRealTimers()
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

  it("coordinates a recovered bearer with one flow and clears stale legacy pairing", () => {
    sessionStore["instantmed-server-draft-flow-med-cert"] = FRESH_FLOW_INSTANCE_ID

    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      flowInstanceId: null,
    })).toBe(true)
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBe(SESSION_ID)
    expect(sessionStore["instantmed-server-draft-flow-med-cert"]).toBeUndefined()

    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
    })).toBe(true)
    expect(getActiveServerDraftSessionId(
      "med-cert",
      FLOW_INSTANCE_ID,
    )).toBe(SESSION_ID)
  })

  it("cancels a queued save before deleting an explicitly discarded draft", async () => {
    vi.useFakeTimers()
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
    })).toBe(true)

    saveServerDraftDebounced({
      serviceType: "med-cert",
      currentStepId: "symptoms",
      answers: { certType: "work" },
    })

    await deleteServerDraft("med-cert")
    await vi.runAllTimersAsync()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(
      `/api/draft?id=${SESSION_ID}`,
      expect.objectContaining({ method: "DELETE", keepalive: true }),
    )
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
  })

  it("does not re-adopt a bearer when an already-started save resolves after discard", async () => {
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
    })).toBe(true)

    let resolveSave: ((value: unknown) => void) | undefined
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/draft" && init?.method === "POST") {
        return new Promise((resolve) => {
          resolveSave = resolve
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
    }))

    const save = saveServerDraft({
      serviceType: "med-cert",
      currentStepId: "symptoms",
      answers: { certType: "work" },
    })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    const discard = deleteServerDraft("med-cert")
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

    resolveSave?.({
      ok: true,
      json: async () => ({
        sessionId: SESSION_ID,
        expiresAt: "2026-07-23T00:00:00.000Z",
        updatedAt: "2026-07-16T00:00:00.000Z",
      }),
    })
    await Promise.all([save, discard])

    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
    expect(vi.mocked(fetch).mock.calls.map(([, init]) => init?.method)).toEqual([
      "POST",
      "DELETE",
    ])
  })

  it("keeps a failed discard queued until a later retry succeeds", async () => {
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
    })).toBe(true)

    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))

    await expect(deleteServerDraft("med-cert")).resolves.toBe(false)

    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
    expect(JSON.parse(sessionStore[pendingDiscardKey(SESSION_ID)])).toMatchObject({
      v: 1,
      serviceType: "med-cert",
    })

    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })))

    await expect(retryPendingServerDraftDiscards("med-cert")).resolves.toBe(1)
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeUndefined()
  })

  it("retains the marker when DELETE throws before receiving a response", async () => {
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
    })).toBe(true)
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline")
    }))

    await expect(deleteServerDraft("med-cert")).resolves.toBe(false)

    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeDefined()
  })

  it("retries a transient HTTP failure while the browser stays online", async () => {
    vi.useFakeTimers()
    expect(adoptServerDraftSession({
      sessionId: RETRY_SESSION_ID,
      serviceType: "med-cert",
    })).toBe(true)
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true }))

    await expect(deleteServerDraft("med-cert")).resolves.toBe(false)
    expect(fetch).toHaveBeenCalledOnce()
    expect(sessionStore[pendingDiscardKey(RETRY_SESSION_ID)]).toBeDefined()

    await vi.advanceTimersByTimeAsync(1_999)
    expect(fetch).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(sessionStore[pendingDiscardKey(RETRY_SESSION_ID)]).toBeUndefined()
  })

  it("bounds in-session retries and retains the marker after exhaustion", async () => {
    vi.useFakeTimers()
    expect(adoptServerDraftSession({
      sessionId: EXHAUST_SESSION_ID,
      serviceType: "med-cert",
    })).toBe(true)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429 })))

    await expect(deleteServerDraft("med-cert")).resolves.toBe(false)
    await vi.advanceTimersByTimeAsync(60 * 60_000)

    expect(fetch).toHaveBeenCalledTimes(9)
    expect(sessionStore[pendingDiscardKey(EXHAUST_SESSION_ID)]).toBeDefined()

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    expect(fetch).toHaveBeenCalledTimes(9)
  })

  it("always retires an issued bearer and blocks new server mirrors at the queue cap", async () => {
    const queuedSessionIds = Array.from({ length: 8 }, (_, index) =>
      `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    )
    for (const sessionId of queuedSessionIds) {
      sessionStore[pendingDiscardKey(sessionId)] = pendingDiscardMarker()
    }
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
    })).toBe(true)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))

    await expect(deleteServerDraft("med-cert")).resolves.toBe(false)

    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeDefined()
    for (const sessionId of queuedSessionIds) {
      expect(sessionStore[pendingDiscardKey(sessionId)]).toBeDefined()
    }

    const deleteAttempts = vi.mocked(fetch).mock.calls.length
    await expect(saveServerDraft({
      serviceType: "med-cert",
      currentStepId: "certificate",
      answers: { certType: "work" },
    })).resolves.toBeNull()
    expect(fetch).toHaveBeenCalledTimes(deleteAttempts)
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
  })

  it("rejects re-adoption of a bearer already pending discard", () => {
    sessionStore[pendingDiscardKey(SESSION_ID)] = pendingDiscardMarker()

    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
    })).toBe(false)
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
  })

  it("fences the whole flow so a stale tab cannot mint a replacement bearer", async () => {
    sessionStore[pendingDiscardKey(SESSION_ID)] = pendingDiscardMarker(
      "med-cert",
      new Date().toISOString(),
      FLOW_INSTANCE_ID,
    )
    vi.stubGlobal("crypto", { randomUUID: () => FRESH_SESSION_ID })

    await expect(saveServerDraft({
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
      currentStepId: "certificate",
      answers: { certType: "work" },
    })).resolves.toBeNull()

    expect(fetch).not.toHaveBeenCalled()
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
  })

  it("does not let a stale retired flow clear a fresh tab's active bearer", async () => {
    sessionStore[pendingDiscardKey(SESSION_ID)] = pendingDiscardMarker(
      "med-cert",
      new Date().toISOString(),
      FLOW_INSTANCE_ID,
    )
    sessionStore["instantmed-server-draft-med-cert"] = FRESH_SESSION_ID
    sessionStore["instantmed-server-draft-flow-med-cert"] = FRESH_FLOW_INSTANCE_ID

    await expect(saveServerDraft({
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
      currentStepId: "certificate",
      answers: { certType: "work" },
    })).resolves.toBeNull()

    expect(fetch).not.toHaveBeenCalled()
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBe(FRESH_SESSION_ID)
    expect(sessionStore["instantmed-server-draft-flow-med-cert"]).toBe(
      FRESH_FLOW_INSTANCE_ID,
    )
  })

  it("keeps the flow retired after DELETE succeeds and the pending marker clears", async () => {
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
    })).toBe(true)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })))

    await expect(deleteServerDraft("med-cert")).resolves.toBe(true)
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeUndefined()
    expect(sessionStore[
      `instantmed-draft-retired-flow-v1:${FLOW_INSTANCE_ID}`
    ]).toBeDefined()

    sessionStore["instantmed-server-draft-med-cert"] = FRESH_SESSION_ID
    sessionStore["instantmed-server-draft-flow-med-cert"] = FRESH_FLOW_INSTANCE_ID
    vi.mocked(fetch).mockClear()

    await expect(saveServerDraft({
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
      currentStepId: "certificate",
      answers: { certType: "work" },
    })).resolves.toBeNull()

    expect(fetch).not.toHaveBeenCalled()
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBe(FRESH_SESSION_ID)
    expect(sessionStore["instantmed-server-draft-flow-med-cert"]).toBe(
      FRESH_FLOW_INSTANCE_ID,
    )
  })

  it("does not let a stale flow discard a fresh same-service bearer", async () => {
    sessionStore["instantmed-server-draft-med-cert"] = FRESH_SESSION_ID
    sessionStore["instantmed-server-draft-flow-med-cert"] = FRESH_FLOW_INSTANCE_ID

    await expect(deleteServerDraft(
      "med-cert",
      FLOW_INSTANCE_ID,
    )).resolves.toBe(true)

    expect(fetch).not.toHaveBeenCalled()
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBe(FRESH_SESSION_ID)
    expect(sessionStore["instantmed-server-draft-flow-med-cert"]).toBe(
      FRESH_FLOW_INSTANCE_ID,
    )
    expect(sessionStore[
      `instantmed-draft-retired-flow-v1:${FLOW_INSTANCE_ID}`
    ]).toBeDefined()
  })

  it("treats a cross-flow DELETE conflict as terminal for that marker", async () => {
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
    })).toBe(true)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 409 })))

    await expect(deleteServerDraft(
      "med-cert",
      FLOW_INSTANCE_ID,
    )).resolves.toBe(true)

    expect(fetch).toHaveBeenCalledOnce()
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeUndefined()
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBeUndefined()
    expect(sessionStore[
      `instantmed-draft-retired-flow-v1:${FLOW_INSTANCE_ID}`
    ]).toBeDefined()
  })

  it("cancels the ladder when a scheduled retry resolves as a flow conflict", async () => {
    vi.useFakeTimers()
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
    })).toBe(true)
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 409 }))

    await expect(deleteServerDraft(
      "med-cert",
      FLOW_INSTANCE_ID,
    )).resolves.toBe(false)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeUndefined()

    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("times out a hung DELETE and keeps absolute retry targets", async () => {
    vi.useFakeTimers()
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
    })).toBe(true)
    const startedAt = Date.now()
    const callTimes: number[] = []
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      callTimes.push(Date.now() - startedAt)
      if (callTimes.length > 1) {
        return Promise.resolve({ ok: true, status: 200 })
      }
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"))
        })
      })
    }))

    const deletion = deleteServerDraft("med-cert", FLOW_INSTANCE_ID)
    await vi.advanceTimersByTimeAsync(7_000)
    await expect(deletion).resolves.toBe(false)
    expect(callTimes).toEqual([0])
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeDefined()

    // The next target remains 12s from requestedAt, not 12s after the
    // seven-second hung response finally aborted.
    await vi.advanceTimersByTimeAsync(4_999)
    expect(callTimes).toEqual([0])
    await vi.advanceTimersByTimeAsync(1)
    expect(callTimes).toEqual([0, 12_000])
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeUndefined()
  })

  it("binds the checkout conversion bearer to the exact active flow", () => {
    sessionStore["instantmed-server-draft-med-cert"] = FRESH_SESSION_ID
    sessionStore["instantmed-server-draft-flow-med-cert"] = FRESH_FLOW_INSTANCE_ID

    expect(getActiveServerDraftSessionId(
      "med-cert",
      FRESH_FLOW_INSTANCE_ID,
    )).toBe(FRESH_SESSION_ID)
    expect(getActiveServerDraftSessionId(
      "med-cert",
      FLOW_INSTANCE_ID,
    )).toBeNull()
  })

  it("passes the opaque flow fence through DELETE while allowing a fresh flow", async () => {
    expect(adoptServerDraftSession({
      sessionId: SESSION_ID,
      serviceType: "med-cert",
      flowInstanceId: FLOW_INSTANCE_ID,
    })).toBe(true)
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))

    await expect(deleteServerDraft("med-cert")).resolves.toBe(false)

    expect(fetch).toHaveBeenCalledWith(
      `/api/draft?id=${SESSION_ID}&flow=${FLOW_INSTANCE_ID}`,
      expect.objectContaining({ method: "DELETE" }),
    )
    expect(JSON.parse(sessionStore[pendingDiscardKey(SESSION_ID)])).toMatchObject({
      flowInstanceId: FLOW_INSTANCE_ID,
    })

    vi.stubGlobal("crypto", { randomUUID: () => FRESH_SESSION_ID })
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sessionId: FRESH_SESSION_ID,
        expiresAt: "2026-07-30T00:00:00.000Z",
        updatedAt: "2026-07-23T00:00:00.000Z",
      }),
    })))
    await expect(saveServerDraft({
      serviceType: "med-cert",
      flowInstanceId: FRESH_FLOW_INSTANCE_ID,
      currentStepId: "certificate",
      answers: { certType: "work" },
    })).resolves.toBe(FRESH_SESSION_ID)
  })

  it("creates fresh same-service work under a new bearer while the old one is retired", async () => {
    sessionStore[pendingDiscardKey(SESSION_ID)] = pendingDiscardMarker()
    vi.stubGlobal("crypto", { randomUUID: () => FRESH_SESSION_ID })
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sessionId: FRESH_SESSION_ID,
        expiresAt: "2026-07-30T00:00:00.000Z",
        updatedAt: "2026-07-23T00:00:00.000Z",
      }),
    })))

    await expect(saveServerDraft({
      serviceType: "med-cert",
      currentStepId: "certificate",
      answers: { certType: "work" },
    })).resolves.toBe(FRESH_SESSION_ID)

    expect(sessionStore["instantmed-server-draft-med-cert"]).toBe(FRESH_SESSION_ID)
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeDefined()
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).toMatchObject({ sessionId: FRESH_SESSION_ID })
  })

  it("removes only the retired bearer and preserves fresh same-service work", async () => {
    sessionStore[pendingDiscardKey(SESSION_ID)] = pendingDiscardMarker()
    sessionStore["instantmed-server-draft-med-cert"] = FRESH_SESSION_ID
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })))

    await expect(retryPendingServerDraftDiscards("med-cert")).resolves.toBe(1)

    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeUndefined()
    expect(sessionStore["instantmed-server-draft-med-cert"]).toBe(FRESH_SESSION_ID)
  })

  it("prunes expired and malformed markers without sending a request", async () => {
    sessionStore[pendingDiscardKey(SESSION_ID)] = pendingDiscardMarker(
      "med-cert",
      new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    )
    sessionStore[`${PENDING_DISCARD_KEY_PREFIX}not-a-uuid`] = "not-json"

    await expect(retryPendingServerDraftDiscards()).resolves.toBe(0)

    expect(fetch).not.toHaveBeenCalled()
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeUndefined()
    expect(sessionStore[`${PENDING_DISCARD_KEY_PREFIX}not-a-uuid`]).toBeUndefined()
  })

  it("coalesces concurrent same-tab retries for the same retired bearer", async () => {
    sessionStore[pendingDiscardKey(SESSION_ID)] = pendingDiscardMarker()
    let resolveDiscard: ((value: { ok: boolean }) => void) | undefined
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => {
      resolveDiscard = resolve
    })))

    const firstRetry = retryPendingServerDraftDiscards()
    const secondRetry = retryPendingServerDraftDiscards()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    resolveDiscard?.({ ok: true })
    await Promise.all([firstRetry, secondRetry])

    expect(fetch).toHaveBeenCalledOnce()
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeUndefined()
  })

  it("keeps independent per-bearer markers through a shared transient failure", async () => {
    sessionStore[pendingDiscardKey(SESSION_ID)] = pendingDiscardMarker("med-cert")
    sessionStore[pendingDiscardKey(FRESH_SESSION_ID)] = pendingDiscardMarker("prescription")
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))

    await expect(retryPendingServerDraftDiscards()).resolves.toBe(0)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(sessionStore[pendingDiscardKey(SESSION_ID)]).toBeDefined()
    expect(sessionStore[pendingDiscardKey(FRESH_SESSION_ID)]).toBeDefined()
  })

  it("does not create an unreachable server row when the bearer cannot be stored", async () => {
    vi.stubGlobal("localStorage", {
      length: 0,
      getItem: () => null,
      key: () => null,
      setItem: () => {
        throw new Error("storage blocked")
      },
      removeItem: vi.fn(),
    })

    await expect(saveServerDraft({
      serviceType: "consult",
      currentStepId: "ed-goals",
      answers: { consultSubtype: "ed" },
    })).resolves.toBeNull()
    flushServerDraft({
      serviceType: "consult",
      currentStepId: "ed-goals",
      answers: { consultSubtype: "ed" },
    })

    expect(fetch).not.toHaveBeenCalled()
  })
})

describe("partial-intake discard fence migration", () => {
  it("serializes saves and discards, stores no PHI, and remains service-role only", () => {
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "create table if not exists public.partial_intake_discard_tombstones",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "alter table public.partial_intake_discard_tombstones enable row level security",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "before insert on public.partial_intakes",
    )
    expect(DISCARD_FENCE_MIGRATION).not.toContain(
      "before insert or update on public.partial_intakes",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "before update of flow_instance_id, service_type on public.partial_intakes",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain("draft_session_flow_mismatch")
    expect(DISCARD_FENCE_MIGRATION).toContain("draft_session_service_mismatch")
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "create or replace function public.claim_partial_intake_draft_for_checkout( p_session_id uuid, p_flow_instance_id uuid, p_service_type text )",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "set flow_instance_id = p_flow_instance_id",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "draft_checkout_tombstoned",
    )
    const checkoutClaimStart = DISCARD_FENCE_MIGRATION.indexOf(
      "create or replace function public.claim_partial_intake_draft_for_checkout",
    )
    const checkoutClaimEnd = DISCARD_FENCE_MIGRATION.indexOf(
      "drop function if exists public.discard_partial_intake_draft",
      checkoutClaimStart,
    )
    const checkoutClaimDefinition = DISCARD_FENCE_MIGRATION.slice(
      checkoutClaimStart,
      checkoutClaimEnd,
    )
    expect(checkoutClaimDefinition.indexOf("draft_checkout_tombstoned")).toBeLessThan(
      checkoutClaimDefinition.indexOf("for update"),
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "create or replace function public.discard_partial_intake_draft( p_session_id uuid, p_flow_instance_id uuid default null )",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "pg_advisory_xact_lock_shared(731947, 1)",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "pg_advisory_xact_lock(731947, 1)",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain("'session:' || new.session_id::text")
    expect(DISCARD_FENCE_MIGRATION).not.toContain("'flow:' || new.flow_instance_id::text")
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "before delete on public.partial_intakes for each statement",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "before delete on public.partial_intakes for each row",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain("return null")
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "discarded_flow_instance_id := coalesce( row_flow_instance_id, tombstone_flow_instance_id );",
    )
    expect(DISCARD_FENCE_MIGRATION).not.toContain(
      "tombstone_flow_instance_id, p_flow_instance_id",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "delete from public.partial_intakes where session_id = p_session_id;",
    )
    expect(DISCARD_FENCE_MIGRATION).not.toContain(
      "and flow_instance_id = discarded_flow_instance_id",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "revoke all on function public.claim_partial_intake_draft_for_checkout( uuid, uuid, text ) from public, anon, authenticated",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "grant execute on function public.claim_partial_intake_draft_for_checkout( uuid, uuid, text ) to service_role",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "revoke all on function public.discard_partial_intake_draft(uuid, uuid) from public, anon, authenticated",
    )
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "grant execute on function public.discard_partial_intake_draft(uuid, uuid) to service_role",
    )
    expect(DISCARD_FENCE_MIGRATION).not.toMatch(/\bstrict\b/)
    expect(DISCARD_FENCE_MIGRATION).toContain(
      "delete from public.partial_intake_discard_tombstones where expires_at < now()",
    )
    const tombstoneTableStart = DISCARD_FENCE_MIGRATION.indexOf(
      "create table if not exists public.partial_intake_discard_tombstones (",
    )
    const tombstoneTableEnd = DISCARD_FENCE_MIGRATION.indexOf(
      ");",
      tombstoneTableStart,
    )
    expect(tombstoneTableStart).toBeGreaterThanOrEqual(0)
    expect(tombstoneTableEnd).toBeGreaterThan(tombstoneTableStart)
    const tombstoneTableDefinition = DISCARD_FENCE_MIGRATION.slice(
      tombstoneTableStart,
      tombstoneTableEnd,
    )
    for (const phiColumn of [
      "answers_encrypted",
      "identity_encrypted",
      "email",
      "first_name",
      "phone",
    ]) {
      expect(tombstoneTableDefinition).not.toContain(`${phiColumn} `)
    }
  })
})
