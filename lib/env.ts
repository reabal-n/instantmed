import "server-only"
import { z } from "zod"
import { COMPANY_NAME, CONTACT_EMAIL, CONTACT_EMAIL_ADMIN } from "@/lib/constants"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("env")

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
// ZOD SCHEMA VALIDATION
// ============================================

const serverEnvSchema = z.object({
  // Required in all environments
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key required"),
  
  // Required in production only
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  INTERNAL_API_SECRET: z.string().optional(),
  
  // Stripe price IDs (required for checkout functionality)
  STRIPE_PRICE_MEDCERT: z.string().optional(),
  STRIPE_PRICE_MEDCERT_2DAY: z.string().optional(),
  STRIPE_PRICE_MEDCERT_3DAY: z.string().optional(),
  STRIPE_PRICE_REPEAT_SCRIPT: z.string().optional(),
  STRIPE_PRICE_CONSULT: z.string().optional(),
  STRIPE_PRICE_CONSULT_ED: z.string().optional(),
  STRIPE_PRICE_CONSULT_HAIR_LOSS: z.string().optional(),
  STRIPE_PRICE_CONSULT_WOMENS_HEALTH: z.string().optional(),
  STRIPE_PRICE_CONSULT_WEIGHT_LOSS: z.string().optional(),
  STRIPE_PRICE_PRIORITY_FEE: z.string().optional(),
  STRIPE_PRICE_REPEAT_RX_MONTHLY: z.string().optional(),

  // Optional with defaults
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  VERCEL_AI_GATEWAY_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  
  // Rate limiting (optional but recommended)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Encryption (required for PHI protection)
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 bytes base64 encoded").optional(),

  // Google Places API (server-only — NOT NEXT_PUBLIC_)
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // PHI encryption
  PHI_ENCRYPTION_ENABLED: z.string().optional(),
  PHI_MASTER_KEY: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(), // Required in CI for source map upload
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Analytics
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // Telegram alerts
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Cron job authentication
  CRON_SECRET: z.string().optional(),
  OPS_CRON_SECRET: z.string().optional(),

  // Parchment ePrescribing
  PARCHMENT_API_URL: z.string().url().optional(),
  PARCHMENT_PARTNER_ID: z.string().optional(),
  PARCHMENT_PARTNER_SECRET: z.string().optional(),
  PARCHMENT_ORGANIZATION_ID: z.string().optional(),
  PARCHMENT_ORGANIZATION_SECRET: z.string().optional(),
  PARCHMENT_WEBHOOK_SECRET: z.string().optional(),
  PARCHMENT_DEFAULT_USER_ID: z.string().optional(),

  // Stripe publishable key (public, for client checkout)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Site URL fallback (used in SEO metadata)
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // Google site verification
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

const productionRequirements = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("Production requires NEXT_PUBLIC_APP_URL"),
  STRIPE_SECRET_KEY: z.string().min(1, "Production requires STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "Production requires STRIPE_WEBHOOK_SECRET"),
  INTERNAL_API_SECRET: z.string().min(1, "Production requires INTERNAL_API_SECRET"),
  ENCRYPTION_KEY: z.string().min(32, "Production requires ENCRYPTION_KEY (min 32 bytes base64)"),
  // Stripe price IDs - required in production for payment functionality
  STRIPE_PRICE_MEDCERT: z.string().min(1, "Production requires STRIPE_PRICE_MEDCERT"),
  STRIPE_PRICE_MEDCERT_2DAY: z.string().min(1, "Production requires STRIPE_PRICE_MEDCERT_2DAY"),
  STRIPE_PRICE_MEDCERT_3DAY: z.string().min(1, "Production requires STRIPE_PRICE_MEDCERT_3DAY"),
  STRIPE_PRICE_REPEAT_SCRIPT: z.string().min(1, "Production requires STRIPE_PRICE_REPEAT_SCRIPT"),
  STRIPE_PRICE_CONSULT: z.string().min(1, "Production requires STRIPE_PRICE_CONSULT"),
  STRIPE_PRICE_CONSULT_ED: z.string().min(1, "Production requires STRIPE_PRICE_CONSULT_ED"),
  STRIPE_PRICE_CONSULT_HAIR_LOSS: z.string().min(1, "Production requires STRIPE_PRICE_CONSULT_HAIR_LOSS"),
  STRIPE_PRICE_CONSULT_WOMENS_HEALTH: z.string().min(1, "Production requires STRIPE_PRICE_CONSULT_WOMENS_HEALTH"),
  STRIPE_PRICE_CONSULT_WEIGHT_LOSS: z.string().min(1, "Production requires STRIPE_PRICE_CONSULT_WEIGHT_LOSS"),
  STRIPE_PRICE_PRIORITY_FEE: z.string().min(1, "Production requires STRIPE_PRICE_PRIORITY_FEE"),
  STRIPE_PRICE_REPEAT_RX_MONTHLY: z.string().min(1, "Production requires STRIPE_PRICE_REPEAT_RX_MONTHLY"),
  UPSTASH_REDIS_REST_URL: z.string().url("Production requires UPSTASH_REDIS_REST_URL for rate limiting"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "Production requires UPSTASH_REDIS_REST_TOKEN for rate limiting"),
  CRON_SECRET: z.string().min(1, "Production requires CRON_SECRET"),
  RESEND_API_KEY: z.string().min(1, "Production requires RESEND_API_KEY for email delivery"),
  PHI_ENCRYPTION_ENABLED: z.literal("true", { error: "Production requires PHI_ENCRYPTION_ENABLED=true" }),
  PHI_MASTER_KEY: z.string().min(32, "Production requires PHI_MASTER_KEY (min 32 chars)"),
})

/**
 * Validated environment - throws at import time if invalid
 * This ensures builds fail fast on missing required vars
 */
function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env)
  
  if (!parsed.success) {
    const formatted = parsed.error.format()
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment variables:", JSON.stringify(formatted, null, 2))
    throw new Error(`Environment validation failed: ${parsed.error.message}`)
  }
  
  // Additional checks for production (skip in CI — NODE_ENV=production is set by Next.js build but CI isn't production)
  if (parsed.data.NODE_ENV === "production" && !process.env.CI) {
    const prodParsed = productionRequirements.safeParse(process.env)
    if (!prodParsed.success) {
      const missing = prodParsed.error.issues.map(i => i.path.join(".")).join(", ")
      // eslint-disable-next-line no-console
      console.error(`❌ Missing production environment variables: ${missing}`)
      throw new Error(`Production environment validation failed: ${missing}`)
    }
  }
  
  return parsed.data
}

