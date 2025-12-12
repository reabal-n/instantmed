import { z } from 'zod'

/**
 * Environment variable validation schema
 * Validates at build/runtime to catch configuration errors early
 */

const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'Invalid Stripe secret key'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'Invalid Stripe webhook secret'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Invalid Stripe publishable key'),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),

  // Feature flags
  ENABLE_TEST_MODE: z.string().transform(v => v === 'true').default('false'),
})

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Invalid Stripe publishable key'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>

/**
 * Validates server environment variables
 * Call this in server components/actions only
 */
export function validateServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.format()
    console.error('❌ Invalid server environment variables:', errors)
    throw new Error(`Invalid server environment variables: ${JSON.stringify(errors, null, 2)}`)
  }

  return result.data
}

/**
 * Validates client environment variables
 * Safe to use in client components
 */
export function validateClientEnv(): ClientEnv {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }

  const result = clientEnvSchema.safeParse(env)

  if (!result.success) {
    const errors = result.error.format()
    console.error('❌ Invalid client environment variables:', errors)
    throw new Error(`Invalid client environment variables: ${JSON.stringify(errors, null, 2)}`)
  }

  return result.data
}

/**
 * Get validated server env (cached)
 */
let serverEnvCache: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (serverEnvCache) return serverEnvCache
  serverEnvCache = validateServerEnv()
  return serverEnvCache
}

/**
 * Get validated client env (cached)
 */
let clientEnvCache: ClientEnv | null = null

export function getClientEnv(): ClientEnv {
  if (clientEnvCache) return clientEnvCache
  clientEnvCache = validateClientEnv()
  return clientEnvCache
}

/**
 * Type-safe env access with fallbacks for development
 */
export const env = {
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  },
  get supabaseServiceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  },
  get stripeSecretKey() {
    return process.env.STRIPE_SECRET_KEY ?? ''
  },
  get stripePublishableKey() {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? ''
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development'
  },
  get isDev() {
    return this.nodeEnv === 'development'
  },
  get isProd() {
    return this.nodeEnv === 'production'
  },
  get isTest() {
    return this.nodeEnv === 'test'
  },
  get testModeEnabled() {
    return process.env.ENABLE_TEST_MODE === 'true'
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? ''
  },
}
