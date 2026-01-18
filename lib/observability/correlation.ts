/**
 * Correlation ID Tracing
 * 
 * Provides request correlation across async flows (webhooks → AI → email).
 * Each request gets a unique ID that propagates through all downstream operations.
 */

import { headers } from "next/headers"
import { randomUUID } from "crypto"

// Header name for correlation ID
export const CORRELATION_ID_HEADER = "x-correlation-id"

// AsyncLocalStorage would be ideal but Next.js edge doesn't support it well
// Using a simple approach with header propagation instead

/**
 * Get or create a correlation ID for the current request
 */
export async function getCorrelationId(): Promise<string> {
  try {
    const headersList = await headers()
    const existingId = headersList.get(CORRELATION_ID_HEADER)
    if (existingId) return existingId
  } catch {
    // headers() not available (e.g., in non-request context)
  }
  return generateCorrelationId()
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  // Format: timestamp-random for easy debugging
  const timestamp = Date.now().toString(36)
  const random = randomUUID().slice(0, 8)
  return `${timestamp}-${random}`
}

/**
 * Create correlation context for logging
 */
export function correlationContext(correlationId: string): Record<string, string> {
  return { correlationId }
}

/**
 * Wrap a fetch call with correlation ID header
 */
export function fetchWithCorrelation(
  url: string,
  options: RequestInit = {},
  correlationId: string
): Promise<Response> {
  const headers = new Headers(options.headers)
  headers.set(CORRELATION_ID_HEADER, correlationId)
  
  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Extract correlation ID from webhook payload or generate new one
 */
export function getWebhookCorrelationId(payload: Record<string, unknown>): string {
  // Check common webhook correlation patterns
  if (typeof payload.correlation_id === "string") return payload.correlation_id
  if (typeof payload.request_id === "string") return payload.request_id
  if (typeof payload.idempotency_key === "string") return payload.idempotency_key
  
  // For Stripe webhooks, use event ID
  if (typeof payload.id === "string" && payload.object === "event") {
    return `stripe-${payload.id}`
  }
  
  return generateCorrelationId()
}

/**
 * Create a traced operation wrapper
 */
export function withCorrelation<T>(
  correlationId: string,
  operation: string,
  fn: () => Promise<T>,
  logger?: { info: (msg: string, ctx: Record<string, unknown>) => void }
): Promise<T> {
  const startTime = Date.now()
  
  logger?.info(`[${operation}] Started`, { correlationId, operation })
  
  return fn().then(
    (result) => {
      logger?.info(`[${operation}] Completed`, { 
        correlationId, 
        operation, 
        durationMs: Date.now() - startTime 
      })
      return result
    },
    (error) => {
      logger?.info(`[${operation}] Failed`, { 
        correlationId, 
        operation, 
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  )
}
