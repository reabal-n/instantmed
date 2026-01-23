import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockSupabaseSingle as _mockSupabaseSingle, mockDbSuccess, mockDbError, resetAllMocks } from './setup'

// Mock server-only before any imports
vi.mock('server-only', () => ({}))

describe('Approval Invariants', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('assertDraftExists', () => {
    it('should throw if no draft exists for request', async () => {
      mockDbError('Not found')

      const { assertDraftExists } = await import('@/lib/approval/med-cert-invariants')

      await expect(assertDraftExists('test-request-id')).rejects.toThrow(
        'No med_cert draft found for request test-request-id'
      )
    })

    it('should return draft data if it exists', async () => {
      const mockDraft = { id: 'draft-123', request_id: 'test-request-id' }
      mockDbSuccess(mockDraft)

      const { assertDraftExists } = await import('@/lib/approval/med-cert-invariants')
      const result = await assertDraftExists('test-request-id')

      expect(result).toEqual(mockDraft)
    })
  })

  describe('assertNotAlreadyApproved', () => {
    it('should throw if request is already approved', async () => {
      mockDbSuccess({ status: 'approved' })

      const { assertNotAlreadyApproved } = await import('@/lib/approval/med-cert-invariants')

      await expect(assertNotAlreadyApproved('test-request-id')).rejects.toThrow(
        'Request test-request-id has already been approved'
      )
    })

    it('should not throw for pending requests', async () => {
      mockDbSuccess({ status: 'pending_review' })

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
  beforeEach(() => {
    resetAllMocks()
  })

  describe('checkSuspiciousMedicare', () => {
    it('should flag all-same-digit Medicare numbers', async () => {
      const { checkSuspiciousMedicare } = await import('@/lib/fraud/detector')

      const result = checkSuspiciousMedicare('1111111111')

      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
      expect(result?.severity).toBe('high')
    })

    it('should flag sequential Medicare numbers', async () => {
      const { checkSuspiciousMedicare } = await import('@/lib/fraud/detector')

      const result = checkSuspiciousMedicare('1234567890')

      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
    })

    it('should flag reverse sequential Medicare numbers', async () => {
      const { checkSuspiciousMedicare } = await import('@/lib/fraud/detector')

      const result = checkSuspiciousMedicare('0987654321')

      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
    })

    it('should not flag valid Medicare numbers', async () => {
      const { checkSuspiciousMedicare } = await import('@/lib/fraud/detector')

      const result = checkSuspiciousMedicare('2345678901')

      expect(result).toBeNull()
    })
  })

  describe('checkRapidCompletion', () => {
    it('should flag forms completed in under 10 seconds as high severity', async () => {
      const { checkRapidCompletion } = await import('@/lib/fraud/detector')

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 5000) // 5 seconds later

      const result = checkRapidCompletion(startTime, endTime)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('rapid_completion')
      expect(result?.severity).toBe('high') // <10 seconds = high severity
    })

    it('should flag medium severity for 10-30 seconds', async () => {
      const { checkRapidCompletion } = await import('@/lib/fraud/detector')

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 20000) // 20 seconds later

      const result = checkRapidCompletion(startTime, endTime)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('rapid_completion')
      expect(result?.severity).toBe('medium')
    })

    it('should not flag forms taking normal time', async () => {
      const { checkRapidCompletion } = await import('@/lib/fraud/detector')

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 120000) // 2 minutes later

      const result = checkRapidCompletion(startTime, endTime)

      expect(result).toBeNull()
    })

    it('should not flag forms taking exactly 30 seconds', async () => {
      const { checkRapidCompletion } = await import('@/lib/fraud/detector')

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 30000) // exactly 30 seconds

      const result = checkRapidCompletion(startTime, endTime)

      expect(result).toBeNull()
    })
  })
})
