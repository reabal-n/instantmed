/**
 * Lightweight prefetch cache for review-data API responses.
 *
 * QueueTable warms the cache on row hover; IntakeReviewPanel
 * consumes from it on mount so the fetch feels instant.
 *
 * Entries auto-expire after 30s to prevent stale reads, and
 * consumePrefetchedData removes the entry so it's never reused.
 */

interface CacheEntry {
  promise: Promise<Response>
  timestamp: number
}

const CACHE_TTL_MS = 30_000
const cache = new Map<string, CacheEntry>()

/**
 * Fire a prefetch for the given intake's review data.
 * No-ops if a recent prefetch already exists.
 */
export function prefetchReviewData(intakeId: string): void {
  const existing = cache.get(intakeId)
  if (existing && Date.now() - existing.timestamp < CACHE_TTL_MS) return

  const promise = fetch(`/api/doctor/intakes/${intakeId}/review-data`)
  cache.set(intakeId, { promise, timestamp: Date.now() })

  // Garbage-collect after TTL so the map doesn't grow unbounded
  setTimeout(() => {
    const entry = cache.get(intakeId)
    if (entry && Date.now() - entry.timestamp >= CACHE_TTL_MS) {
      cache.delete(intakeId)
    }
  }, CACHE_TTL_MS + 1000)
}

/**
 * Consume a prefetched response if one exists and is still fresh.
 * Returns the Response promise, or null if nothing was cached.
 * The entry is removed from the cache after consumption.
 */
export function consumePrefetchedData(intakeId: string): Promise<Response> | null {
  const entry = cache.get(intakeId)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(intakeId)
    return null
  }
  cache.delete(intakeId)
  return entry.promise
}
