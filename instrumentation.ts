/**
 * Next.js Instrumentation Hook
 * 
 * Runs once when the server starts. Perfect for:
 * - Initializing monitoring services (Sentry)
 * - One-time setup tasks
 * - P0: Verifying encryption configuration
 */

import * as Sentry from "@sentry/nextjs";
import {
  getSentryEnvironment,
  getSentryRelease,
  getSentryDsn,
  isSentryEnabled,
  getSentryRuntime,
} from "@/lib/observability/sentry-config";

export async function register() {
  // P0 FIX: Verify encryption is properly configured at startup
  // This fails fast instead of silently using plaintext PHI
  // Only run in Node.js runtime (not edge) since crypto module is Node-only
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.ENCRYPTION_KEY) {
    try {
      const { verifyEncryptionSetup } = await import("@/lib/security/encryption")
      const result = verifyEncryptionSetup()
      if (!result.valid) {
        // eslint-disable-next-line no-console
        console.error("[CRITICAL] Encryption verification failed:", result.error)
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Encryption setup invalid: ${result.error}`)
        }
      } else {
        // eslint-disable-next-line no-console
        console.log("[Startup] Encryption verification passed")
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[CRITICAL] Failed to verify encryption:", error)
      if (process.env.NODE_ENV === "production") {
        throw error
      }
    }
  } else if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.warn("[WARNING] ENCRYPTION_KEY not set - PHI will be stored in plaintext")
  }

  // Schema validation - detect drift between code and DB
  // Only run in Node.js runtime with Supabase configured
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { runSchemaValidation } = await import("@/lib/schema/validation")
      await runSchemaValidation()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[CRITICAL] Schema validation failed:", error)
      if (process.env.NODE_ENV === "production") {
        throw error
      }
    }
  }

  // Get Sentry configuration
  const sentryDsn = getSentryDsn()
  const sentryEnabled = isSentryEnabled()
  const sentryEnvironment = getSentryEnvironment()
  const sentryRelease = getSentryRelease()
  const sentryRuntime = getSentryRuntime()

  // Skip Sentry initialization if not enabled
  if (!sentryEnabled) {
    return;
  }
  
  Sentry.init({
    dsn: sentryDsn,
    enabled: sentryEnabled,
    environment: sentryEnvironment,
    release: sentryRelease,
    // Increased sampling for better visibility during growth phase
    tracesSampleRate: sentryEnvironment === "production" ? 0.5 : 1.0,
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

  // Log startup confirmation (server-side only, once per cold start)
  if (sentryRuntime === "nodejs") {
    // eslint-disable-next-line no-console
    console.log(
      `[Sentry] Initialized: enabled=${sentryEnabled}, env=${sentryEnvironment}, release=${sentryRelease || "unset"}, runtime=${sentryRuntime}`
    )
  }
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
