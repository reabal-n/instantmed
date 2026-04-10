import "server-only"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("email-warmup")

// Progressive warmup schedule (daily send limits)
// Override with DAILY_EMAIL_LIMIT env var to set a fixed cap, or 0 to disable.
//
// LAUNCH NOTE: Default of 200/day is for domain warmup. At launch, set
// DAILY_EMAIL_LIMIT=0 in production to disable the cap. Transactional +
// lifecycle + marketing emails will easily exceed 200/day on day one.
// Re-enable with a higher cap only if Resend flags deliverability issues.
const DEFAULT_DAILY_LIMIT = 200

/**
 * Check if we're within the daily send limit.
 * Uses Upstash Redis for atomic counting.
 * Falls back to allowing sends if Redis is unavailable.
 */
export async function checkDailySendLimit(): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = parseInt(process.env.DAILY_EMAIL_LIMIT || "", 10)
  const dailyLimit = isNaN(limit) ? DEFAULT_DAILY_LIMIT : limit

  // 0 = no limit (warmup complete)
  if (dailyLimit === 0) {
    return { allowed: true, current: 0, limit: 0 }
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { allowed: true, current: 0, limit: dailyLimit }
  }

  try {
    const { Redis } = await import("@upstash/redis")
    const redis = Redis.fromEnv()

    // Key resets daily at midnight UTC
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const key = `email:daily_count:${today}`

    const current = await redis.get<number>(key) || 0

    if (current >= dailyLimit) {
      logger.warn("Daily email send limit reached", { current, limit: dailyLimit })
      return { allowed: false, current, limit: dailyLimit }
    }

    return { allowed: true, current, limit: dailyLimit }
  } catch (error) {
    logger.error("Failed to check daily send limit", { error })
    return { allowed: true, current: 0, limit: dailyLimit } // Fail open
  }
}

/**
 * Increment the daily send counter after a successful send.
 */
export async function incrementDailySendCount(): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return

  try {
    const { Redis } = await import("@upstash/redis")
    const redis = Redis.fromEnv()

    const today = new Date().toISOString().slice(0, 10)
    const key = `email:daily_count:${today}`

    const pipeline = redis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, 86400 * 2) // 2-day TTL for safety
    await pipeline.exec()
  } catch {
    // Non-blocking
  }
}
