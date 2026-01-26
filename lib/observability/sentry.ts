/**
 * Sentry Observability Helpers
 * 
 * Provides structured error capture for API routes and server actions
 * with consistent tagging for diagnosis.
 * 
 * Key tags:
 * - route: API route path
 * - method: HTTP method
 * - app_area: admin|doctor|patient|public
 * - user_role: admin|doctor|patient (if discoverable)
 * - playwright: "1" when in E2E mode
 * - e2e_run_id: E2E run identifier (when applicable)
 */

import * as Sentry from "@sentry/nextjs"
import { cookies } from "next/headers"

/**
 * Context for API error capture
 */
export interface ApiErrorContext {
  route: string
  method: string
  intakeId?: string
  templateId?: string
  clinicIdentityId?: string
  certificateId?: string
  userId?: string
  userRole?: string
  statusCode?: number
  // Consult flow tags
  serviceType?: string
  consultSubtype?: string
  stepId?: string
  [key: string]: string | number | undefined
}

/**
 * Context for server action error capture
 */
export interface ServerErrorContext {
  action: string
  intakeId?: string
  templateId?: string
  clinicIdentityId?: string
  certificateId?: string
  userId?: string
  userRole?: string
  // Consult flow tags
  serviceType?: string
  consultSubtype?: string
  stepId?: string
  [key: string]: string | number | undefined
}

/**
 * Derive app area from route path
 */
function getAppAreaFromRoute(route: string): "admin" | "doctor" | "patient" | "public" {
  if (route.startsWith("/api/admin") || route.startsWith("/admin")) return "admin"
  if (route.startsWith("/api/doctor") || route.startsWith("/doctor")) return "doctor"
  if (route.startsWith("/api/patient") || route.startsWith("/patient")) return "patient"
  return "public"
}

/**
 * Get E2E context from cookies (server-side)
 * Returns empty object if not in E2E mode or cookies unavailable
 */
async function getE2EContext(): Promise<{
  isPlaywright: boolean
  e2eRunId?: string
  e2eAuthRole?: string
}> {
  const isPlaywright = process.env.PLAYWRIGHT === "1"
  if (!isPlaywright) {
    return { isPlaywright: false }
  }

  try {
    const cookieStore = await cookies()
    const e2eRunId = cookieStore.get("__e2e_run_id")?.value
    const e2eAuthRole = cookieStore.get("__e2e_auth_role")?.value

    return {
      isPlaywright: true,
      e2eRunId,
      e2eAuthRole,
    }
  } catch {
    // Cookies may not be available in all contexts
    return { isPlaywright: true }
  }
}

/**
 * Capture an API route error to Sentry with structured context.
 * 
 * Only captures exceptions and 5xx errors, NOT expected 401/403.
 * 
 * @param error - The error to capture
 * @param context - Contextual information about the API call
 * @returns The Sentry event ID
 */
export async function captureApiError(
  error: Error,
  context: ApiErrorContext
): Promise<string> {
  const e2e = await getE2EContext()
  const appArea = getAppAreaFromRoute(context.route)

  // Build extra context (exclude undefined values)
  const extra: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && !["route", "method"].includes(key)) {
      extra[key] = value
    }
  }

  const eventId = Sentry.captureException(error, {
    tags: {
      source: "api",
      route: context.route,
      method: context.method,
      app_area: appArea,
      ...(context.intakeId && { intake_id: context.intakeId }),
      ...(context.userRole && { user_role: context.userRole }),
      ...(context.statusCode && { status_code: String(context.statusCode) }),
      // Consult flow tags for diagnosis
      ...(context.serviceType && { service_type: context.serviceType }),
      ...(context.consultSubtype && { consult_subtype: context.consultSubtype }),
      ...(context.stepId && { step_id: context.stepId }),
      ...(e2e.isPlaywright && { playwright: "1" }),
      ...(e2e.e2eRunId && { e2e_run_id: e2e.e2eRunId }),
      ...(e2e.e2eAuthRole && !context.userRole && { user_role: e2e.e2eAuthRole }),
    },
    extra,
  })

  // Log Sentry event ID in E2E mode for test capture
  if (e2e.isPlaywright) {
    // eslint-disable-next-line no-console
    console.error(`[SENTRY] API Error captured - Event ID: ${eventId}`)
  }

  return eventId
}

