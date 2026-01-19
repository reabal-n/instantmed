/**
 * AI Response Caching
 * 
 * Caches common AI queries to reduce API costs and improve latency.
 * Uses Redis for distributed caching.
 */

import { Redis } from '@upstash/redis'
import { createLogger } from '@/lib/observability/logger'
import crypto from 'crypto'

const log = createLogger('ai-cache')

// Cache TTLs in seconds
const CACHE_TTL = {
  symptomSuggestions: 60 * 60 * 24, // 24 hours - suggestions are stable
  medicationFuzzy: 60 * 60 * 24 * 7, // 7 days - medication names don't change
  reviewSummary: 60 * 5, // 5 minutes - request data may update
}

type CacheType = keyof typeof CACHE_TTL

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  }
  return redis
}

/**
 * Generate cache key from input
 */
function generateCacheKey(type: CacheType, input: string, context?: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${type}:${input}:${context || ''}`)
    .digest('hex')
    .slice(0, 16)
  
  return `ai:${type}:${hash}`
}

/**
 * Get cached AI response
 */
export async function getCachedResponse<T>(
  type: CacheType,
  input: string,
  context?: string
): Promise<T | null> {
  try {
    const client = getRedis()
    if (!client) return null
    
    const key = generateCacheKey(type, input, context)
    const cached = await client.get<T>(key)
    
    if (cached) {
      log.debug('AI cache hit', { type, key })
      return cached
    }
    
    return null
  } catch (error) {
    log.warn('AI cache get error', { error, type })
    return null
  }
}

/**
 * Cache AI response
 */
export async function setCachedResponse<T>(
  type: CacheType,
  input: string,
  response: T,
  context?: string
): Promise<void> {
  try {
    const client = getRedis()
    if (!client) return
    
    const key = generateCacheKey(type, input, context)
    const ttl = CACHE_TTL[type]
    
    await client.set(key, response, { ex: ttl })
    log.debug('AI cache set', { type, key, ttl })
  } catch (error) {
    log.warn('AI cache set error', { error, type })
  }
}

/**
 * Invalidate cache for a specific type and input
 */
export async function invalidateCache(
  type: CacheType,
  input: string,
  context?: string
): Promise<void> {
  try {
    const client = getRedis()
    if (!client) return
    
    const key = generateCacheKey(type, input, context)
    await client.del(key)
    log.debug('AI cache invalidated', { type, key })
  } catch (error) {
    log.warn('AI cache invalidate error', { error, type })
  }
}

/**
 * Get cache stats for monitoring
 */
export async function getCacheStats(): Promise<{
  connected: boolean
  keys?: number
}> {
  try {
    const client = getRedis()
    if (!client) return { connected: false }
    
    // Ping to check connection
    await client.ping()
    
    return { connected: true }
  } catch {
    return { connected: false }
  }
}
