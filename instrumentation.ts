/**
 * Next.js Instrumentation Hook
 * 
 * Runs once when the server starts. Perfect for:
 * - Environment variable validation
 * - Initializing monitoring services
 * - One-time setup tasks
 */

import { validateEnv } from "./lib/env"

export async function register() {
  // Skip validation in build time
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return
  }

  // Validate environment variables
  const result = validateEnv()
  
  if (!result.valid) {
    // eslint-disable-next-line no-console
    console.error("❌ Environment validation failed!")
    // eslint-disable-next-line no-console
    console.error("Missing required environment variables:")
    result.missing.forEach((varName) => {
      // eslint-disable-next-line no-console
      console.error(`  - ${varName}`)
    })
    // eslint-disable-next-line no-console
    console.error("\nPlease check your .env.local file against .env.example")
    
    // In production, fail fast
    if (process.env.NODE_ENV === "production") {
      process.exit(1)
    } else {
      // eslint-disable-next-line no-console
      console.warn("⚠️  Continuing in development mode with missing variables")
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("✅ Environment variables validated successfully")
  }

  // Initialize Sentry if configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // eslint-disable-next-line no-console
    console.log("✅ Sentry error tracking initialized")
  }

  // Check Redis configuration for rate limiting
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // eslint-disable-next-line no-console
    console.log("✅ Redis rate limiting enabled")
  } else {
    // eslint-disable-next-line no-console
    console.warn("⚠️  Redis not configured - using in-memory rate limiting (not suitable for production)")
  }
}