/**
 * Capture a server action error to Sentry with structured context.
 * 
 * @param error - The error to capture
 * @param context - Contextual information about the server action
 * @returns The Sentry event ID
 */
export async function captureServerError(
  error: Error,
  context: ServerErrorContext
): Promise<string> {
  const e2e = await getE2EContext()

  // Build extra context (exclude undefined values)
  const extra: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && key !== "action") {
      extra[key] = value
    }
  }

  const eventId = Sentry.captureException(error, {
    tags: {
      source: "server_action",
      action: context.action,
      ...(context.intakeId && { intake_id: context.intakeId }),
      ...(context.userRole && { user_role: context.userRole }),
      // Consult flow tags for diagnosis
      ...(context.serviceType && { service_type: context.serviceType }),
      ...(context.consultSubtype && { consult_subtype: context.consultSubtype }),
      ...(context.stepId && { step_id: context.stepId }),
      ...(e2e.isPlaywright && { playwright: "1" }),
      ...(e2e.e2eRunId && { e2e_run_id: e2e.e2eRunId }),
      ...(e2e.e2eAuthRole && !context.userRole && { user_role: e2e.e2eAuthRole }),
    },
    extra,
  })

  // Log Sentry event ID in E2E mode for test capture
  if (e2e.isPlaywright) {
    // eslint-disable-next-line no-console
    console.error(`[SENTRY] Server Error captured - Event ID: ${eventId}`)
  }

  return eventId
}

/**
 * Check if an error should be captured to Sentry.
 * 
 * Returns false for expected client errors (401, 403, 404, 400)
 * Returns true for server errors (5xx) and unexpected exceptions.
 */
export function shouldCaptureError(statusCode?: number): boolean {
  if (!statusCode) return true // Capture unexpected exceptions
  
  // Don't capture expected client errors
  if (statusCode >= 400 && statusCode < 500) return false
  
  // Capture server errors
  return statusCode >= 500
}

/**
 * Wrap an API route handler with Sentry error capture.
 * 
 * Captures both:
 * 1. Thrown exceptions
 * 2. Returned responses with status >= 500 (handled failures)
 * 
 * Does NOT capture 4xx responses (expected client errors).
 * 
 * Usage:
 * ```ts
 * export const POST = withSentryApiCapture(
 *   "/api/admin/clinic",
 *   async (request) => {
 *     // handler logic
 *   }
 * )
 * ```
 */
export function withSentryApiCapture(
  route: string,
  handler: (request: Request) => Promise<Response>,
  options?: { runtime?: "nodejs" | "edge" }
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    // Get or create request ID for correlation
    const requestId = request.headers.get("x-request-id") || generateRequestId()
    const runtime = options?.runtime || "nodejs"

    try {
      const response = await handler(request)

      // Capture 5xx responses as handled failures
      if (response.status >= 500) {
        await capture5xxResponse(request, response, route, requestId, runtime)
      }

      // Add request ID to response headers
      const headers = new Headers(response.headers)
      headers.set("x-request-id", requestId)
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      await captureApiError(error instanceof Error ? error : new Error(String(error)), {
        route,
        method: request.method,
        statusCode: 500,
      })
      throw error // Re-throw to let Next.js handle the error response
    }
  }
}

/**
 * Context for checkout/payment error capture
 * Use this for Stripe checkout session creation failures
 */
export interface CheckoutErrorContext {
  action: "checkout_session_create" | "webhook_process" | "payment_verify"
  intakeId?: string
  serviceType?: string
  consultSubtype?: string
  stripeSessionId?: string
  stripeErrorCode?: string
  priceId?: string
  [key: string]: string | number | undefined
}

