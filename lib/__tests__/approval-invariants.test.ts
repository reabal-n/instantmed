import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn(),
              })),
            })),
          })),
          single: vi.fn(),
        })),
      })),
    })),
  })),
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

describe('Approval Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('assertDraftExists', () => {
    it('should throw if no draft exists for request', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockClient = await createClient()
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      } as never)

      const { assertDraftExists } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(assertDraftExists('test-request-id')).rejects.toThrow(
        'No med_cert draft found for request test-request-id'
      )
    })

    it('should return draft data if it exists', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockClient = await createClient()
      const mockDraft = { id: 'draft-123', request_id: 'test-request-id' }
      
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockDraft, error: null }),
            }),
          }),
        }),
      } as never)

      const { assertDraftExists } = await import('@/lib/approval/med-cert-invariants')
      const result = await assertDraftExists('test-request-id')
      
      expect(result).toEqual(mockDraft)
    })
  })

  describe('assertNotAlreadyApproved', () => {
    it('should throw if request is already approved', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockClient = await createClient()
      
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { status: 'approved' }, 
              error: null 
            }),
          }),
        }),
      } as never)

      const { assertNotAlreadyApproved } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(assertNotAlreadyApproved('test-request-id')).rejects.toThrow(
        'Request test-request-id has already been approved'
      )
    })

    it('should not throw for pending requests', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockClient = await createClient()
      
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { status: 'pending_review' }, 
              error: null 
            }),
          }),
        }),
      } as never)

      const { assertNotAlreadyApproved } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(assertNotAlreadyApproved('test-request-id')).resolves.not.toThrow()
    })
  })

  describe('assertDocumentUrlIsPermanent', () => {
    it('should throw for non-Supabase URLs', async () => {
      const { assertDocumentUrlIsPermanent } = await import('@/lib/approval/med-cert-invariants')
      
      await expect(
        assertDocumentUrlIsPermanent('https://example.com/fake.pdf')
      ).rejects.toThrow('Invalid Supabase storage URL')
    })

    it('should validate Supabase storage URLs', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      
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
      const { runFraudChecks } = await import('@/lib/fraud/detector')
      
      const result = await runFraudChecks({
        patientId: 'test-patient',
        medicareNumber: '1111111111',
        category: 'medical_certificate',
        subtype: 'work',
      })
      
      expect(result.flagged).toBe(true)
      expect(result.flags.some(f => f.type === 'suspicious_medicare')).toBe(true)
    })

    it('should flag sequential Medicare numbers', async () => {
      const { runFraudChecks } = await import('@/lib/fraud/detector')
      
      const result = await runFraudChecks({
        patientId: 'test-patient',
        medicareNumber: '1234567890',
        category: 'medical_certificate',
        subtype: 'work',
      })
      
      expect(result.flagged).toBe(true)
      expect(result.flags.some(f => f.type === 'suspicious_medicare')).toBe(true)
    })
  })

  describe('checkRapidCompletion', () => {
    it('should flag forms completed in under 30 seconds', async () => {
      const { runFraudChecks } = await import('@/lib/fraud/detector')
      
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 10000) // 10 seconds later
      
      const result = await runFraudChecks({
        patientId: 'test-patient',
        category: 'medical_certificate',
        subtype: 'work',
        formStartTime: startTime,
        formEndTime: endTime,
      })
      
      expect(result.flagged).toBe(true)
      expect(result.flags.some(f => f.type === 'rapid_completion')).toBe(true)
    })

    it('should not flag forms taking normal time', async () => {
      const { runFraudChecks } = await import('@/lib/fraud/detector')
      
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 120000) // 2 minutes later
      
      const result = await runFraudChecks({
        patientId: 'test-patient',
        category: 'medical_certificate',
        subtype: 'work',
        formStartTime: startTime,
        formEndTime: endTime,
      })
      
      expect(result.flags.some(f => f.type === 'rapid_completion')).toBe(false)
    })
  })
})
