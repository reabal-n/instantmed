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

import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"
import {
  isDraftFlowRetired,
  retireDraftFlow,
} from "@/lib/request/draft-retirement"

import { canonicalizeServiceType, type CanonicalServiceType } from "./draft-storage"

const SERVER_SESSION_KEY_PREFIX = "instantmed-server-draft-"
const SERVER_FLOW_INSTANCE_KEY_PREFIX = "instantmed-server-draft-flow-"
const PENDING_DISCARD_KEY_PREFIX = "instantmed-server-draft-discard-pending-v1:"
const SERVER_DRAFT_SESSION_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SAVE_DEBOUNCE_MS = 1500
const PENDING_DISCARD_QUEUE_LIMIT = 8
const PENDING_DISCARD_RETENTION_MS = 8 * 24 * 60 * 60 * 1000
const PENDING_DISCARD_RETRY_OFFSETS_MS = [
  2_000,
  12_000,
  72_000,
  6 * 60_000 + 12_000,
  20 * 60_000,
  35 * 60_000,
  48 * 60_000,
  55 * 60_000,
] as const
const PENDING_DISCARD_FETCH_TIMEOUT_MS = 7_000
type ServerDraftDiscardResult = "discarded" | "flow_conflict" | "retry"
const pendingTimers = new Map<CanonicalServiceType, ReturnType<typeof setTimeout>>()
const pendingDiscardRequests = new Map<string, Promise<ServerDraftDiscardResult>>()
const pendingDiscardRetryTimers = new Map<string, ReturnType<typeof setTimeout>>()

interface PendingDiscardMarker {
  v: 1
  serviceType: CanonicalServiceType
  requestedAt: string
  flowInstanceId?: string
}

interface StoredPendingDiscard extends PendingDiscardMarker {
  sessionId: string
}

interface ServerDraftPayload {
  serviceType: CanonicalServiceType
  flowInstanceId?: string
  currentStepId?: string
  answers?: Record<string, unknown>
  identity?: {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    dob?: string
  }
}

interface ServerDraftResponse {
  sessionId: string
  expiresAt: string
  updatedAt: string
}

export interface ServerDraftRecord {
  sessionId: string
  serviceType: CanonicalServiceType
  flowInstanceId?: string | null
  currentStepId: string | null
  answers: Record<string, unknown>
  identity: {
    email: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    dob: string | null
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

function getStoredFlowInstanceId(service: CanonicalServiceType): string | null {
  if (typeof window === "undefined") return null
  try {
    return normalizeFlowInstanceId(
      localStorage.getItem(`${SERVER_FLOW_INSTANCE_KEY_PREFIX}${service}`),
    )
  } catch {
    return null
  }
}

export function getActiveServerDraftSessionId(
  service: CanonicalServiceType | string | null | undefined,
  flowInstanceId?: string | null,
): string | null {
  const canonicalService = canonicalizeServiceType(service)
  if (!canonicalService) return null
  const sessionId = getStoredSessionId(canonicalService)
  if (!sessionId || hasPendingDiscard(sessionId)) return null

  const normalizedFlowInstanceId = normalizeFlowInstanceId(flowInstanceId)
  if (
    normalizedFlowInstanceId &&
    getStoredFlowInstanceId(canonicalService) !== normalizedFlowInstanceId
  ) {
    return null
  }
  if (
    normalizedFlowInstanceId &&
    (hasPendingDiscardFlow(normalizedFlowInstanceId) ||
      isDraftFlowRetired(normalizedFlowInstanceId))
  ) {
    return null
  }
  return sessionId
}

function setStoredSessionId(service: CanonicalServiceType, sessionId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(`${SERVER_SESSION_KEY_PREFIX}${service}`, sessionId)
    return true
  } catch {
    // Storage blocked - fall through, save still worked server-side.
    return false
  }
}

function setStoredFlowInstanceId(
  service: CanonicalServiceType,
  flowInstanceId: string | null | undefined,
): boolean {
  const normalized = normalizeFlowInstanceId(flowInstanceId)
  if (typeof window === "undefined" || !normalized) return false

  try {
    localStorage.setItem(`${SERVER_FLOW_INSTANCE_KEY_PREFIX}${service}`, normalized)
    return true
  } catch {
    return false
  }
}

function clearStoredFlowInstanceId(service: CanonicalServiceType): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(`${SERVER_FLOW_INSTANCE_KEY_PREFIX}${service}`)
  } catch {
    // ignore
  }
}

