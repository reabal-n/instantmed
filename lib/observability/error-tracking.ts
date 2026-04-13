/* eslint-disable no-console -- Error tracking needs console as fallback for tracking service failures */
/**
 * Error Tracking Foundation
 * 
 * Provides a unified interface for error tracking that can be
 * easily connected to services like Sentry, LogRocket, etc.
 */

import posthog from 'posthog-js'

import { toError } from "@/lib/errors"

import { logger } from './logger'

interface ErrorContext {
  /** User ID if authenticated */
  userId?: string
  /** User email */
  email?: string
  /** Current route/page */
  route?: string
  /** Additional tags */
  tags?: Record<string, string>
  /** Extra context data */
  extra?: Record<string, unknown>
}

interface BreadcrumbEntry {
  timestamp: string
  category: string
  message: string
  level: 'debug' | 'info' | 'warning' | 'error'
  data?: Record<string, unknown>
}

// Breadcrumb trail for debugging
const breadcrumbs: BreadcrumbEntry[] = []
const MAX_BREADCRUMBS = 50

/**
 * Add a breadcrumb for error context
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: BreadcrumbEntry['level'] = 'info',
  data?: Record<string, unknown>
): void {
  breadcrumbs.push({
    timestamp: new Date().toISOString(),
    category,
    message,
    level,
    data,
  })
  
  // Keep only the last N breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift()
  }
}

/**
 * Get current breadcrumbs
 */
export function getBreadcrumbs(): BreadcrumbEntry[] {
  return [...breadcrumbs]
}

/**
 * Clear breadcrumbs
 */
export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0
}

/**
 * Capture an exception with context
 */
export function captureException(
  error: Error,
  context?: ErrorContext
): string {
  // Generate a unique error ID
  const errorId = generateErrorId()
  
  // Build the error report
  const report = {
    errorId,
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context: {
      ...context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
    breadcrumbs: getBreadcrumbs(),
    environment: process.env.NODE_ENV,
  }
  
  // Log locally
  logger.error(`Exception captured: ${error.message}`, { errorId }, error)

  // Capture error in PostHog
  if (typeof window !== 'undefined') {
    posthog.capture('error_captured', {
      error_id: errorId,
      error_name: error.name,
      error_message: error.message,
      user_id: context?.userId,
      route: context?.route,
      tags: context?.tags,
    })
    // Also use PostHog's built-in exception tracking
    posthog.captureException(error)
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    sendToErrorService(report)
  }

  return errorId
}

/**
 * Capture a message (non-exception)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
): string {
  const messageId = generateErrorId()
  
  const report = {
    messageId,
    timestamp: new Date().toISOString(),
    message,
    level,
    context,
    breadcrumbs: getBreadcrumbs(),
  }
  
  logger[level === 'warning' ? 'warn' : level](message, { messageId })
  
  if (process.env.NODE_ENV === 'production' && level !== 'info') {
    sendToErrorService(report)
  }
  
  return messageId
}

/**
 * Set user context for error tracking
 */
let userContext: ErrorContext | null = null

export function setUser(context: ErrorContext | null): void {
  userContext = context
  addBreadcrumb('user', context ? 'User context set' : 'User context cleared')
}

export function getUser(): ErrorContext | null {
  return userContext
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `err_${timestamp}_${random}`
}

/**
 * Send to Sentry error tracking service
 * Uses dynamic import for @sentry/nextjs which works on both client and server
 */
async function sendToErrorService(report: Record<string, unknown>): Promise<void> {
  try {
    const Sentry = await import("@sentry/nextjs")
    const errorData = report.error as { name?: string; message?: string; stack?: string } | undefined
    if (errorData?.message) {
      const err = new Error(errorData.message)
      err.name = errorData.name || "Error"
      if (errorData.stack) err.stack = errorData.stack
      Sentry.captureException(err, {
        extra: { errorId: report.errorId, breadcrumbs: report.breadcrumbs },
        tags: (report.context as Record<string, unknown>)?.tags as Record<string, string> | undefined,
      })
    } else if (report.message) {
      Sentry.captureMessage(report.message as string, {
        level: (report.level as "info" | "warning" | "error") || "info",
        extra: { messageId: report.messageId },
      })
    }
  } catch (e) {
    console.error('[ErrorTracking] Failed to send to Sentry:', e)
  }
}

/**
 * Error boundary helper for React
 */
export function handleReactError(
  error: Error,
  errorInfo: { componentStack?: string }
): string {
  return captureException(error, {
    extra: {
      componentStack: errorInfo.componentStack,
    },
    tags: {
      source: 'react-error-boundary',
    },
  })
}

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Partial<ErrorContext>
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof Error) {
        captureException(error, {
          ...userContext,
          ...context,
        })
      }
      throw error
    }
  }) as T
}

// Export convenience function for global error handler setup
export function setupGlobalErrorHandlers(): void {
  if (typeof window !== 'undefined') {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      captureException(
        toError(event.reason),
        { tags: { type: 'unhandled-rejection' } }
      )
    })
    
    // Global errors
    window.addEventListener('error', (event) => {
      // Skip generic cross-origin "Script error." - no useful info available
      if (event.message === 'Script error.' && !event.filename) return

      captureException(event.error || new Error(event.message), {
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        tags: { type: 'global-error' },
      })
    })
  }
}
