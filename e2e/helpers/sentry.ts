/**
 * Sentry E2E Test Helpers
 * 
 * Provides utilities for intercepting and capturing Sentry events
 * during Playwright E2E tests for verification.
 */

import type { Page, TestInfo } from "@playwright/test"

/**
 * Captured Sentry event info
 */
export interface CapturedSentryEvent {
  eventId: string
  timestamp: number
  type: "exception" | "transaction" | "unknown"
  message?: string
  tags?: Record<string, string>
}

/**
 * Sentry interceptor that captures events sent to Sentry
 */
export class SentryInterceptor {
  private events: CapturedSentryEvent[] = []
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Start intercepting Sentry requests.
   * Call this before navigating to pages that may trigger errors.
   */
  async start(): Promise<void> {
    // Intercept requests to Sentry's envelope endpoint
    await this.page.route("**/sentry.io/**", async (route) => {
      const request = route.request()
      
      // Only intercept POST requests (event submissions)
      if (request.method() === "POST") {
        try {
          const postData = request.postData()
          if (postData) {
            // Sentry envelope format: header\n{item_header}\n{payload}
            const lines = postData.split("\n")
            for (const line of lines) {
              if (line.startsWith("{")) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const parsed = JSON.parse(line) as any
                  
                  // Extract event ID from header or event
                  const eventId = parsed.event_id || parsed.trace_id || `unknown-${Date.now()}`
                  
                  // Determine event type
                  let eventType: CapturedSentryEvent["type"] = "unknown"
                  if (parsed.exception || parsed.type === "error") {
                    eventType = "exception"
                  } else if (parsed.type === "transaction") {
                    eventType = "transaction"
                  }
                  
                  // Extract message if present
                  const message = parsed.exception?.values?.[0]?.value || 
                                  parsed.message || 
                                  undefined
                  
                  // Extract tags if present
                  const tags = parsed.tags as Record<string, string> | undefined
                  
                  this.events.push({
                    eventId,
                    timestamp: Date.now(),
                    type: eventType,
                    message,
                    tags,
                  })
                } catch {
                  // Ignore parse errors for non-JSON lines
                }
              }
            }
          }
        } catch (error) {
          // Log but don't fail on interception errors
          // eslint-disable-next-line no-console
          console.warn("[SentryInterceptor] Failed to parse Sentry envelope:", error)
        }
      }
      
      // Continue the request (let it go to Sentry)
      await route.continue()
    })
  }

  /**
   * Stop intercepting Sentry requests.
   */
  async stop(): Promise<void> {
    await this.page.unroute("**/sentry.io/**")
  }

  /**
   * Get all captured events.
   */
  getEvents(): CapturedSentryEvent[] {
    return [...this.events]
  }

  /**
   * Get the last captured exception event.
   */
  getLastException(): CapturedSentryEvent | null {
    const exceptions = this.events.filter(e => e.type === "exception")
    return exceptions.length > 0 ? exceptions[exceptions.length - 1] : null
  }

  /**
   * Clear captured events.
   */
  clear(): void {
    this.events = []
  }

  /**
   * Print captured events to console (useful for debugging).
   */
  printEvents(): void {
    // eslint-disable-next-line no-console
    console.log("[SentryInterceptor] Captured events:", JSON.stringify(this.events, null, 2))
  }
}

/**
 * Create a Sentry interceptor for a page.
 * 
 * Usage:
 * ```ts
 * const sentry = await createSentryInterceptor(page)
 * // ... trigger error ...
 * const lastEvent = sentry.getLastException()
 * console.log("Sentry Event ID:", lastEvent?.eventId)
 * ```
 */
export async function createSentryInterceptor(page: Page): Promise<SentryInterceptor> {
  const interceptor = new SentryInterceptor(page)
  await interceptor.start()
  return interceptor
}

/**
 * Add Sentry event ID annotation to test info.
 * Call this on test failure to include Sentry event IDs in test results.
 */
export function annotateSentryEvents(
  testInfo: TestInfo,
  interceptor: SentryInterceptor
): void {
  const events = interceptor.getEvents()
  const exceptions = events.filter(e => e.type === "exception")
  
  if (exceptions.length > 0) {
    // Add annotation with event IDs
    testInfo.annotations.push({
      type: "sentry_event_ids",
      description: exceptions.map(e => e.eventId).join(", "),
    })
    
    // Print to console for easy access
    for (const event of exceptions) {
      // eslint-disable-next-line no-console
      console.log(`[SENTRY] Exception captured - Event ID: ${event.eventId}`)
      if (event.message) {
        // eslint-disable-next-line no-console
        console.log(`[SENTRY] Message: ${event.message}`)
      }
      if (event.tags) {
        // eslint-disable-next-line no-console
        console.log(`[SENTRY] Tags:`, event.tags)
      }
    }
  }
}

/**
 * Extract Sentry event ID from console logs.
 * Use this when intercepting Sentry requests isn't possible.
 */
export async function captureConsoleEventId(page: Page): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000)
    
    page.on("console", (msg) => {
      const text = msg.text()
      // Match pattern: [SENTRY] ... Event ID: <id>
      const match = text.match(/Event ID:\s*([a-f0-9-]+)/i)
      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    })
  })
}
