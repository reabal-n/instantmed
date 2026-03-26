/**
 * Generate a unique idempotency key for checkout requests
 * This prevents duplicate intake creation on double-click or network retry
 */
export function generateIdempotencyKey(): string {
  // Use crypto.randomUUID if available (modern browsers), fallback to timestamp + random
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for older environments
  const timestamp = Date.now().toString(36)
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const randomPart = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${timestamp}-${randomPart}`
}
