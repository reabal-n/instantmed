/**
 * Test Setup File
 *
 * Provides mocks and configuration for Vitest tests.
 * This file runs before each test file.
 */

import { vi } from 'vitest'

// ============================================================================
// ENVIRONMENT MOCKS
// ============================================================================

// Set test environment variables
// @ts-expect-error - NODE_ENV is read-only but we need to set it for tests
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_secret'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
process.env.INTERNAL_API_SECRET = 'test-internal-secret'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyE=' // 32-byte test key

// ============================================================================
// SUPABASE MOCK
// ============================================================================

export const mockSupabaseRpc = vi.fn()
export const mockSupabaseFrom = vi.fn()
export const mockSupabaseInsert = vi.fn()
export const mockSupabaseSelect = vi.fn()
export const mockSupabaseUpdate = vi.fn()
export const mockSupabaseDelete = vi.fn()
export const mockSupabaseEq = vi.fn()
export const mockSupabaseSingle = vi.fn()

// Create a fully chainable mock that returns itself for all query methods
const createChainableMock = () => {
  const chain: Record<string, unknown> = {}
  const terminalMethods = ['single', 'maybeSingle']
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'order', 'limit', 'range', 'is', 'in']

  // Terminal methods return the mock result
  for (const method of terminalMethods) {
    chain[method] = mockSupabaseSingle
  }

  // Chain methods return the chain itself
  for (const method of chainMethods) {
    chain[method] = vi.fn(() => chain)
  }

  return chain
}

const mockSupabaseChain = () => createChainableMock()

mockSupabaseFrom.mockImplementation(() => mockSupabaseChain())

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockSupabaseRpc,
    from: mockSupabaseFrom,
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  })),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({
    rpc: mockSupabaseRpc,
    from: mockSupabaseFrom,
    auth: {
      admin: {
        getUserById: vi.fn(),
      },
    },
  })),
}))

// ============================================================================
// STRIPE MOCK
// ============================================================================

export const mockStripeWebhooks = {
  constructEvent: vi.fn(),
}

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    webhooks: mockStripeWebhooks,
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    refunds: {
      create: vi.fn(),
    },
  },
}))

// ============================================================================
// CLERK MOCK
// ============================================================================

vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-id' })),
  currentUser: vi.fn(() => Promise.resolve({
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-id' })),
}))

// ============================================================================
// EMAIL MOCK
// ============================================================================

export const mockSendEmail = vi.fn()

vi.mock('@/lib/notifications/service', () => ({
  notifyPaymentReceived: vi.fn(),
  notifyRequestApproved: vi.fn(),
  notifyRequestDeclined: vi.fn(),
}))

vi.mock('@/lib/email/template-sender', () => ({
  sendRefundEmail: vi.fn(),
  sendCertificateEmail: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: mockSendEmail },
  })),
}))

// ============================================================================
// LOGGER MOCK
// ============================================================================

export const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  captureError: vi.fn(),
  child: vi.fn(() => mockLogger),
}

vi.mock('@/lib/observability/logger', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
  silentLogger: mockLogger,
}))

// ============================================================================
// SENTRY MOCK
// ============================================================================

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  setExtra: vi.fn(),
}))

// ============================================================================
// POSTHOG MOCK
// ============================================================================

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: vi.fn(() => ({
    capture: vi.fn(),
    shutdown: vi.fn(),
  })),
}))

// ============================================================================
// AI MOCK
// ============================================================================

vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(),
}))

// ============================================================================
// ENV MOCK
// ============================================================================

vi.mock('@/lib/env', () => ({
  env: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-anon-key',
    supabaseServiceRoleKey: 'test-service-role-key',
    stripeSecretKey: 'sk_test_secret',
    stripeWebhookSecret: 'whsec_test_secret',
    internalApiSecret: 'test-internal-secret',
    appUrl: 'http://localhost:3000',
    isDev: false,
    isProd: false,
    hasUpstash: false,
  },
  getAppUrl: vi.fn(() => 'http://localhost:3000'),
  getStripeSecretKey: vi.fn(() => 'sk_test_secret'),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test_secret'),
  getSupabaseServiceRoleKey: vi.fn(() => 'test-service-role-key'),
  isAdminEmail: vi.fn(() => false),
}))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  vi.clearAllMocks()
  mockSupabaseRpc.mockReset()
  mockSupabaseFrom.mockReset()
  mockSupabaseFrom.mockImplementation(() => mockSupabaseChain())
}

/**
 * Setup mock for successful database operation
 */
export function mockDbSuccess(data: unknown = null) {
  mockSupabaseSingle.mockResolvedValue({ data, error: null })
  return data
}

/**
 * Setup mock for failed database operation
 */
export function mockDbError(message: string, code?: string) {
  mockSupabaseSingle.mockResolvedValue({
    data: null,
    error: { message, code }
  })
}
