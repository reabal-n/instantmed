/**
 * Centralized error handling utilities
 * Provides consistent error messages and logging
 */

export type ErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELLED"
  | "INVALID_MEDICARE"
  | "AUTH_REQUIRED"
  | "PROFILE_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "RATE_LIMITED"

interface AppError {
  code: ErrorCode
  message: string
  userMessage: string
  recoverable: boolean
}

const ERROR_MAP: Record<ErrorCode, Omit<AppError, "code">> = {
  NETWORK_ERROR: {
    message: "Network request failed",
    userMessage: "Please check your internet connection and try again.",
    recoverable: true,
  },
  TIMEOUT: {
    message: "Request timed out",
    userMessage: "This is taking longer than expected. Please try again.",
    recoverable: true,
  },
  PAYMENT_FAILED: {
    message: "Payment processing failed",
    userMessage: "Your payment couldn't be processed. Please try again or use a different card.",
    recoverable: true,
  },
  PAYMENT_CANCELLED: {
    message: "Payment was cancelled",
    userMessage: "No worries — your answers are saved. Complete payment when you're ready.",
    recoverable: true,
  },
  INVALID_MEDICARE: {
    message: "Invalid Medicare number",
    userMessage: "Please check your Medicare number and try again.",
    recoverable: true,
  },
  AUTH_REQUIRED: {
    message: "Authentication required",
    userMessage: "Please sign in to continue.",
    recoverable: true,
  },
  PROFILE_NOT_FOUND: {
    message: "Profile not found",
    userMessage: "Your profile couldn't be found. Please sign out and sign in again.",
    recoverable: true,
  },
  PERMISSION_DENIED: {
    message: "Permission denied",
    userMessage: "You don't have permission to perform this action.",
    recoverable: false,
  },
  VALIDATION_ERROR: {
    message: "Validation failed",
    userMessage: "Please check your details and try again.",
    recoverable: true,
  },
  NOT_FOUND: {
    message: "Resource not found",
    userMessage: "We couldn't find what you're looking for.",
    recoverable: false,
  },
  SERVER_ERROR: {
    message: "Server error",
    userMessage: "Something went wrong on our end. Please try again later.",
    recoverable: true,
  },
  RATE_LIMITED: {
    message: "Too many requests",
    userMessage: "You're doing that too often. Please wait a moment and try again.",
    recoverable: true,
  },
}

export function createAppError(code: ErrorCode, customMessage?: string): AppError {
  const base = ERROR_MAP[code]
  return {
    code,
    ...base,
    userMessage: customMessage || base.userMessage,
  }
}

export function parseSupabaseError(error: { code?: string; message?: string }): AppError {
  switch (error.code) {
    case "23503":
      return createAppError("PROFILE_NOT_FOUND")
    case "42501":
      return createAppError("PERMISSION_DENIED")
    case "PGRST116":
      return createAppError("NOT_FOUND")
    case "23505":
      return createAppError("VALIDATION_ERROR", "This record already exists.")
    default:
      if (error.message?.includes("network") || error.message?.includes("fetch")) {
        return createAppError("NETWORK_ERROR")
      }
      return createAppError("SERVER_ERROR")
  }
}

export function parseStripeError(error: { type?: string; code?: string; message?: string }): AppError {
  switch (error.type) {
    case "card_error":
      return createAppError("PAYMENT_FAILED", error.message || "Your card was declined.")
    case "rate_limit_error":
      return createAppError("RATE_LIMITED")
    case "invalid_request_error":
      return createAppError("VALIDATION_ERROR", error.message)
    default:
      return createAppError("PAYMENT_FAILED")
  }
}

/**
 * Wraps an async function with timeout
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 30000): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(createAppError("TIMEOUT")), timeoutMs)
  })
  return Promise.race([promise, timeout])
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 1000): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

export const FRIENDLY_ERRORS = {
  // Medicare
  medicareInvalid: "Medicare number doesn't look right — should be 10 digits, check your card",
  medicareIncomplete: (remaining: number) => `${remaining} more digit${remaining === 1 ? "" : "s"} to go`,
  medicareStartDigit: "Medicare numbers start with 2, 3, 4, 5 or 6",
  irnInvalid: "IRN should be 1-9 — it's the number next to your name on the card",

  // Auth
  emailExists: "That email's already got an account — want to sign in instead?",
  invalidCredentials: "Email or password doesn't match. Try again?",
  passwordTooShort: "Password needs at least 6 characters",
  invalidEmail: "That email doesn't look right — mind checking it?",

  // Payment
  cardDeclined: "Your card was declined. Got another one handy?",
  paymentFailed: "Payment didn't go through. Try a different card?",
  paymentCancelled: "No worries — your answers are saved. Complete payment when you're ready.",

  // Network
  offline: "Looks like you're offline. Check your connection?",
  timeout: "This is taking longer than usual. Try again?",

  // Generic
  generic: "Whoops, something went wrong on our end. Try again?",
  notFound: "We couldn't find what you're looking for",
  forbidden: "You don't have access to this. Need to sign in?",
  rateLimited: "Slow down a bit! Try again in a minute.",
}

/**
 * Safe API error response — never leaks internal error details to clients.
 * Logs the full error server-side for debugging.
 */
export function safeApiErrorResponse(
  error: unknown,
  context: string,
  log?: { error: (msg: string, meta: Record<string, unknown>, err?: unknown) => void }
): { message: string; status: 500 } {
  const internal = error instanceof Error ? error.message : String(error)
  if (log) {
    log.error(context, { error: internal }, error instanceof Error ? error : undefined)
  }
  return { message: "Internal server error", status: 500 }
}

export function getFriendlyError(code: string, fallback?: string): string {
  const errorMap: Record<string, string> = {
    invalid_credentials: FRIENDLY_ERRORS.invalidCredentials,
    user_already_exists: FRIENDLY_ERRORS.emailExists,
    invalid_email: FRIENDLY_ERRORS.invalidEmail,
    weak_password: FRIENDLY_ERRORS.passwordTooShort,
    card_declined: FRIENDLY_ERRORS.cardDeclined,
    payment_failed: FRIENDLY_ERRORS.paymentFailed,
    network_error: FRIENDLY_ERRORS.offline,
    timeout: FRIENDLY_ERRORS.timeout,
    not_found: FRIENDLY_ERRORS.notFound,
    forbidden: FRIENDLY_ERRORS.forbidden,
    rate_limited: FRIENDLY_ERRORS.rateLimited,
  }

  return errorMap[code] || fallback || FRIENDLY_ERRORS.generic
}
