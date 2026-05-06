import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { z } from "zod"

const envConfigSource = readFileSync(join(process.cwd(), "lib/config/env.ts"), "utf8")

/**
 * Tests for environment validation schemas
 * Note: We test the Zod schemas directly rather than importing the env module
 * because the module uses 'server-only' and validates at import time
 */

// Replicate the schema from lib/env.ts for testing
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key required"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  INTERNAL_API_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

const productionRequirements = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("Production requires NEXT_PUBLIC_APP_URL"),
  STRIPE_SECRET_KEY: z.string().min(1, "Production requires STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "Production requires STRIPE_WEBHOOK_SECRET"),
  INTERNAL_API_SECRET: z.string().min(1, "Production requires INTERNAL_API_SECRET"),
})

describe('Environment Validation Schema', () => {
  describe('Required variables', () => {
    it('should require NEXT_PUBLIC_SUPABASE_URL', () => {
      const result = serverEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      })
      
      expect(result.success).toBe(false)
    })

    it('should require valid URL for NEXT_PUBLIC_SUPABASE_URL', () => {
      const result = serverEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      })
      
      expect(result.success).toBe(false)
    })

    it('should require NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
      const result = serverEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      })
      
      expect(result.success).toBe(false)
    })

    it('should require SUPABASE_SERVICE_ROLE_KEY', () => {
      const result = serverEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
        SUPABASE_SERVICE_ROLE_KEY: '',
      })
      
      expect(result.success).toBe(false)
    })

    it('should pass with all required vars present', () => {
      const result = serverEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      })
      
      expect(result.success).toBe(true)
    })
  })

  describe('Production requirements', () => {
    it('should require NEXT_PUBLIC_APP_URL in production', () => {
      const result = productionRequirements.safeParse({
        NEXT_PUBLIC_APP_URL: '',
        STRIPE_SECRET_KEY: 'sk_test_xxx',
        STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
        INTERNAL_API_SECRET: 'secret',
      })
      
      expect(result.success).toBe(false)
    })

    it('should require STRIPE_SECRET_KEY in production', () => {
      const result = productionRequirements.safeParse({
        NEXT_PUBLIC_APP_URL: 'https://app.example.com',
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
        INTERNAL_API_SECRET: 'secret',
      })
      
      expect(result.success).toBe(false)
    })

    it('should require STRIPE_WEBHOOK_SECRET in production', () => {
      const result = productionRequirements.safeParse({
        NEXT_PUBLIC_APP_URL: 'https://app.example.com',
        STRIPE_SECRET_KEY: 'sk_test_xxx',
        STRIPE_WEBHOOK_SECRET: '',
        INTERNAL_API_SECRET: 'secret',
      })
      
      expect(result.success).toBe(false)
    })

    it('should require INTERNAL_API_SECRET in production', () => {
      const result = productionRequirements.safeParse({
        NEXT_PUBLIC_APP_URL: 'https://app.example.com',
        STRIPE_SECRET_KEY: 'sk_test_xxx',
        STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
        INTERNAL_API_SECRET: '',
      })
      
      expect(result.success).toBe(false)
    })

    it('should pass with all production vars present', () => {
      const result = productionRequirements.safeParse({
        NEXT_PUBLIC_APP_URL: 'https://app.example.com',
        STRIPE_SECRET_KEY: 'sk_test_xxx',
        STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
        INTERNAL_API_SECRET: 'secret',
      })
      
      expect(result.success).toBe(true)
    })
  })

  describe('Optional variables', () => {
    it('should allow missing optional vars', () => {
      const result = serverEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        // All optional vars missing
      })
      
      expect(result.success).toBe(true)
    })

    it('should default NODE_ENV to development', () => {
      const result = serverEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      })
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development')
      }
    })
  })

  describe("Telegram alert preflight contract", () => {
    it("keeps paid-request Telegram alerts required for deployed production", () => {
      expect(envConfigSource).toContain(
        'TELEGRAM_BOT_TOKEN: z.string().min(1, "Production requires TELEGRAM_BOT_TOKEN for paid request alerts")',
      )
      expect(envConfigSource).toContain(
        'TELEGRAM_CHAT_ID: z.string().min(1, "Production requires TELEGRAM_CHAT_ID for paid request alerts")',
      )
    })

    it("does not emit false Telegram warnings during local Next production builds", () => {
      expect(envConfigSource).toContain("shouldRunProductionEnvPreflight")
      expect(envConfigSource).toContain('process.env.VERCEL_ENV === "production"')
      expect(envConfigSource).toContain('process.env.CI === "1"')
      expect(envConfigSource).toContain("INSTANTMED_VALIDATE_PRODUCTION_ENV")
      expect(envConfigSource).toContain("getMissingTelegramAlertEnv")
      expect(envConfigSource).not.toContain("real-time alerts disabled")
      expect(envConfigSource).not.toContain("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set")
    })
  })
})
