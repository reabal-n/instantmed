import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only before any imports
vi.mock('server-only', () => ({}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
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

// Create chainable mock for Supabase queries
function createMockQueryBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  return mock
}

// Store the mock client for tests to modify
let mockQueryBuilder = createMockQueryBuilder({ data: null, error: null })

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => mockQueryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  })),
}))

// Mock Supabase JS (for fraud detector)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}))

describe('Approval Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default empty response
    mockQueryBuilder = createMockQueryBuilder({ data: null, error: { message: 'Not found' } })
  })

  describe('assertDraftExists', () => {
    it('should throw if no draft exists for request', async () => {
      mockQueryBuilder = createMockQueryBuilder({ data: null, error: { message: 'Not found' } })
      
      const { assertDraftExists } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(assertDraftExists('test-request-id')).rejects.toThrow(
        'No med_cert draft found for request test-request-id'
      )
    })

    it('should return draft data if it exists', async () => {
      const mockDraft = { id: 'draft-123', request_id: 'test-request-id' }
      mockQueryBuilder = createMockQueryBuilder({ data: mockDraft, error: null })
      
      // Need to reset module cache to pick up new mock
      vi.resetModules()
      const { assertDraftExists } = await import('@/lib/approval/med-cert-invariants')
      const result = await assertDraftExists('test-request-id')
      
      expect(result).toEqual(mockDraft)
    })
  })

  describe('assertNotAlreadyApproved', () => {
    it('should throw if request is already approved', async () => {
      mockQueryBuilder = createMockQueryBuilder({ 
        data: { status: 'approved' }, 
        error: null 
      })
      
      vi.resetModules()
      const { assertNotAlreadyApproved } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(assertNotAlreadyApproved('test-request-id')).rejects.toThrow(
        'Request test-request-id has already been approved'
      )
    })

    it('should not throw for pending requests', async () => {
      mockQueryBuilder = createMockQueryBuilder({ 
        data: { status: 'pending_review' }, 
        error: null 
      })
      
      vi.resetModules()
      const { assertNotAlreadyApproved } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(assertNotAlreadyApproved('test-request-id')).resolves.not.toThrow()
    })
  })

  describe('assertDocumentUrlIsPermanent', () => {
    it('should throw for non-Supabase URLs', async () => {
      vi.resetModules()
      const { assertDocumentUrlIsPermanent } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(
        assertDocumentUrlIsPermanent('https://example.com/fake.pdf')
      ).rejects.toThrow('Invalid Supabase storage URL')
    })

    it('should validate Supabase storage URLs', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      
      vi.resetModules()
      const { assertDocumentUrlIsPermanent } = await import('@/lib/approval/med-cert-invariants')
      
      const result = await assertDocumentUrlIsPermanent(
        'https://xxx.supabase.co/storage/v1/object/public/documents/uuid/file.pdf'
      )
      
      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://xxx.supabase.co/storage/v1/object/public/documents/uuid/file.pdf',
        { method: 'HEAD' }
      )
    })

    it('should throw if PDF URL returns non-200', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
      
      vi.resetModules()
      const { assertDocumentUrlIsPermanent } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(
        assertDocumentUrlIsPermanent(
          'https://xxx.supabase.co/storage/v1/object/public/documents/uuid/file.pdf'
        )
      ).rejects.toThrow('PDF URL not accessible')
    })
  })
})

describe('Fraud Detection', () => {
  describe('checkSuspiciousMedicare', () => {
    it('should flag all-same-digit Medicare numbers', async () => {
      vi.resetModules()
      const { checkSuspiciousMedicare } = await import('@/lib/fraud/detector')
      
      const result = checkSuspiciousMedicare('1111111111')
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
      expect(result?.severity).toBe('high')
    })

    it('should flag sequential Medicare numbers', async () => {
      vi.resetModules()
      const { checkSuspiciousMedicare } = await import('@/lib/fraud/detector')
      
      const result = checkSuspiciousMedicare('1234567890')
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
    })

    it('should flag reverse sequential Medicare numbers', async () => {
      vi.resetModules()
      const { checkSuspiciousMedicare } = await import('@/lib/fraud/detector')
      
      const result = checkSuspiciousMedicare('0987654321')
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
    })

    it('should not flag valid Medicare numbers', async () => {
      vi.resetModules()
      const { checkSuspiciousMedicare } = await import('@/lib/fraud/detector')
      
      const result = checkSuspiciousMedicare('2345678901')
      
      expect(result).toBeNull()
    })
  })

  describe('checkRapidCompletion', () => {
    it('should flag forms completed in under 10 seconds as high severity', async () => {
      vi.resetModules()
      const { checkRapidCompletion } = await import('@/lib/fraud/detector')
      
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 5000) // 5 seconds later
      
      const result = checkRapidCompletion(startTime, endTime)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe('rapid_completion')
      expect(result?.severity).toBe('high') // <10 seconds = high severity
    })

    it('should flag medium severity for 10-30 seconds', async () => {
      vi.resetModules()
      const { checkRapidCompletion } = await import('@/lib/fraud/detector')
      
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 20000) // 20 seconds later
      
      const result = checkRapidCompletion(startTime, endTime)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe('rapid_completion')
      expect(result?.severity).toBe('medium')
    })

    it('should not flag forms taking normal time', async () => {
      vi.resetModules()
      const { checkRapidCompletion } = await import('@/lib/fraud/detector')
      
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 120000) // 2 minutes later
      
      const result = checkRapidCompletion(startTime, endTime)
      
      expect(result).toBeNull()
    })

    it('should not flag forms taking exactly 30 seconds', async () => {
      vi.resetModules()
      const { checkRapidCompletion } = await import('@/lib/fraud/detector')
      
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 30000) // exactly 30 seconds
      
      const result = checkRapidCompletion(startTime, endTime)
      
      expect(result).toBeNull()
    })
  })
})
