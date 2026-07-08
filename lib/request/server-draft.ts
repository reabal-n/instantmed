"use client"

/**
 * Client wrapper for the /api/draft route. Handles cross-device intake draft
 * persistence on top of the existing localStorage-based system.
 *
 * Design contract:
 *   - localStorage stays the source of truth for the active session. It's
 *     synchronous, free, and works offline. The server is the cross-device
 *     and recovery-email backstop.
 *   - The server sessionId is itself stored in localStorage so subsequent
 *     saves upsert the same row. If localStorage is wiped, the next save
 *     creates a new server row.
 *   - All server calls are fire-and-forget from the client's perspective.
 *     A network failure must never break the intake flow.
 */

import { canonicalizeServiceType, type CanonicalServiceType } from "./draft-storage"

const SERVER_SESSION_KEY_PREFIX = "instantmed-server-draft-"

interface ServerDraftPayload {
  serviceType: CanonicalServiceType
  currentStepId?: string
  answers?: Record<string, unknown>
  identity?: {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
  }
}

interface ServerDraftResponse {
  sessionId: string
  expiresAt: string
  updatedAt: string
}

interface ServerDraftRecord {
  sessionId: string
  serviceType: CanonicalServiceType
  currentStepId: string | null
  answers: Record<string, unknown>
  identity: {
    email: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
  }
  updatedAt: string
  expiresAt: string
}

declare global {
  interface Window {
    __instantmedFlushServerDraft?: typeof flushServerDraft
  }
}

function getStoredSessionId(service: CanonicalServiceType): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(`${SERVER_SESSION_KEY_PREFIX}${service}`)
  } catch {
    return null
  }
}

export function getActiveServerDraftSessionId(
  service: CanonicalServiceType | string | null | undefined,
): string | null {
  const canonicalService = canonicalizeServiceType(service)
  if (!canonicalService) return null
  return getStoredSessionId(canonicalService)
}

function setStoredSessionId(service: CanonicalServiceType, sessionId: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${SERVER_SESSION_KEY_PREFIX}${service}`, sessionId)
  } catch {
    // Storage blocked - fall through, save still worked server-side.
  }
}

function clearStoredSessionId(service: CanonicalServiceType): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(`${SERVER_SESSION_KEY_PREFIX}${service}`)
  } catch {
    // ignore
  }
}

function createDraftSessionId(): string | null {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
  } catch {
    // fall through to server-generated id
  }
  return null
}

function getOrCreateStoredSessionId(service: CanonicalServiceType): string | null {
  const existing = getStoredSessionId(service)
  if (existing) return existing

  const generated = createDraftSessionId()
  if (!generated) return null

  setStoredSessionId(service, generated)
  return generated
}

/**
 * Upsert a draft on the server. Fire-and-forget. Returns the sessionId so
 * callers can persist it. Resolves to null on any failure.
 */
export async function saveServerDraft(payload: ServerDraftPayload): Promise<string | null> {
  if (typeof window === "undefined") return null

  const sessionId = getOrCreateStoredSessionId(payload.serviceType)

  try {
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        ...(sessionId ? { sessionId } : {}),
      }),
      cache: "no-store",
      keepalive: true, // Survive page unloads (mid-intake navigation)
    })

    if (!res.ok) return null
    const data = (await res.json()) as ServerDraftResponse
    if (data.sessionId) {
      setStoredSessionId(payload.serviceType, data.sessionId)
    }
    return data.sessionId ?? null
  } catch {
    return null
  }
}

/**
 * Read a draft by service type. Pulls the sessionId from localStorage and
 * fetches the latest from the server. Returns null if no draft exists, the
 * draft is expired, or the request fails.
 */
export async function getServerDraft(
  service: CanonicalServiceType,
): Promise<ServerDraftRecord | null> {
  if (typeof window === "undefined") return null

  const sessionId = getStoredSessionId(service)
  if (!sessionId) return null

  try {
    const res = await fetch(`/api/draft?id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
    if (res.status === 404) {
      // Server purged or expired - clean up localStorage
      clearStoredSessionId(service)
      return null
    }
    if (!res.ok) return null
    return (await res.json()) as ServerDraftRecord
  } catch {
    return null
  }
}

/**
 * Read a draft by an explicit sessionId. Used for "continue on another
 * device" deep-links where the sessionId is in the URL.
 */
export async function getServerDraftById(
  sessionId: string,
): Promise<ServerDraftRecord | null> {
  try {
    const res = await fetch(`/api/draft?id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as ServerDraftRecord
  } catch {
    return null
  }
}

/**
 * Delete the server draft. Called when the intake is realised (submitted)
 * or explicitly abandoned by the user.
 */
export async function deleteServerDraft(service: CanonicalServiceType): Promise<void> {
  if (typeof window === "undefined") return

  const sessionId = getStoredSessionId(service)
  if (!sessionId) return

  clearStoredSessionId(service)

  try {
    await fetch(`/api/draft?id=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      cache: "no-store",
      keepalive: true,
    })
  } catch {
    // ignore - row will eventually expire
  }
}

/**
 * Debounced wrapper. Use this in the persistence layer so we don't hammer
 * the API on every keystroke during a fast-typing user.
 */
const SAVE_DEBOUNCE_MS = 1500
const pendingTimers = new Map<CanonicalServiceType, ReturnType<typeof setTimeout>>()

export function saveServerDraftDebounced(payload: ServerDraftPayload): void {
  const existing = pendingTimers.get(payload.serviceType)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    pendingTimers.delete(payload.serviceType)
    void saveServerDraft(payload)
  }, SAVE_DEBOUNCE_MS)

  pendingTimers.set(payload.serviceType, timer)
}

/**
 * Flush a draft to the server IMMEDIATELY, bypassing the debounce. Call on
 * pagehide / visibilitychange-hidden: the debounced mirror would otherwise start
 * a fresh timer that dies with the page, losing the final state (e.g. a
 * just-typed recovery email) for cross-device resume + the recovery-email cron.
 * `sendBeacon` is guaranteed to be queued by the browser during unload;
 * keepalive fetch is the fallback. The response is not read during unload, so
 * first save paths create and persist a client UUID before sending. That keeps
 * duplicate unload signals (`visibilitychange` + `pagehide`) pointed at one row.
 */
export function flushServerDraft(payload: ServerDraftPayload): void {
  if (typeof window === "undefined") return

  // Cancel any pending debounced save — we're sending the current state now.
  const existing = pendingTimers.get(payload.serviceType)
  if (existing) {
    clearTimeout(existing)
    pendingTimers.delete(payload.serviceType)
  }

  const sessionId = getOrCreateStoredSessionId(payload.serviceType)
  const body = JSON.stringify({ ...payload, ...(sessionId ? { sessionId } : {}) })

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const queued = navigator.sendBeacon("/api/draft", new Blob([body], { type: "application/json" }))
      if (queued) return
    } catch {
      // fall through to keepalive fetch
    }
  }

  try {
    void fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
      keepalive: true,
    })
  } catch {
    // best effort — localStorage remains the source of truth for same-device.
  }
}

if (typeof window !== "undefined") {
  window.__instantmedFlushServerDraft = flushServerDraft
}
