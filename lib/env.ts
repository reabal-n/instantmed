import "server-only"

/**
 * Environment variable validation and access
 * 
 * Server-only environment variables (never expose to client):
 * - RESEND_API_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * 
 * Public environment variables (safe for client):
 * - NEXT_PUBLIC_APP_URL
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 */

// ============================================
// SERVER-ONLY ENVIRONMENT VARIABLES
// ============================================

/**
 * Resend API key for sending emails
 * NEVER expose this to the client
 */
export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn("[env] RESEND_API_KEY not set - emails will be logged only")
    return ""
  }
  return key
}

/**
 * Resend from email address
 * Format: "Name <email@domain.com>"
 */
export function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "InstantMed <noreply@instantmed.com.au>"
}

/**
 * Supabase service role key (bypasses RLS)
 */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
  }
  return key
}

/**
 * Stripe secret key
 */
export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable")
  }
  return key
}

/**
 * Stripe webhook secret
 */
export function getStripeWebhookSecret(): string {
  const key = process.env.STRIPE_WEBHOOK_SECRET
  if (!key) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable")
  }
  return key
}


// ============================================
// PUBLIC ENVIRONMENT VARIABLES
// ============================================

/**
 * App URL for generating links in emails, etc.
 * Uses NEXT_PUBLIC_APP_URL or falls back to NEXT_PUBLIC_SITE_URL
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (!url) {
    // Fallback for development
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3000"
    }
    throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable")
  }
  // Remove trailing slash
  return url.replace(/\/$/, "")
}

/**
 * Supabase URL
 */
export function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error("Missing SUPABASE_URL environment variable")
  }
  return url
}

/**
 * Supabase anon key
 */
export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
  }
  return key
}

// ============================================
// VALIDATION
// ============================================

interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

/**
 * Validate all required environment variables
 * Call this at app startup to catch configuration errors early
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  // Required variables
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Optional but recommended
  const optional = [
    { key: "RESEND_API_KEY", message: "Email sending disabled" },
    { key: "RESEND_FROM_EMAIL", message: "Using default from address" },
    { key: "STRIPE_SECRET_KEY", message: "Payment processing disabled" },
  ]

  for (const { key, message } of optional) {
    if (!process.env[key]) {
      warnings.push(`${key}: ${message}`)
    }
  }

  // Validate NEXT_PUBLIC_APP_URL
  if (!process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
    if (process.env.NODE_ENV === "production") {
      missing.push("NEXT_PUBLIC_APP_URL")
    } else {
      warnings.push("NEXT_PUBLIC_APP_URL: Using localhost fallback")
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

// ============================================
// ENV OBJECT (for convenience)
// ============================================

/**
 * Typed environment access object
 * Use getters to avoid evaluation at import time
 */
export const env = {
  // Server-only (will throw or warn if not set)
  get resendApiKey() {
    return getResendApiKey()
  },
  get resendFromEmail() {
    return getResendFromEmail()
  },
  get supabaseServiceRoleKey() {
    return getSupabaseServiceRoleKey()
  },
  get stripeSecretKey() {
    return getStripeSecretKey()
  },
  get stripeWebhookSecret() {
    return getStripeWebhookSecret()
  },

  // Public
  get appUrl() {
    return getAppUrl()
  },
  get supabaseUrl() {
    return getSupabaseUrl()
  },
  get supabaseAnonKey() {
    return getSupabaseAnonKey()
  },

  // Helpers
  get isDev() {
    return process.env.NODE_ENV === "development"
  },
  get isProd() {
    return process.env.NODE_ENV === "production"
  },
}
