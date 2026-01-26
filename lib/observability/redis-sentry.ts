/**
 * Redis/Upstash Sentry Integration
 * 
 * Captures Redis failures as Sentry warnings for observability
 * without breaking application flow.
 */

import * as Sentry from "@sentry/nextjs"

export type RedisOperation = "get" | "set" | "del" | "ping" | "lock" | "unlock" | "limit"

export interface RedisErrorContext {
  operation: RedisOperation
  keyPrefix: string // NOT the full key - just the prefix (e.g., "ai:cache", "ratelimit")
  subsystem: "ai_cache" | "rate_limit" | "email" | "cron_lock"
}

/**
 * Capture a Redis failure to Sentry as a warning.
 * 
 * @param error - The error that occurred
 * @param context - Context about the operation
 */
export function captureRedisWarning(
  error: unknown,
  context: RedisErrorContext
): void {
  const isPlaywright = process.env.PLAYWRIGHT === "1"

  // Extract safe error info
  const errorName = error instanceof Error ? error.name : "UnknownError"
  const errorMessage = error instanceof Error ? error.message : String(error)

  Sentry.captureMessage(`Redis ${context.operation} failed`, {
    level: "warning",
    tags: {
      subsystem: "redis",
      redis_subsystem: context.subsystem,
      operation: context.operation,
      key_prefix: context.keyPrefix,
      ...(isPlaywright && { playwright: "1" }),
    },
    extra: {
      error_name: errorName,
      error_message: errorMessage,
      // Do NOT include full keys or values - could contain sensitive data
    },
  })

  // Log for E2E verification
  if (isPlaywright) {
    // eslint-disable-next-line no-console
    console.warn(
      `[SENTRY_REDIS] ${context.subsystem}:${context.operation} failed - ${errorName}: ${errorMessage}`
    )
  }
}

/**
 * Wrap a Redis operation with Sentry error capture.
 * Errors are captured but NOT rethrown - allows graceful degradation.
 */
export async function withRedisCapture<T>(
  operation: () => Promise<T>,
  context: RedisErrorContext,
  fallback: T
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    captureRedisWarning(error, context)
    return fallback
  }
}
