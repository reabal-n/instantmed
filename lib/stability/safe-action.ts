/**
 * Safe Server Action Wrapper
 * 
 * Wraps server actions with consistent error handling,
 * timeout protection, and Sentry reporting.
 */

import * as Sentry from "@sentry/nextjs"

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export interface SafeActionOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Custom error message for users */
  userMessage?: string
  /** Additional context for Sentry */
  context?: Record<string, unknown>
}

/**
 * Wrap an async function with error handling and timeout
 * 
 * @example
 * export async function approveIntake(id: string) {
 *   return safeAction(async () => {
 *     const result = await db.intakes.update(...)
 *     return result
 *   }, { timeout: 10000, userMessage: "Failed to approve intake" })
 * }
 */
export async function safeAction<T>(
  fn: () => Promise<T>,
  options: SafeActionOptions = {}
): Promise<ActionResult<T>> {
  const { 
    timeout = 30000, 
    userMessage = "Something went wrong. Please try again.",
    context = {}
  } = options

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Action timeout")), timeout)
      ),
    ])

    return { success: true, data: result }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    Sentry.captureException(error, {
      extra: {
        ...context,
        timeout,
        errorMessage,
      },
    })

    if (errorMessage === "Action timeout") {
      return {
        success: false,
        error: "Request timed out. Please try again.",
        code: "TIMEOUT",
      }
    }

    return {
      success: false,
      error: userMessage,
      code: "UNKNOWN",
    }
  }
}

/**
 * Create a safe action with preset options
 * 
 * @example
 * const dbAction = createSafeAction({ timeout: 5000 })
 * const result = await dbAction(() => db.query(...))
 */
export function createSafeAction(defaultOptions: SafeActionOptions) {
  return <T>(fn: () => Promise<T>, options?: SafeActionOptions) =>
    safeAction(fn, { ...defaultOptions, ...options })
}

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T>(
  result: ActionResult<T>
): result is { success: true; data: T } {
  return result.success
}

/**
 * Extract data or throw
 */
export function unwrapResult<T>(result: ActionResult<T>): T {
  if (result.success) {
    return result.data
  }
  throw new Error(result.error)
}
