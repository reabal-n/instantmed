/**
 * Sentry Configuration Utilities
 * 
 * Provides consistent environment, release, and runtime detection
 * for both server-side and client-side Sentry initialization.
 */

/**
 * Sentry environment type
 */
export type SentryEnvironment = "production" | "preview" | "development" | "e2e"

/**
 * Get the Sentry environment from Vercel environment variables.
 * Priority: PLAYWRIGHT mode → VERCEL_ENV → NODE_ENV
 */
export function getSentryEnvironment(): SentryEnvironment {
  // E2E mode takes priority
  const isPlaywright = 
    process.env.PLAYWRIGHT === "1" || 
    process.env.NEXT_PUBLIC_PLAYWRIGHT === "1"
  
  if (isPlaywright) {
    return "e2e"
  }

  // Vercel provides VERCEL_ENV: production | preview | development
  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv === "production") return "production"
  if (vercelEnv === "preview") return "preview"
  if (vercelEnv === "development") return "development"

  // Fallback to NODE_ENV
  if (process.env.NODE_ENV === "production") return "production"
  
  return "development"
}

/**
 * Get the Sentry release from Vercel environment variables.
 * Uses git commit SHA when available.
 */
export function getSentryRelease(): string | undefined {
  // Vercel provides VERCEL_GIT_COMMIT_SHA
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA
  if (commitSha) {
    return commitSha
  }

  // Fallback: try Git ref
  const gitRef = process.env.VERCEL_GIT_COMMIT_REF
  if (gitRef) {
    return `ref-${gitRef}`
  }

  return undefined
}

/**
 * Get the current runtime (nodejs or edge)
 */
export function getSentryRuntime(): "nodejs" | "edge" | "browser" {
  // Server-side: check NEXT_RUNTIME
  if (typeof process !== "undefined" && process.env?.NEXT_RUNTIME) {
    return process.env.NEXT_RUNTIME as "nodejs" | "edge"
  }
  
  // Client-side
  if (typeof window !== "undefined") {
    return "browser"
  }

  // Default assumption for server
  return "nodejs"
}

/**
 * Check if Sentry should be enabled based on environment
 */
export function isSentryEnabled(): boolean {
  const env = getSentryEnvironment()
  // Enable in production, preview, and e2e modes
  return env === "production" || env === "preview" || env === "e2e"
}

/**
 * Get DSN with server/client fallback
 */
export function getSentryDsn(): string | undefined {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
}

/**
 * Generate a unique request ID (UUID v4)
 */
export function generateRequestId(): string {
  // Use crypto.randomUUID if available (Node 19+, all modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get or create request ID from headers
 */
export function getOrCreateRequestId(request: Request): string {
  const existing = request.headers.get("x-request-id")
  if (existing) {
    return existing
  }
  return generateRequestId()
}
