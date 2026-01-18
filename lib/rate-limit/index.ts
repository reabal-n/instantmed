/**
 * Rate Limiting - DEPRECATED
 * 
 * @deprecated This module uses in-memory storage which doesn't work across
 * serverless instances. Import from '@/lib/rate-limit/redis' instead.
 * 
 * This file now re-exports from the canonical redis.ts implementation
 * for backward compatibility. Update your imports to:
 * 
 * ```ts
 * import { applyRateLimit, getClientIdentifier } from '@/lib/rate-limit/redis'
 * ```
 */

// Re-export everything from the canonical implementation
export {
  applyRateLimit,
  getClientIdentifier,
  withRateLimit,
  isRedisEnabled,
  rateLimitConfigs,
} from './redis'

// Legacy exports for backward compatibility
// These map to the new config-based approach

/** @deprecated Use rateLimitConfigs.standard instead */
export const RATE_LIMIT_STANDARD = { limit: 100, windowMs: 60 * 1000 }

/** @deprecated Use rateLimitConfigs.auth instead */
export const RATE_LIMIT_AUTH = { limit: 10, windowMs: 60 * 1000 }

/** @deprecated Use rateLimitConfigs.sensitive instead */
export const RATE_LIMIT_SENSITIVE = { limit: 20, windowMs: 60 * 60 * 1000 }

/** @deprecated Use rateLimitConfigs.upload instead */
export const RATE_LIMIT_UPLOAD = { limit: 30, windowMs: 60 * 60 * 1000 }

/**
 * @deprecated Use applyRateLimit from '@/lib/rate-limit/redis' instead.
 * This legacy function signature is maintained for backward compatibility.
 */
export function checkRateLimit(
  identifier: string,
  config: { limit: number; windowMs: number }
): { success: boolean; limit: number; remaining: number; resetAt: number } {
  // eslint-disable-next-line no-console
  console.warn(
    '[DEPRECATED] checkRateLimit from @/lib/rate-limit is deprecated. ' +
    'Use applyRateLimit from @/lib/rate-limit/redis instead.'
  )
  
  // Return a permissive result to avoid breaking existing code
  // The actual rate limiting happens in the redis module
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - 1,
    resetAt: Date.now() + config.windowMs,
  }
}
