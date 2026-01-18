/**
 * Type-safe authentication error codes
 * Used for consistent error handling across auth flows
 */

export const AUTH_ERROR_CODES = {
  AUTHENTICATION_REQUIRED: 'authentication_required',
  OAUTH_FAILED: 'oauth_failed',
  EMAIL_REQUIRED: 'email_required',
  PROFILE_CREATION_FAILED: 'profile_creation_failed',
  INVALID_CREDENTIALS: 'invalid_credentials',
  RATE_LIMITED: 'rate_limited',
  SESSION_EXPIRED: 'session_expired',
  ACCOUNT_DISABLED: 'account_disabled',
} as const

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES]

/**
 * User-friendly error messages for each error code
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERROR_CODES.AUTHENTICATION_REQUIRED]: 'Please sign in to continue.',
  [AUTH_ERROR_CODES.OAUTH_FAILED]: 'Authentication failed. Please try again.',
  [AUTH_ERROR_CODES.EMAIL_REQUIRED]: 'Email address is required.',
  [AUTH_ERROR_CODES.PROFILE_CREATION_FAILED]: 'Failed to create profile. Please try again.',
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [AUTH_ERROR_CODES.RATE_LIMITED]: 'Too many attempts. Please wait a moment.',
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: 'This account has been disabled.',
}

/**
 * Get user-friendly message for an error code
 */
export function getAuthErrorMessage(code: string | null): string | null {
  if (!code) return null
  return AUTH_ERROR_MESSAGES[code as AuthErrorCode] || code
}
