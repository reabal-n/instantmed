import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"

const RETIRED_DRAFT_FLOW_KEY_PREFIX = "instantmed-draft-retired-flow-v1:"
const RETIRED_DRAFT_FLOW_RETENTION_MS = 8 * 24 * 60 * 60 * 1000
const VALID_SERVICES = new Set(["med-cert", "prescription", "consult"])

/**
 * `storage` only notifies other documents. This event lets a mounted request
 * flow observe a retirement created by its own draft-save response (for
 * example, a database discard fence returning 410) without exposing the draft
 * bearer or any clinical data.
 */
export const DRAFT_FLOW_RETIRED_EVENT = "instantmed:draft-flow-retired"

interface RetiredDraftFlowMarker {
  v: 1
  serviceType: "med-cert" | "prescription" | "consult"
  retiredAt: string
}

function retiredFlowKey(flowInstanceId: string): string {
  return `${RETIRED_DRAFT_FLOW_KEY_PREFIX}${flowInstanceId}`
}

function notifyCurrentDocumentOfDraftRetirement(): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  ) return

  // Defer until the current lifecycle operation completes. An intentional
  // same-document Start over synchronously rotates to a new flow, while a 410
  // leaves the retired flow active and must therefore trip RequestFlow's
  // terminal guard.
  queueMicrotask(() => {
    window.dispatchEvent(new Event(DRAFT_FLOW_RETIRED_EVENT))
  })
}

export function getRetiredDraftFlowIdFromStorageKey(
  storageKey: string | null,
): string | null {
  if (!storageKey?.startsWith(RETIRED_DRAFT_FLOW_KEY_PREFIX)) return null
  return normalizeFlowInstanceId(
    storageKey.slice(RETIRED_DRAFT_FLOW_KEY_PREFIX.length),
  )
}

function readValidMarker(flowInstanceId: string): RetiredDraftFlowMarker | null {
  if (typeof localStorage === "undefined") return null

  const key = retiredFlowKey(flowInstanceId)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const marker = JSON.parse(raw) as Partial<RetiredDraftFlowMarker>
    const retiredAt = typeof marker.retiredAt === "string"
      ? Date.parse(marker.retiredAt)
      : Number.NaN
    const valid =
      marker.v === 1 &&
      typeof marker.serviceType === "string" &&
      VALID_SERVICES.has(marker.serviceType) &&
      Number.isFinite(retiredAt)

    if (!valid || Date.now() - retiredAt >= RETIRED_DRAFT_FLOW_RETENTION_MS) {
      localStorage.removeItem(key)
      return null
    }

    return marker as RetiredDraftFlowMarker
  } catch {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore storage failures; callers will remain local-only when possible.
    }
    return null
  }
}

export function isDraftFlowRetired(
  flowInstanceId: string | null | undefined,
): boolean {
  const normalized = normalizeFlowInstanceId(flowInstanceId)
  return Boolean(normalized && readValidMarker(normalized))
}

export function retireDraftFlow(
  serviceType: "med-cert" | "prescription" | "consult",
  flowInstanceId: string | null | undefined,
): boolean {
  const normalized = normalizeFlowInstanceId(flowInstanceId)
  if (!normalized || typeof localStorage === "undefined") return false
  if (readValidMarker(normalized)) {
    notifyCurrentDocumentOfDraftRetirement()
    return true
  }

  try {
    const marker: RetiredDraftFlowMarker = {
      v: 1,
      serviceType,
      retiredAt: new Date().toISOString(),
    }
    localStorage.setItem(retiredFlowKey(normalized), JSON.stringify(marker))
    const retired = isDraftFlowRetired(normalized)
    if (retired) notifyCurrentDocumentOfDraftRetirement()
    return retired
  } catch {
    return false
  }
}

export function pruneExpiredRetiredDraftFlows(): void {
  if (typeof localStorage === "undefined") return

  try {
    const flowIds: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(RETIRED_DRAFT_FLOW_KEY_PREFIX)) {
        flowIds.push(key.slice(RETIRED_DRAFT_FLOW_KEY_PREFIX.length))
      }
    }
    for (const flowId of flowIds) {
      const normalized = normalizeFlowInstanceId(flowId)
      if (!normalized) {
        localStorage.removeItem(`${RETIRED_DRAFT_FLOW_KEY_PREFIX}${flowId}`)
      } else {
        readValidMarker(normalized)
      }
    }
  } catch {
    // Storage may be unavailable in hardened/private browser contexts.
  }
}
