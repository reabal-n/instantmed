import "server-only"

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("rate-limit:resend-cert")

const isRedisConfigured = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

let limiter: Ratelimit | null = null

if (isRedisConfigured) {
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "24 h"),
    analytics: true,
    prefix: "ratelimit:resend-cert",
  })
}

/**
 * Rate limit certificate resend emails: 5 per intake per 24 hours.
 * Key is scoped to intake+patient so different patients can't exhaust each other's limits.
 */
export async function checkResendRateLimit(
  intakeId: string,
  patientId: string,
): Promise<{ allowed: boolean }> {
  if (!limiter) {
    // Redis not configured - fail open
    return { allowed: true }
  }

  try {
    const key = `${intakeId}:${patientId}`
    const result = await limiter.limit(key)
    if (!result.success) {
      logger.warn("Resend certificate rate limit exceeded", { intakeId, patientId })
    }
    return { allowed: result.success }
  } catch (err) {
    logger.error("Resend cert rate limit check failed", { error: err })
    // Fail open
    return { allowed: true }
  }
}