// Validate on module load (fails build if invalid)
const validatedEnv = validateServerEnv()

if (!validatedEnv.TELEGRAM_BOT_TOKEN || !validatedEnv.TELEGRAM_CHAT_ID) {
  // eslint-disable-next-line no-console
  console.warn("[env] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — real-time alerts disabled")
}

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
    if (process.env.NODE_ENV === 'development') log.warn("RESEND_API_KEY not set - emails will be logged only", {})
    return ""
  }
  return key
}

/**
 * Resend from email address
 * Format: "Name <email@domain.com>"
 */
export function getResendFromEmail(): string {
  const raw = process.env.RESEND_FROM_EMAIL || `${COMPANY_NAME} <${CONTACT_EMAIL}>`
  // Strip wrapping quotes — a common env var misconfiguration that causes Resend 422 errors
  return raw.replace(/^["']|["']$/g, "")
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

/**
 * Vercel AI Gateway API key for AI features
 */
export function getVercelAIGatewayApiKey(): string {
  const key = process.env.VERCEL_AI_GATEWAY_API_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'development') log.warn("VERCEL_AI_GATEWAY_API_KEY not set - AI features will not work", {})
    return ""
  }
  return key
}

/**
 * Resend webhook secret for verifying webhook signatures
 */
export function getResendWebhookSecret(): string {
  const key = process.env.RESEND_WEBHOOK_SECRET
  if (!key) {
    if (process.env.NODE_ENV === 'development') log.warn("RESEND_WEBHOOK_SECRET not set - webhook verification disabled", {})
    return ""
  }
  return key
}

/**
 * Internal API secret for server-to-server calls
 * Required in all environments for security
 */
export function getInternalApiSecret(): string {
  const key = process.env.INTERNAL_API_SECRET
  if (!key) {
    throw new Error("Missing INTERNAL_API_SECRET environment variable")
  }
  return key
}

/**
 * Admin email addresses (comma-separated in env)
 * Used to identify admin users for special permissions
 */
export function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS
  if (!emails) {
    // Default fallback for backwards compatibility
    return [CONTACT_EMAIL_ADMIN]
  }
  return emails.split(",").map(e => e.trim().toLowerCase())
}

/**
 * Check if an email is an admin
 */
export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase())
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
  get vercelAIGatewayApiKey() {
    return getVercelAIGatewayApiKey()
  },
  get resendWebhookSecret() {
    return getResendWebhookSecret()
  },
  get internalApiSecret() {
    return getInternalApiSecret()
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
    return validatedEnv.NODE_ENV === "development"
  },
  get isProd() {
    return validatedEnv.NODE_ENV === "production"
  },
  
  // Rate limiting
  get upstashRedisUrl() {
    return validatedEnv.UPSTASH_REDIS_REST_URL
  },
  get upstashRedisToken() {
    return validatedEnv.UPSTASH_REDIS_REST_TOKEN
  },
  get hasUpstash() {
    return !!(validatedEnv.UPSTASH_REDIS_REST_URL && validatedEnv.UPSTASH_REDIS_REST_TOKEN)
  },
}