/**
 * Capture a checkout/payment error to Sentry with structured context.
 * These errors are HIGH PRIORITY and should trigger alerts.
 * 
 * @param error - The error to capture
 * @param context - Contextual information about the checkout
 * @returns The Sentry event ID
 */
export async function captureCheckoutError(
  error: Error,
  context: CheckoutErrorContext
): Promise<string> {
  const e2e = await getE2EContext()

  // Build extra context
  const extra: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && key !== "action") {
      extra[key] = value
    }
  }

  const eventId = Sentry.captureException(error, {
    level: "error",
    tags: {
      source: "checkout",
      action: context.action,
      // High visibility tags for alerting
      checkout_error: "true",
      ...(context.intakeId && { intake_id: context.intakeId }),
      ...(context.serviceType && { service_type: context.serviceType }),
      ...(context.consultSubtype && { consult_subtype: context.consultSubtype }),
      ...(context.stripeErrorCode && { stripe_error_code: context.stripeErrorCode }),
      ...(context.priceId && { price_id: context.priceId }),
      ...(e2e.isPlaywright && { playwright: "1" }),
      ...(e2e.e2eRunId && { e2e_run_id: e2e.e2eRunId }),
    },
    extra,
    // Mark as handled but critical
    fingerprint: ["checkout-error", context.action, context.stripeErrorCode || "unknown"],
  })

  // Always log checkout errors for visibility
  // eslint-disable-next-line no-console
  console.error(`[SENTRY] Checkout error captured - Event ID: ${eventId}, action=${context.action}`)

  return eventId
}

/**
 * Context for cron job error capture
 */
export interface CronErrorContext {
  jobName: string
  intakeId?: string
  [key: string]: string | number | undefined
}

/**
 * Capture a cron job error to Sentry with structured context.
 * 
 * @param error - The error to capture
 * @param context - Contextual information about the cron job
 * @returns The Sentry event ID
 */
export function captureCronError(
  error: Error,
  context: CronErrorContext
): string {
  // Build extra context (exclude undefined values)
  const extra: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && key !== "jobName") {
      extra[key] = value
    }
  }

  const eventId = Sentry.captureException(error, {
    tags: {
      source: "cron",
      cron_job: context.jobName,
      ...(context.intakeId && { intake_id: context.intakeId }),
    },
    extra,
  })

  return eventId
}

/**
 * Generate a UUID v4 request ID
 */
function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Capture a 5xx response as a Sentry event (handled failure).
 * Truncates response body to 4KB to avoid excessive data.
 */
async function capture5xxResponse(
  request: Request,
  response: Response,
  route: string,
  requestId: string,
  runtime: "nodejs" | "edge"
): Promise<void> {
  const e2e = await getE2EContext()

  // Clone response to read body without consuming it
  let responseBody = ""
  try {
    const cloned = response.clone()
    const text = await cloned.text()
    // Truncate to 4KB
    responseBody = text.length > 4096 ? text.slice(0, 4096) + "...[truncated]" : text
  } catch {
    responseBody = "[unable to read body]"
  }

  const eventId = Sentry.captureMessage(`API returned ${response.status}`, {
    level: "error",
    tags: {
      source: "api_5xx",
      route,
      method: request.method,
      status_code: String(response.status),
      runtime,
      ...(e2e.isPlaywright && { playwright: "1" }),
      ...(e2e.e2eRunId && { e2e_run_id: e2e.e2eRunId }),
    },
    extra: {
      request_id: requestId,
      status: response.status,
      response_body: responseBody,
      url: request.url,
    },
  })

  // Log event ID in E2E mode for test verification
  if (e2e.isPlaywright) {
    // eslint-disable-next-line no-console
    console.error(`[SENTRY] API 5xx captured - Event ID: ${eventId}, status=${response.status}`)
  }
}
