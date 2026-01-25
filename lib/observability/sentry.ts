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
      ...(context.userRole && { user_role: context.userRole }),
      ...(context.statusCode && { status_code: String(context.statusCode) }),
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
      ...(context.userRole && { user_role: context.userRole }),
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
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request)
    } catch (error) {
      await captureApiError(error instanceof Error ? error : new Error(String(error)), {
        route,
        method: request.method,
      })
      throw error // Re-throw to let Next.js handle the error response
    }
  }
}
