/**
 * Next.js Instrumentation Hook
 * 
 * Runs once when the server starts. Perfect for:
 * - Initializing monitoring services (Sentry)
 * - One-time setup tasks
 * - P0: Verifying encryption configuration
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  // P0 FIX: Verify encryption is properly configured at startup
  // This fails fast instead of silently using plaintext PHI
  if (process.env.ENCRYPTION_KEY) {
    try {
      const { verifyEncryptionSetup } = await import("@/lib/security/encryption")
      const result = verifyEncryptionSetup()
      if (!result.valid) {
        console.error("[CRITICAL] Encryption verification failed:", result.error)
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Encryption setup invalid: ${result.error}`)
        }
      } else {
        console.log("[Startup] Encryption verification passed")
      }
    } catch (error) {
      console.error("[CRITICAL] Failed to verify encryption:", error)
      if (process.env.NODE_ENV === "production") {
        throw error
      }
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[WARNING] ENCRYPTION_KEY not set - PHI will be stored in plaintext")
  }

  // Skip Sentry initialization in development to avoid compilation issues
  if (process.env.NODE_ENV === "development") {
    return;
  }
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === "production",
    // Increased sampling for better visibility during growth phase
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,
    enableLogs: true,
    sendDefaultPii: false,
    ignoreErrors: [
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      "AbortError",
    ],
    // Always sample critical clinical and payment transactions
    tracesSampler: ({ name, parentSampled }) => {
      // Always inherit parent decision
      if (parentSampled !== undefined) return parentSampled
      // Critical paths: always sample
      if (name.includes("stripe") || name.includes("webhook")) return 1.0
      if (name.includes("approve") || name.includes("decline")) return 1.0
      if (name.includes("prescription") || name.includes("med-cert")) return 1.0
      // Default sampling rate
      return 0.5
    },
  });
}

export function onRequestError(
  err: Error,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  Sentry.captureException(err, {
    extra: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
  });
}
