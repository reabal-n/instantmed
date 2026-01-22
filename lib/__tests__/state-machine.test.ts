import { describe, it, expect } from 'vitest'
import {
  canTransition,
  getTransitionTrigger,
  getValidNextStates,
  STATE_TRANSITIONS,
  STATE_TO_DB_STATUS,
  STATE_TO_PAYMENT_STATUS,
  STATE_EMAIL_TRIGGERS,
  type RequestState,
} from '../state-machine/request-states'

describe('Request State Machine', () => {
  // ============================================================================
  // VALID STATE TRANSITIONS
  // ============================================================================

  describe('canTransition - valid transitions', () => {
    describe('Patient flow', () => {
      it('should allow draft -> awaiting_payment', () => {
        expect(canTransition('draft', 'awaiting_payment')).toBe(true)
      })

      it('should allow awaiting_payment -> paid', () => {
        expect(canTransition('awaiting_payment', 'paid')).toBe(true)
      })

      it('should allow awaiting_payment -> draft (payment failed)', () => {
        expect(canTransition('awaiting_payment', 'draft')).toBe(true)
      })
    })

    describe('System flow', () => {
      it('should allow paid -> awaiting_review', () => {
        expect(canTransition('paid', 'awaiting_review')).toBe(true)
      })
    })

    describe('Doctor flow', () => {
      it('should allow awaiting_review -> in_review', () => {
        expect(canTransition('awaiting_review', 'in_review')).toBe(true)
      })

      it('should allow in_review -> approved', () => {
        expect(canTransition('in_review', 'approved')).toBe(true)
      })

      it('should allow in_review -> declined', () => {
        expect(canTransition('in_review', 'declined')).toBe(true)
      })

      it('should allow in_review -> needs_info', () => {
        expect(canTransition('in_review', 'needs_info')).toBe(true)
      })

      it('should allow in_review -> awaiting_review (release)', () => {
        expect(canTransition('in_review', 'awaiting_review')).toBe(true)
      })
    })

    describe('Info follow-up', () => {
      it('should allow needs_info -> awaiting_review', () => {
        expect(canTransition('needs_info', 'awaiting_review')).toBe(true)
      })
    })

    describe('Completion', () => {
      it('should allow approved -> completed', () => {
        expect(canTransition('approved', 'completed')).toBe(true)
      })

      it('should allow declined -> completed', () => {
        expect(canTransition('declined', 'completed')).toBe(true)
      })
    })
  })

  // ============================================================================
  // INVALID STATE TRANSITIONS
  // ============================================================================

  describe('canTransition - invalid transitions', () => {
    it('should not allow draft -> approved (skip payment)', () => {
      expect(canTransition('draft', 'approved')).toBe(false)
    })

    it('should not allow draft -> in_review (skip payment)', () => {
      expect(canTransition('draft', 'in_review')).toBe(false)
    })

    it('should not allow awaiting_payment -> approved (skip review)', () => {
      expect(canTransition('awaiting_payment', 'approved')).toBe(false)
    })

    it('should not allow paid -> approved (skip review)', () => {
      expect(canTransition('paid', 'approved')).toBe(false)
    })

    it('should not allow awaiting_review -> approved (skip in_review)', () => {
      expect(canTransition('awaiting_review', 'approved')).toBe(false)
    })

    it('should not allow declined -> approved (reverse decision)', () => {
      expect(canTransition('declined', 'approved')).toBe(false)
    })

    it('should not allow approved -> declined (reverse decision)', () => {
      expect(canTransition('approved', 'declined')).toBe(false)
    })

    it('should not allow completed -> any state (terminal state)', () => {
      const states: RequestState[] = [
        'draft', 'awaiting_payment', 'paid', 'awaiting_review',
        'in_review', 'approved', 'declined', 'needs_info'
      ]

      for (const state of states) {
        expect(canTransition('completed', state)).toBe(false)
      }
    })

    it('should not allow completed -> completed', () => {
      expect(canTransition('completed', 'completed')).toBe(false)
    })

    it('should not allow backward transitions in main flow', () => {
      expect(canTransition('paid', 'awaiting_payment')).toBe(false)
      expect(canTransition('awaiting_review', 'paid')).toBe(false)
      expect(canTransition('approved', 'in_review')).toBe(false)
    })
  })

  // ============================================================================
  // TRANSITION TRIGGERS
  // ============================================================================

  describe('getTransitionTrigger', () => {
    it('should return SUBMIT_FORM for draft -> awaiting_payment', () => {
      expect(getTransitionTrigger('draft', 'awaiting_payment')).toBe('SUBMIT_FORM')
    })

    it('should return PAYMENT_SUCCESS for awaiting_payment -> paid', () => {
      expect(getTransitionTrigger('awaiting_payment', 'paid')).toBe('PAYMENT_SUCCESS')
    })

    it('should return PAYMENT_FAILED for awaiting_payment -> draft', () => {
      expect(getTransitionTrigger('awaiting_payment', 'draft')).toBe('PAYMENT_FAILED')
    })

    it('should return ENTER_QUEUE for paid -> awaiting_review', () => {
      expect(getTransitionTrigger('paid', 'awaiting_review')).toBe('ENTER_QUEUE')
    })

    it('should return DOCTOR_OPENS for awaiting_review -> in_review', () => {
      expect(getTransitionTrigger('awaiting_review', 'in_review')).toBe('DOCTOR_OPENS')
    })

    it('should return DOCTOR_APPROVES for in_review -> approved', () => {
      expect(getTransitionTrigger('in_review', 'approved')).toBe('DOCTOR_APPROVES')
    })

    it('should return DOCTOR_DECLINES for in_review -> declined', () => {
      expect(getTransitionTrigger('in_review', 'declined')).toBe('DOCTOR_DECLINES')
    })

    it('should return DOCTOR_REQUESTS_INFO for in_review -> needs_info', () => {
      expect(getTransitionTrigger('in_review', 'needs_info')).toBe('DOCTOR_REQUESTS_INFO')
    })

    it('should return DOCTOR_RELEASES for in_review -> awaiting_review', () => {
      expect(getTransitionTrigger('in_review', 'awaiting_review')).toBe('DOCTOR_RELEASES')
    })

    it('should return PATIENT_RESPONDS for needs_info -> awaiting_review', () => {
      expect(getTransitionTrigger('needs_info', 'awaiting_review')).toBe('PATIENT_RESPONDS')
    })

    it('should return DOCUMENT_SENT for approved -> completed', () => {
      expect(getTransitionTrigger('approved', 'completed')).toBe('DOCUMENT_SENT')
    })

    it('should return NOTIFICATION_SENT for declined -> completed', () => {
      expect(getTransitionTrigger('declined', 'completed')).toBe('NOTIFICATION_SENT')
    })

    it('should return null for invalid transitions', () => {
      expect(getTransitionTrigger('draft', 'approved')).toBeNull()
      expect(getTransitionTrigger('completed', 'draft')).toBeNull()
    })
  })

  // ============================================================================
  // VALID NEXT STATES
  // ============================================================================

  describe('getValidNextStates', () => {
    it('should return [awaiting_payment] for draft', () => {
      const nextStates = getValidNextStates('draft')
      expect(nextStates).toContain('awaiting_payment')
      expect(nextStates).toHaveLength(1)
    })

    it('should return [paid, draft] for awaiting_payment', () => {
      const nextStates = getValidNextStates('awaiting_payment')
      expect(nextStates).toContain('paid')
      expect(nextStates).toContain('draft')
      expect(nextStates).toHaveLength(2)
    })

    it('should return [awaiting_review] for paid', () => {
      const nextStates = getValidNextStates('paid')
      expect(nextStates).toContain('awaiting_review')
      expect(nextStates).toHaveLength(1)
    })

    it('should return [in_review] for awaiting_review', () => {
      const nextStates = getValidNextStates('awaiting_review')
      expect(nextStates).toContain('in_review')
      expect(nextStates).toHaveLength(1)
    })

    it('should return [approved, declined, needs_info, awaiting_review] for in_review', () => {
      const nextStates = getValidNextStates('in_review')
      expect(nextStates).toContain('approved')
      expect(nextStates).toContain('declined')
      expect(nextStates).toContain('needs_info')
      expect(nextStates).toContain('awaiting_review')
      expect(nextStates).toHaveLength(4)
    })

    it('should return [completed] for approved', () => {
      const nextStates = getValidNextStates('approved')
      expect(nextStates).toContain('completed')
      expect(nextStates).toHaveLength(1)
    })

    it('should return [completed] for declined', () => {
      const nextStates = getValidNextStates('declined')
      expect(nextStates).toContain('completed')
      expect(nextStates).toHaveLength(1)
    })

    it('should return [awaiting_review] for needs_info', () => {
      const nextStates = getValidNextStates('needs_info')
      expect(nextStates).toContain('awaiting_review')
      expect(nextStates).toHaveLength(1)
    })

    it('should return [] for completed (terminal state)', () => {
      const nextStates = getValidNextStates('completed')
      expect(nextStates).toHaveLength(0)
    })
  })

  // ============================================================================
  // DATABASE STATUS MAPPINGS
  // ============================================================================

  describe('STATE_TO_DB_STATUS', () => {
    it('should map draft to pending', () => {
      expect(STATE_TO_DB_STATUS.draft).toBe('pending')
    })

    it('should map awaiting_payment to pending', () => {
      expect(STATE_TO_DB_STATUS.awaiting_payment).toBe('pending')
    })

    it('should map paid to pending', () => {
      expect(STATE_TO_DB_STATUS.paid).toBe('pending')
    })

    it('should map awaiting_review to pending', () => {
      expect(STATE_TO_DB_STATUS.awaiting_review).toBe('pending')
    })

    it('should map in_review to pending', () => {
      expect(STATE_TO_DB_STATUS.in_review).toBe('pending')
    })

    it('should map approved to approved', () => {
      expect(STATE_TO_DB_STATUS.approved).toBe('approved')
    })

    it('should map declined to declined', () => {
      expect(STATE_TO_DB_STATUS.declined).toBe('declined')
    })

    it('should map needs_info to needs_follow_up', () => {
      expect(STATE_TO_DB_STATUS.needs_info).toBe('needs_follow_up')
    })

    it('should map completed to approved', () => {
      expect(STATE_TO_DB_STATUS.completed).toBe('approved')
    })

    it('should have mapping for all states', () => {
      const allStates: RequestState[] = [
        'draft', 'awaiting_payment', 'paid', 'awaiting_review',
        'in_review', 'approved', 'declined', 'needs_info', 'completed'
      ]

      for (const state of allStates) {
        expect(STATE_TO_DB_STATUS[state]).toBeDefined()
      }
    })
  })

  // ============================================================================
  // PAYMENT STATUS MAPPINGS
  // ============================================================================

  describe('STATE_TO_PAYMENT_STATUS', () => {
    it('should map draft to pending_payment', () => {
      expect(STATE_TO_PAYMENT_STATUS.draft).toBe('pending_payment')
    })

    it('should map awaiting_payment to pending_payment', () => {
      expect(STATE_TO_PAYMENT_STATUS.awaiting_payment).toBe('pending_payment')
    })

    it('should map paid to paid', () => {
      expect(STATE_TO_PAYMENT_STATUS.paid).toBe('paid')
    })

    it('should map all post-payment states to paid', () => {
      const postPaymentStates: RequestState[] = [
        'awaiting_review', 'in_review', 'approved', 'declined', 'needs_info', 'completed'
      ]

      for (const state of postPaymentStates) {
        expect(STATE_TO_PAYMENT_STATUS[state]).toBe('paid')
      }
    })
  })

  // ============================================================================
  // EMAIL TRIGGERS
  // ============================================================================

  describe('STATE_EMAIL_TRIGGERS', () => {
    it('should trigger request_received email for awaiting_review', () => {
      expect(STATE_EMAIL_TRIGGERS.awaiting_review).toBe('request_received')
    })

    it('should trigger payment_confirmed email for paid', () => {
      expect(STATE_EMAIL_TRIGGERS.paid).toBe('payment_confirmed')
    })

    it('should trigger request_approved email for approved', () => {
      expect(STATE_EMAIL_TRIGGERS.approved).toBe('request_approved')
    })

    it('should trigger request_declined email for declined', () => {
      expect(STATE_EMAIL_TRIGGERS.declined).toBe('request_declined')
    })

    it('should trigger needs_more_info email for needs_info', () => {
      expect(STATE_EMAIL_TRIGGERS.needs_info).toBe('needs_more_info')
    })

    it('should not have email triggers for draft', () => {
      expect(STATE_EMAIL_TRIGGERS.draft).toBeUndefined()
    })

    it('should not have email triggers for in_review', () => {
      expect(STATE_EMAIL_TRIGGERS.in_review).toBeUndefined()
    })
  })

  // ============================================================================
  // TRANSITION COVERAGE
  // ============================================================================

  describe('STATE_TRANSITIONS completeness', () => {
    it('should have transitions defined', () => {
      expect(STATE_TRANSITIONS.length).toBeGreaterThan(0)
    })

    it('should have all transitions with from, to, and trigger', () => {
      for (const transition of STATE_TRANSITIONS) {
        expect(transition.from).toBeDefined()
        expect(transition.to).toBeDefined()
        expect(transition.trigger).toBeDefined()
      }
    })

    it('should have unique triggers for each from-to pair', () => {
      const seen = new Set<string>()

      for (const transition of STATE_TRANSITIONS) {
        const key = `${transition.from}->${transition.to}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    })
  })
})
