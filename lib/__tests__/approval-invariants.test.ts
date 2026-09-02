import { beforeEach,describe, expect, it, vi } from 'vitest'

import { mockSupabaseFrom, resetAllMocks } from './setup'

// Mock server-only before any imports
vi.mock('server-only', () => ({}))

describe('Fraud Detection', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('checkSuspiciousMedicare', () => {
    it('should flag all-same-digit Medicare numbers', async () => {
      const { checkSuspiciousMedicare } = await import('@/lib/security/fraud-detector')

      const result = checkSuspiciousMedicare('1111111111')

      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
      expect(result?.severity).toBe('high')
    })

    it('should flag sequential Medicare numbers', async () => {
      const { checkSuspiciousMedicare } = await import('@/lib/security/fraud-detector')

      const result = checkSuspiciousMedicare('1234567890')

      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
    })

    it('should flag reverse sequential Medicare numbers', async () => {
      const { checkSuspiciousMedicare } = await import('@/lib/security/fraud-detector')

      const result = checkSuspiciousMedicare('0987654321')

      expect(result).not.toBeNull()
      expect(result?.type).toBe('suspicious_medicare')
    })

    it('should not flag valid Medicare numbers', async () => {
      const { checkSuspiciousMedicare } = await import('@/lib/security/fraud-detector')

      const result = checkSuspiciousMedicare('2345678901')

      expect(result).toBeNull()
    })
  })

  describe('checkRapidCompletion', () => {
    it('should flag forms completed in under 10 seconds as high severity', async () => {
      const { checkRapidCompletion } = await import('@/lib/security/fraud-detector')

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 5000) // 5 seconds later

      const result = checkRapidCompletion(startTime, endTime)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('rapid_completion')
      expect(result?.severity).toBe('high') // <10 seconds = high severity
    })

    it('should flag medium severity for 10-30 seconds', async () => {
      const { checkRapidCompletion } = await import('@/lib/security/fraud-detector')

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 20000) // 20 seconds later

      const result = checkRapidCompletion(startTime, endTime)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('rapid_completion')
      expect(result?.severity).toBe('medium')
    })

    it('should not flag forms taking normal time', async () => {
      const { checkRapidCompletion } = await import('@/lib/security/fraud-detector')

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 120000) // 2 minutes later

      const result = checkRapidCompletion(startTime, endTime)

      expect(result).toBeNull()
    })

    it('should not flag forms taking exactly 30 seconds', async () => {
      const { checkRapidCompletion } = await import('@/lib/security/fraud-detector')

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 30000) // exactly 30 seconds

      const result = checkRapidCompletion(startTime, endTime)

      expect(result).toBeNull()
    })
  })

  describe('saveFraudFlags', () => {
    it('persists only PHI-free reason and count primitives in flag details', async () => {
      const insert = vi.fn().mockResolvedValue({ error: null })
      mockSupabaseFrom.mockReturnValue({ insert })
      const { saveFraudFlags } = await import('@/lib/security/fraud-detector')

      await saveFraudFlags('intake-owner-id', 'patient-owner-id', [
        {
          type: 'suspicious_medicare',
          severity: 'high',
          details: {
            value: '1234567890',
            pattern: '/^1234567890$/',
          },
        },
        {
          type: 'duplicate_medication',
          severity: 'critical',
          details: {
            medicationCode: 'RAW-MEDICATION-CODE',
            matchingRequestCount: 2,
            matchingPatientIds: ['raw-patient-id'],
            existingRequestIds: ['raw-request-id'],
            reason: 'Same Medicare number used across accounts for the same medication',
          },
        },
        {
          type: 'rolling_window_abuse',
          severity: 'medium',
          details: {
            certificateCount: 3,
            totalDays: 5,
            period: '14_days',
            requestIds: ['raw-intake-id'],
          },
        },
      ])

      const inserts = insert.mock.calls[0]?.[0] as Array<{ details: Record<string, unknown> }>
      expect(inserts.map((row) => row.details)).toEqual([
        { reason: 'known_invalid_pattern' },
        {
          reason: 'same_medicare_across_accounts_for_same_medication',
          matchingRequestCount: 2,
        },
        { certificateCount: 3, totalDays: 5, period: '14_days' },
      ])
      expect(JSON.stringify(inserts.map((row) => row.details))).not.toMatch(
        /1234567890|RAW-MEDICATION-CODE|raw-patient-id|raw-request-id|raw-intake-id/,
      )
    })
  })
})
