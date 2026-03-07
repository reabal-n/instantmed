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
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}`
}
