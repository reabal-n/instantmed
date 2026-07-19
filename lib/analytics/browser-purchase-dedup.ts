const PURCHASE_COMPLETED_DEDUP_PREFIX = "instantmed_purchase_completed"
const PURCHASE_COMPLETED_DEDUP_TTL_MS = 24 * 60 * 60 * 1000

export function getBrowserPurchaseCompletedInsertId(): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replaceAll("-", "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

  return `ph_evt_${randomId}`
}

export function claimBrowserPurchaseCompleted(
  intakeId: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!intakeId) return false
  if (typeof window === "undefined") return true

  try {
    const key = `${PURCHASE_COMPLETED_DEDUP_PREFIX}:${intakeId}`
    const existing = window.localStorage.getItem(key)
    const trackedAt = existing ? Number(existing) : null
    if (
      trackedAt != null &&
      Number.isFinite(trackedAt) &&
      now - trackedAt < PURCHASE_COMPLETED_DEDUP_TTL_MS
    ) {
      return false
    }

    window.localStorage.setItem(key, String(now))
    return true
  } catch {
    return true
  }
}