/**
 * Adopt a server draft after it has been fetched and validated by the API.
 * Later saves then upsert the same bearer-token session instead of forking it.
 */
export function adoptServerDraftSession(
  record: Pick<ServerDraftRecord, "sessionId" | "serviceType"> &
    Partial<Pick<ServerDraftRecord, "flowInstanceId">>,
): boolean {
  const canonicalService = canonicalizeServiceType(record.serviceType)
  if (
    !SERVER_DRAFT_SESSION_ID_REGEX.test(record.sessionId) ||
    !canonicalService ||
    canonicalService !== record.serviceType ||
    hasPendingDiscard(record.sessionId) ||
    hasPendingDiscardFlow(record.flowInstanceId) ||
    isDraftFlowRetired(record.flowInstanceId)
  ) {
    return false
  }

  const adopted = setStoredSessionId(canonicalService, record.sessionId)
  if (adopted) {
    if (record.flowInstanceId) {
      setStoredFlowInstanceId(canonicalService, record.flowInstanceId)
    } else {
      // Never pair a newly adopted legacy bearer with a stale flow key left by
      // earlier same-service work. RequestFlow normally coordinates a fresh
      // flow before adoption; this keeps the lower-level helper safe too.
      clearStoredFlowInstanceId(canonicalService)
    }
  }
  return adopted
}

function clearStoredSessionId(service: CanonicalServiceType): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(`${SERVER_SESSION_KEY_PREFIX}${service}`)
    localStorage.removeItem(`${SERVER_FLOW_INSTANCE_KEY_PREFIX}${service}`)
  } catch {
    // ignore
  }
}

function clearStoredSessionIdIfMatches(
  service: CanonicalServiceType,
  sessionId: string,
): void {
  if (getStoredSessionId(service) === sessionId) {
    clearStoredSessionId(service)
  }
}

function clearStoredSessionIdIfMatchesFlow(
  service: CanonicalServiceType,
  sessionId: string,
  flowInstanceId: string | null | undefined,
): void {
  if (getStoredSessionId(service) !== sessionId) return

  const normalized = normalizeFlowInstanceId(flowInstanceId)
  const storedFlowInstanceId = getStoredFlowInstanceId(service)
  if (
    (normalized && storedFlowInstanceId !== normalized) ||
    (!normalized && storedFlowInstanceId)
  ) {
    return
  }
  clearStoredSessionId(service)
}

function pendingDiscardKey(sessionId: string): string {
  return `${PENDING_DISCARD_KEY_PREFIX}${sessionId}`
}

function getPendingDiscardMarkers(): StoredPendingDiscard[] {
  if (typeof window === "undefined") return []

  try {
    const keys: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(PENDING_DISCARD_KEY_PREFIX)) {
        keys.push(key)
      }
    }

    const now = Date.now()
    const markers: StoredPendingDiscard[] = []

    for (const key of keys) {
      const sessionId = key.slice(PENDING_DISCARD_KEY_PREFIX.length)
      const raw = localStorage.getItem(key)
      let marker: PendingDiscardMarker | null = null

      try {
        marker = raw ? JSON.parse(raw) as PendingDiscardMarker : null
      } catch {
        marker = null
      }

      const requestedAt = marker ? Date.parse(marker.requestedAt) : Number.NaN
      const canonicalService = marker
        ? canonicalizeServiceType(marker.serviceType)
        : null
      const valid =
        SERVER_DRAFT_SESSION_ID_REGEX.test(sessionId) &&
        marker?.v === 1 &&
        canonicalService === marker.serviceType &&
        Number.isFinite(requestedAt)
      const expired = valid && now - requestedAt >= PENDING_DISCARD_RETENTION_MS

      if (!marker || !valid || expired) {
        localStorage.removeItem(key)
        continue
      }

      markers.push({
        v: 1,
        serviceType: marker.serviceType,
        requestedAt: marker.requestedAt,
        ...(normalizeFlowInstanceId(marker.flowInstanceId)
          ? { flowInstanceId: normalizeFlowInstanceId(marker.flowInstanceId) ?? undefined }
          : {}),
        sessionId,
      })
    }

    return markers
  } catch {
    return []
  }
}

function hasPendingDiscard(sessionId: string): boolean {
  return getPendingDiscardMarkers().some((marker) => marker.sessionId === sessionId)
}

