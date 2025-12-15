import "server-only"
import { createLogger } from "./logger"

const log = createLogger("error-handler")

/**
 * Standard error response type for server actions
 */
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Create a successful action result
 */
export function success<T>(data?: T): ActionResult<T> {
  return { success: true, data }
}

/**
 * Create a failed action result with logging
 */
export function failure(
  error: string,
  code?: string,
  originalError?: unknown,
  context?: Record<string, unknown>
): ActionResult<never> {
  // Log the error with context
  log.error(`Action failure: ${error}`, { code, ...context }, originalError)
  
  return { success: false, error, code }
}

/**
 * Handle an unknown error and return a safe user-facing message
 */
export function handleActionError(
  actionName: string,
  error: unknown,
  context?: Record<string, unknown>
): ActionResult<never> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error"
  const errorCode = (error as Error & { code?: string })?.code
  
  log.error(`Unhandled error in ${actionName}`, { ...context, errorCode }, error)
  
  // Return safe user-facing message (don't expose internal details)
  return {
    success: false,
    error: "An unexpected error occurred. Please try again.",
    code: errorCode || "UNEXPECTED_ERROR",
  }
}

/**
 * Wrapper for server actions with automatic error handling and logging
 */
export function createSafeAction<TInput, TOutput>(
  actionName: string,
  action: (input: TInput) => Promise<ActionResult<TOutput>>,
  options?: {
    logInput?: boolean
    module?: string
  }
): (input: TInput) => Promise<ActionResult<TOutput>> {
  const actionLog = createLogger(options?.module || "action", { action: actionName })
  
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    const startTime = Date.now()
    
    try {
      actionLog.info(`Starting action`, options?.logInput ? { input } : undefined)
      
      const result = await action(input)
      const duration = Date.now() - startTime
      
      if (result.success) {
        actionLog.info(`Action completed`, { duration })
      } else {
        actionLog.warn(`Action failed with error`, { duration, error: result.error, code: result.code })
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      actionLog.error(`Action threw exception`, { duration }, error)
      
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
        code: "EXCEPTION",
      }
    }
  }
}

/**
 * Report an error to error tracking service (placeholder for Sentry, etc.)
 */
export function reportError(
  error: unknown,
  context?: {
    userId?: string
    action?: string
    metadata?: Record<string, unknown>
  }
): void {
  // Log for now - in production, this would send to Sentry/LogRocket/etc.
  log.error("Error reported", context, error)
  
  // TODO: Integrate with error tracking service
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context })
  // }
}

/**
 * Extract a safe error message for the user
 */
export function getSafeErrorMessage(error: unknown): string {
  // Known safe errors we can show to users
  if (error instanceof Error) {
    // Check for known error types
    if (error.message.includes("not authenticated")) {
      return "Please sign in to continue."
    }
    if (error.message.includes("not authorized") || error.message.includes("Unauthorized")) {
      return "You don't have permission to perform this action."
    }
    if (error.message.includes("not found")) {
      return "The requested resource was not found."
    }
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return "Network error. Please check your connection and try again."
    }
  }
  
  // Default safe message
  return "Something went wrong. Please try again."
}

/**
 * Check if an error is a known/expected error (not a bug)
 */
export function isExpectedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const expectedPatterns = [
    "not authenticated",
    "not authorized",
    "Unauthorized",
    "not found",
    "validation failed",
    "invalid input",
    "rate limit",
    "PAYMENT_REQUIRED",
    "TERMINAL_STATE",
    "INVALID_TRANSITION",
  ]
  
  return expectedPatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  )
}
