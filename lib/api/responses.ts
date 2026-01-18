/**
 * Shared API Response Helpers
 * 
 * Provides consistent response shapes across all API routes.
 * Use these instead of manually constructing NextResponse.json()
 */

import { NextResponse } from "next/server"

/**
 * Standard error response shape
 */
interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  retryAfter?: number
}

/**
 * Standard success response shape
 */
interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
}

/**
 * Return a consistent error response
 */
export function apiError(
  message: string,
  status: number = 400,
  options?: { code?: string; retryAfter?: number }
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      ...(options?.code && { code: options.code }),
      ...(options?.retryAfter && { retryAfter: options.retryAfter }),
    },
    { status }
  )
}

/**
 * Return a consistent success response
 */
export function apiSuccess<T>(
  data?: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      ...(data !== undefined && { data }),
    },
    { status }
  )
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => apiError("Authentication required", 401),
  forbidden: () => apiError("Access denied", 403),
  notFound: (resource = "Resource") => apiError(`${resource} not found`, 404),
  badRequest: (message: string) => apiError(message, 400),
  rateLimited: (retryAfter: number) =>
    apiError("Too many requests. Please wait before trying again.", 429, { retryAfter }),
  serverError: (message = "An unexpected error occurred") => apiError(message, 500),
  serviceUnavailable: (message = "Service temporarily unavailable") => apiError(message, 503),
}