function hasPendingDiscardFlow(flowInstanceId: string | null | undefined): boolean {
  const normalized = normalizeFlowInstanceId(flowInstanceId)
  if (!normalized) return false
  return getPendingDiscardMarkers().some(
    (marker) => marker.flowInstanceId === normalized,
  )
}

function enqueuePendingDiscard(
  service: CanonicalServiceType,
  sessionId: string,
  flowInstanceId?: string | null,
): boolean {
  if (typeof window === "undefined") return false
  const normalizedFlowInstanceId = normalizeFlowInstanceId(flowInstanceId)
  if (normalizedFlowInstanceId) {
    retireDraftFlow(service, normalizedFlowInstanceId)
  }
  const existing = getPendingDiscardMarkers().find(
    (marker) => marker.sessionId === sessionId,
  )
  if (existing) {
    if (!existing.flowInstanceId && normalizedFlowInstanceId) {
      try {
        localStorage.setItem(pendingDiscardKey(sessionId), JSON.stringify({
          v: 1,
          serviceType: existing.serviceType,
          requestedAt: existing.requestedAt,
          flowInstanceId: normalizedFlowInstanceId,
        } satisfies PendingDiscardMarker))
      } catch {
        // The session marker remains valid; the server can still derive flow
        // from its row when storage refuses this one-way enrichment.
      }
    }
    return hasPendingDiscard(sessionId)
  }

  try {
    const marker: PendingDiscardMarker = {
      v: 1,
      serviceType: service,
      requestedAt: new Date().toISOString(),
      ...(normalizedFlowInstanceId
        ? { flowInstanceId: normalizedFlowInstanceId }
        : {}),
    }
    localStorage.setItem(pendingDiscardKey(sessionId), JSON.stringify(marker))
    return hasPendingDiscard(sessionId)
  } catch {
    return false
  }
}

function removePendingDiscard(sessionId: string): boolean {
  if (typeof window === "undefined") return false

  try {
    localStorage.removeItem(pendingDiscardKey(sessionId))
    return localStorage.getItem(pendingDiscardKey(sessionId)) === null
  } catch {
    return false
  }
}

function clearScheduledPendingDiscardRetry(sessionId: string): void {
  const timer = pendingDiscardRetryTimers.get(sessionId)
  if (timer) clearTimeout(timer)
  pendingDiscardRetryTimers.delete(sessionId)
}

function schedulePendingDiscardRetry(sessionId: string): void {
  const marker = getPendingDiscardMarkers().find(
    (candidate) => candidate.sessionId === sessionId,
  )
  if (!marker) {
    clearScheduledPendingDiscardRetry(sessionId)
    return
  }
  if (pendingDiscardRetryTimers.has(sessionId)) return

  // Targets are absolute from the durable marker timestamp, so response time
  // does not accumulate through the ladder. A reload at minute 30 schedules
  // the next future target rather than replaying every missed attempt.
  const requestedAt = Date.parse(marker.requestedAt)
  const elapsed = Math.max(0, Date.now() - requestedAt)
  const nextOffset = PENDING_DISCARD_RETRY_OFFSETS_MS.find(
    (offset) => offset > elapsed,
  )
  if (nextOffset === undefined) return
  const delay = nextOffset - elapsed

  const timer = setTimeout(() => {
    pendingDiscardRetryTimers.delete(sessionId)
    void retryPendingDiscardMarker(sessionId)
  }, delay)
  pendingDiscardRetryTimers.set(sessionId, timer)

  // Vitest runs this browser module in Node. Do not let privacy retry timers
  // keep a completed test worker alive; browsers simply lack this method.
  const nodeTimer = timer as ReturnType<typeof setTimeout> & { unref?: () => void }
  nodeTimer.unref?.()
}

