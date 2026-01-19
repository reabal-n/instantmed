/**
 * AI Response Caching
 * 
 * Caches common AI queries to reduce API costs and improve latency.
 * Uses Redis for distributed caching.
 */

import { Redis } from '@upstash/redis'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('ai-cache')

/**
 * Generate SHA-256 hash using Web Crypto API (works in Edge runtime)
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

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
async function generateCacheKey(type: CacheType, input: string, context?: string): Promise<string> {
  const hash = await sha256(`${type}:${input}:${context || ''}`)
  return `ai:${type}:${hash.slice(0, 16)}`
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
    
    const key = await generateCacheKey(type, input, context)
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
    
    const key = await generateCacheKey(type, input, context)
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
    
    const key = await generateCacheKey(type, input, context)
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
