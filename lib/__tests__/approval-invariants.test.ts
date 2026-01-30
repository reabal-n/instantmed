import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetAllMocks } from './setup'

// Mock server-only before any imports
vi.mock('server-only', () => ({}))

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