function discardServerDraftSession(
  sessionId: string,
  flowInstanceId?: string | null,
): Promise<ServerDraftDiscardResult> {
  const existing = pendingDiscardRequests.get(sessionId)
  if (existing) return existing

  const request = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      PENDING_DISCARD_FETCH_TIMEOUT_MS,
    )
    const nodeTimeout = timeout as ReturnType<typeof setTimeout> & {
      unref?: () => void
    }
    nodeTimeout.unref?.()
    try {
      const normalizedFlowInstanceId = normalizeFlowInstanceId(flowInstanceId)
      const params = new URLSearchParams({ id: sessionId })
      if (normalizedFlowInstanceId) params.set("flow", normalizedFlowInstanceId)
      const res = await fetch(`/api/draft?${params.toString()}`, {
        method: "DELETE",
        cache: "no-store",
        keepalive: true,
        signal: controller.signal,
      })
      if (res.ok) return "discarded"
      // The server found that this bearer belongs to another flow. That is a
      // terminal result for this stale marker, not a transient deletion error.
      if (res.status === 409) return "flow_conflict"
      return "retry"
    } catch {
      return "retry"
    } finally {
      clearTimeout(timeout)
    }
  })()

  pendingDiscardRequests.set(sessionId, request)
  void request.then(() => {
    if (pendingDiscardRequests.get(sessionId) === request) {
      pendingDiscardRequests.delete(sessionId)
    }
  })
  return request
}

async function retryPendingDiscardMarker(sessionId: string): Promise<number> {
  const marker = getPendingDiscardMarkers().find(
    (candidate) => candidate.sessionId === sessionId,
  )
  if (!marker) {
    clearScheduledPendingDiscardRetry(sessionId)
    return 0
  }

  const discardResult = await discardServerDraftSession(
    sessionId,
    marker.flowInstanceId,
  )
  if (discardResult === "retry") {
    schedulePendingDiscardRetry(sessionId)
    return 0
  }

  // The RPC is idempotent. If marker removal is blocked, retain it and let a
  // later retry run rather than forgetting the only durable deletion handle.
  if (!removePendingDiscard(sessionId)) {
    schedulePendingDiscardRetry(sessionId)
    return 0
  }

  clearScheduledPendingDiscardRetry(sessionId)
  return 1
}

/**
 * Retry PHI-free discard markers after a transient API failure. Called once
 * when this client module loads and again whenever the browser comes online.
 */
export async function retryPendingServerDraftDiscards(
  service?: CanonicalServiceType,
): Promise<number> {
  if (typeof window === "undefined") return 0

  const markers = getPendingDiscardMarkers().filter(
    (marker) => !service || marker.serviceType === service,
  )
  const results = await Promise.all(
    markers.map(({ sessionId }) => retryPendingDiscardMarker(sessionId)),
  )
  return results.reduce<number>((total, count) => total + count, 0)
}

