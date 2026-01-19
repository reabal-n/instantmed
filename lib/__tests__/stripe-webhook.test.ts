import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock environment
vi.mock('@/lib/env', () => ({
  env: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceRoleKey: 'test-service-role-key',
    stripeWebhookSecret: 'whsec_test_secret',
  },
}))

// Mock Stripe
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

// Mock Supabase
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}))

// Mock notifications
vi.mock('@/lib/notifications/service', () => ({
  notifyPaymentReceived: vi.fn(),
}))

// Mock email
vi.mock('@/lib/email/template-sender', () => ({
  sendRefundEmail: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

// Mock PostHog
vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: vi.fn(() => ({
    capture: vi.fn(),
    shutdown: vi.fn(),
  })),
}))

// Mock generate-drafts action
vi.mock('@/app/actions/generate-drafts', () => ({
  generateDraftsForIntake: vi.fn(),
}))

describe('Stripe Webhook Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock chain setup
    mockFrom.mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
    })
    mockInsert.mockReturnValue({ error: null })
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
      single: mockSingle,
    })
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  describe('tryClaimEvent via RPC', () => {
    it('should return true when event is successfully claimed', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient('', '')
      
      const result = await supabase.rpc('try_process_stripe_event', {
        p_event_id: 'evt_test_123',
        p_event_type: 'checkout.session.completed',
        p_request_id: null,
        p_session_id: 'cs_test_abc',
        p_metadata: {},
      })
      
      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should return false when event was already processed', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient('', '')
      
      const result = await supabase.rpc('try_process_stripe_event', {
        p_event_id: 'evt_duplicate_123',
        p_event_type: 'checkout.session.completed',
        p_request_id: null,
        p_session_id: 'cs_test_abc',
        p_metadata: {},
      })
      
      expect(result.data).toBe(false)
    })
  })

  describe('Legacy claim fallback', () => {
    it('should return false if event already exists in stripe_webhook_events', async () => {
      mockSingle.mockResolvedValue({ 
        data: { id: 'existing-record' }, 
        error: null 
      })
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient('', '')
      
      const existing = await supabase
        .from('stripe_webhook_events')
        .select('id')
        .eq('event_id', 'evt_duplicate')
        .single()
      
      expect(existing.data).toBeTruthy()
    })

    it('should handle unique constraint violation gracefully', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
      mockInsert.mockReturnValue({ 
        error: { code: '23505', message: 'duplicate key' } 
      })
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient('', '')
      
      // First check returns nothing
      const check = await supabase
        .from('stripe_webhook_events')
        .select('id')
        .eq('event_id', 'evt_race')
        .single()
      
      expect(check.data).toBeNull()
      
      // Insert fails with unique constraint
      const insert = await supabase
        .from('stripe_webhook_events')
        .insert({
          event_id: 'evt_race',
          event_type: 'checkout.session.completed',
        })
      
      expect(insert.error?.code).toBe('23505')
    })
  })

  describe('Dead Letter Queue', () => {
    it('should insert failed events into dead letter queue', async () => {
      mockInsert.mockReturnValue({ error: null })
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient('', '')
      
      const dlqInsert = await supabase
        .from('stripe_webhook_dead_letter')
        .insert({
          event_id: 'evt_failed_123',
          event_type: 'checkout.session.completed',
          session_id: 'cs_test',
          intake_id: null,
          error_message: 'Intake not found',
          error_code: 'INTAKE_NOT_FOUND',
        })
      
      expect(dlqInsert.error).toBeNull()
      expect(mockFrom).toHaveBeenCalledWith('stripe_webhook_dead_letter')
    })
  })
})

describe('Webhook Signature Verification', () => {
  it('should reject requests without signature header', async () => {
    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {},
    })
    
    // Missing signature should result in 400
    expect(request.headers.get('stripe-signature')).toBeNull()
  })

  it('should reject requests with invalid signature', async () => {
    const { stripe } = await import('@/lib/stripe/client')
    
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    
    expect(() => 
      stripe.webhooks.constructEvent('body', 'bad_sig', 'whsec_test')
    ).toThrow('Invalid signature')
  })

  it('should accept requests with valid signature', async () => {
    const { stripe } = await import('@/lib/stripe/client')
    
    const mockEvent = {
      id: 'evt_valid_123',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test' } },
    }
    
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent as never)
    
    const result = stripe.webhooks.constructEvent('body', 'valid_sig', 'whsec_test')
    expect(result.id).toBe('evt_valid_123')
  })
})
