/**
 * In-Memory Rate Limiter Fallback
 * 
 * Provides a simple token bucket rate limiter for use when Upstash is unavailable.
 * This is a fallback only - not suitable for distributed systems.
 * 
 * Note: This only works per-instance. In a multi-instance deployment,
 * each instance will have its own bucket, effectively multiplying the limit.
 */

interface TokenBucket {
  tokens: number
  lastRefill: number
}

interface MemoryRateLimiterConfig {
  maxTokens: number      // Maximum tokens in bucket
  refillRate: number     // Tokens added per second
  windowMs: number       // Time window in milliseconds
}

const DEFAULT_CONFIG: MemoryRateLimiterConfig = {
  maxTokens: 100,
  refillRate: 1.67,      // ~100 tokens per 60 seconds
  windowMs: 60 * 1000,
}

// Per-IP buckets (cleared periodically to prevent memory leaks)
const buckets = new Map<string, TokenBucket>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000 // Clean up every 5 minutes
const BUCKET_TTL = 10 * 60 * 1000      // Remove buckets older than 10 minutes

/**
 * Clean up stale buckets to prevent memory leaks
 */
function cleanupBuckets(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  
  lastCleanup = now
  const cutoff = now - BUCKET_TTL
  
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.lastRefill < cutoff) {
      buckets.delete(key)
    }
  }
}

/**
 * Get or create a token bucket for an identifier
 */
function getBucket(identifier: string, config: MemoryRateLimiterConfig): TokenBucket {
  cleanupBuckets()
  
  let bucket = buckets.get(identifier)
  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: Date.now(),
    }
    buckets.set(identifier, bucket)
  }
  
  return bucket
}

/**
 * Refill tokens based on elapsed time
 */
function refillBucket(bucket: TokenBucket, config: MemoryRateLimiterConfig): void {
  const now = Date.now()
  const elapsed = (now - bucket.lastRefill) / 1000 // seconds
  const tokensToAdd = elapsed * config.refillRate
  
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd)
  bucket.lastRefill = now
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit using in-memory token bucket
 * Returns result compatible with Upstash rate limiter
 */
export function checkMemoryRateLimit(
  identifier: string,
  config: MemoryRateLimiterConfig = DEFAULT_CONFIG
): RateLimitResult {
  const bucket = getBucket(identifier, config)
  refillBucket(bucket, config)
  
  const success = bucket.tokens >= 1
  
  if (success) {
    bucket.tokens -= 1
  }
  
  return {
    success,
    limit: config.maxTokens,
    remaining: Math.floor(bucket.tokens),
    reset: Date.now() + config.windowMs,
  }
}

/**
 * Create a memory rate limiter with custom config
 */
export function createMemoryRateLimiter(config: Partial<MemoryRateLimiterConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  return {
    limit: (identifier: string) => checkMemoryRateLimit(identifier, finalConfig),
  }
}

// Pre-configured limiters for different use cases
export const memoryRateLimiters = {
  // General API: 100 requests per 60 seconds
  global: createMemoryRateLimiter({ maxTokens: 100, refillRate: 1.67 }),
  
  // Auth endpoints: 5 requests per 60 seconds
  auth: createMemoryRateLimiter({ maxTokens: 5, refillRate: 0.083 }),
  
  // AI endpoints: 10 requests per 60 seconds
  ai: createMemoryRateLimiter({ maxTokens: 10, refillRate: 0.167 }),
  
  // Checkout: 5 requests per 60 seconds
  checkout: createMemoryRateLimiter({ maxTokens: 5, refillRate: 0.083 }),
}