export function resetServerDraftClientStateForTests(): void {
  if (process.env.NODE_ENV !== "test") return

  for (const timer of pendingTimers.values()) clearTimeout(timer)
  for (const timer of pendingDiscardRetryTimers.values()) clearTimeout(timer)
  pendingTimers.clear()
  pendingDiscardRequests.clear()
  pendingDiscardRetryTimers.clear()
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

function getOrCreateStoredSessionId(
  service: CanonicalServiceType,
  flowInstanceId?: string | null,
): string | null {
  const existing = getStoredSessionId(service)
  if (
    hasPendingDiscardFlow(flowInstanceId) ||
    isDraftFlowRetired(flowInstanceId)
  ) {
    return null
  }
  const normalizedFlowInstanceId = normalizeFlowInstanceId(flowInstanceId)
  const storedFlowInstanceId = getStoredFlowInstanceId(service)
  if (
    existing &&
    normalizedFlowInstanceId &&
    storedFlowInstanceId &&
    storedFlowInstanceId !== normalizedFlowInstanceId
  ) {
    // Two tabs cannot share one service bearer across distinct attempt IDs.
    // Keep the established active flow authoritative and leave this tab local-only.
    return null
  }
  if (existing) {
    if (hasPendingDiscard(existing)) {
      clearStoredSessionIdIfMatches(service, existing)
      return null
    }
    return existing
  }

  // Never issue an unbounded stream of server-side PHI mirrors while deletion
  // is offline. Same-device local recovery continues until pending discards
  // drain on a later load or reconnect.
  if (getPendingDiscardMarkers().length >= PENDING_DISCARD_QUEUE_LIMIT) {
    return null
  }

  const generated = createDraftSessionId()
  if (!generated) return null

  // A server draft without a durable client handle is unreachable and cannot
  // be explicitly discarded. Keep same-device local recovery only when
  // storage is unavailable instead of creating an orphaned PHI row.
  return setStoredSessionId(service, generated) ? generated : null
}

/**
 * Upsert a draft on the server. Fire-and-forget. Returns the sessionId so
 * callers can persist it. Resolves to null on any failure.
 */
export async function saveServerDraft(payload: ServerDraftPayload): Promise<string | null> {
  if (typeof window === "undefined") return null

  const sessionId = getOrCreateStoredSessionId(
    payload.serviceType,
    payload.flowInstanceId,
  )
  if (!sessionId) return null
  setStoredFlowInstanceId(payload.serviceType, payload.flowInstanceId)

  try {
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        sessionId,
      }),
      cache: "no-store",
      keepalive: true, // Survive page unloads (mid-intake navigation)
    })

    if (!res.ok) {
      if (res.status === 409) {
        clearStoredSessionIdIfMatchesFlow(
          payload.serviceType,
          sessionId,
          payload.flowInstanceId,
        )
      } else if (res.status === 410) {
        retireDraftFlow(payload.serviceType, payload.flowInstanceId)
        clearStoredSessionIdIfMatchesFlow(
          payload.serviceType,
          sessionId,
          payload.flowInstanceId,
        )
      }
      return null
    }
    const data = (await res.json()) as ServerDraftResponse
    // A response from a pre-discard request must never re-adopt its retired
    // bearer token or overwrite a new session started in the meantime.
    if (
      data.sessionId === sessionId &&
      getStoredSessionId(payload.serviceType) === sessionId &&
      !hasPendingDiscard(sessionId)
    ) {
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
  if (hasPendingDiscard(sessionId)) {
    clearStoredSessionIdIfMatches(service, sessionId)
    return null
  }

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
  if (hasPendingDiscard(sessionId)) return null

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
export async function deleteServerDraft(
  service: CanonicalServiceType,
  flowInstanceId?: string | null,
): Promise<boolean> {
  if (typeof window === "undefined") return false

  // Explicit discard wins over a queued mirror write. Without this, the
  // trailing save can recreate the row immediately after DELETE and later
  // trigger a stale recovery email.
  const pendingSave = pendingTimers.get(service)
  if (pendingSave) {
    clearTimeout(pendingSave)
    pendingTimers.delete(service)
  }

  const explicitFlowInstanceId = normalizeFlowInstanceId(flowInstanceId)
  const storedFlowInstanceId = getStoredFlowInstanceId(service)
  if (
    explicitFlowInstanceId &&
    storedFlowInstanceId &&
    explicitFlowInstanceId !== storedFlowInstanceId
  ) {
    // A stale tab may ask to discard F after another tab has started G under
    // the shared service key. Retire only F locally; B/G remains untouched.
    retireDraftFlow(service, explicitFlowInstanceId)
    return true
  }

  const sessionId = getStoredSessionId(service)
  if (!sessionId) {
    await retryPendingServerDraftDiscards(service)
    return !getPendingDiscardMarkers().some((marker) => marker.serviceType === service)
  }

  const resolvedFlowInstanceId =
    explicitFlowInstanceId ?? storedFlowInstanceId
  if (resolvedFlowInstanceId) {
    retireDraftFlow(service, resolvedFlowInstanceId)
  }

  if (enqueuePendingDiscard(service, sessionId, resolvedFlowInstanceId)) {
    // Stop this bearer being restored or reused immediately. Its deletion
    // handle remains durable in the pending queue until the API confirms 2xx.
    clearStoredSessionIdIfMatches(service, sessionId)
    await retryPendingServerDraftDiscards(service)
    return !hasPendingDiscard(sessionId)
  }

  // If localStorage cannot persist another marker, retain the active bearer
  // and clear it only after a confirmed direct deletion.
  const discardResult = await discardServerDraftSession(
    sessionId,
    resolvedFlowInstanceId,
  )
  const terminal = discardResult !== "retry"
  if (terminal) {
    clearStoredSessionIdIfMatchesFlow(
      service,
      sessionId,
      resolvedFlowInstanceId,
    )
  }
  return terminal
}

/**
 * Debounced wrapper. Use this in the persistence layer so we don't hammer
 * the API on every keystroke during a fast-typing user.
 */
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

  const sessionId = getOrCreateStoredSessionId(
    payload.serviceType,
    payload.flowInstanceId,
  )
  if (!sessionId) return
  setStoredFlowInstanceId(payload.serviceType, payload.flowInstanceId)
  const body = JSON.stringify({ ...payload, sessionId })

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
