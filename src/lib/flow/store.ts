'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { FlowState, FlowActions, FlowStepId, IdentityData, ConsentRecord } from './types'

// Generate a unique session ID
function generateSessionId(): string {
  return `flow_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// Initial state factory
function createInitialState(): FlowState {
  return {
    currentStepId: 'service',
    currentGroupIndex: 0,
    serviceSlug: null,
    answers: {},
    identityData: null,
    consentsGiven: [],
    isEligible: null,
    eligibilityFailReason: null,
    draftId: null,
    intakeId: null,
    sessionId: generateSessionId(),
    startedAt: new Date().toISOString(),
    lastSavedAt: null,
    isLoading: false,
    isSaving: false,
    error: null,
  }
}

// Step order for navigation
const STEP_ORDER: FlowStepId[] = ['service', 'questionnaire', 'safety', 'account', 'details', 'checkout']

interface FlowStore extends FlowState, FlowActions {}

export const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      // ============================================
      // NAVIGATION
      // ============================================

      goToStep: (stepId) => {
        set({
          currentStepId: stepId,
          currentGroupIndex: 0,
          error: null,
        })
      },

      nextStep: () => {
        const { currentStepId } = get()
        const currentIndex = STEP_ORDER.indexOf(currentStepId)

        if (currentIndex < STEP_ORDER.length - 1) {
          set({
            currentStepId: STEP_ORDER[currentIndex + 1],
            currentGroupIndex: 0,
            error: null,
          })
        }
      },

      prevStep: () => {
        const { currentStepId } = get()
        const currentIndex = STEP_ORDER.indexOf(currentStepId)

        if (currentIndex > 0) {
          set({
            currentStepId: STEP_ORDER[currentIndex - 1],
            currentGroupIndex: 0,
            error: null,
          })
        }
      },

      nextGroup: () => {
        set((state) => ({
          currentGroupIndex: state.currentGroupIndex + 1,
        }))
      },

      prevGroup: () => {
        set((state) => ({
          currentGroupIndex: Math.max(0, state.currentGroupIndex - 1),
        }))
      },

      // ============================================
      // DATA
      // ============================================

      setServiceSlug: (slug) => {
        set({
          serviceSlug: slug,
          // Reset form data when service changes
          answers: {},
          isEligible: null,
          eligibilityFailReason: null,
          currentGroupIndex: 0,
        })
      },

      updateAnswer: (fieldId, value) => {
        set((state) => ({
          answers: {
            ...state.answers,
            [fieldId]: value,
          },
        }))
      },

      setAnswers: (answers) => {
        set({ answers })
      },

      setIdentityData: (data) => {
        set({ identityData: data })
      },

      addConsent: (consent) => {
        set((state) => ({
          consentsGiven: [...state.consentsGiven, consent],
        }))
      },

      // ============================================
      // STATUS
      // ============================================

      setEligibility: (isEligible, reason) => {
        set({
          isEligible,
          eligibilityFailReason: reason || null,
        })
      },

      setIntakeId: (id) => {
        set({ intakeId: id })
      },

      setDraftId: (id) => {
        set({ draftId: id })
      },

      // ============================================
      // UI STATE
      // ============================================

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setSaving: (saving) => {
        set({ isSaving: saving })
      },

      setError: (error) => {
        set({ error })
      },

      // ============================================
      // PERSISTENCE
      // ============================================

      saveDraft: async () => {
        const state = get()
        set({ isSaving: true })

        try {
          // Save to localStorage is handled by zustand persist
          // Here we would also save to Supabase for logged-in users
          set({
            lastSavedAt: new Date().toISOString(),
            isSaving: false,
          })
        } catch (error) {
          console.error('Failed to save draft:', error)
          set({
            isSaving: false,
            error: 'Failed to save draft',
          })
        }
      },

      loadDraft: async (draftId) => {
        set({ isLoading: true })

        try {
          // In a real implementation, fetch from Supabase
          // For now, the localStorage persist handles this
          set({
            draftId,
            isLoading: false,
          })
        } catch (error) {
          console.error('Failed to load draft:', error)
          set({
            isLoading: false,
            error: 'Failed to load draft',
          })
        }
      },

      clearDraft: () => {
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('instantmed-flow')
        }
      },

      // ============================================
      // RESET
      // ============================================

      reset: () => {
        set(createInitialState())
      },
    }),
    {
      name: 'instantmed-flow',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        serviceSlug: state.serviceSlug,
        answers: state.answers,
        identityData: state.identityData,
        consentsGiven: state.consentsGiven,
        currentStepId: state.currentStepId,
        currentGroupIndex: state.currentGroupIndex,
        draftId: state.draftId,
        sessionId: state.sessionId,
        startedAt: state.startedAt,
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
)

// ============================================
// SELECTOR HOOKS
// ============================================

export const useFlowStep = () => useFlowStore((s) => s.currentStepId)
export const useFlowService = () => useFlowStore((s) => s.serviceSlug)
export const useFlowAnswers = () => useFlowStore((s) => s.answers)
export const useFlowIdentity = () => useFlowStore((s) => s.identityData)
export const useFlowEligibility = () =>
  useFlowStore((s) => ({
    isEligible: s.isEligible,
    failReason: s.eligibilityFailReason,
  }))
export const useFlowProgress = () =>
  useFlowStore((s) => ({
    currentStepId: s.currentStepId,
    currentGroupIndex: s.currentGroupIndex,
    stepIndex: STEP_ORDER.indexOf(s.currentStepId),
    totalSteps: STEP_ORDER.length,
  }))
export const useFlowUI = () =>
  useFlowStore((s) => ({
    isLoading: s.isLoading,
    isSaving: s.isSaving,
    error: s.error,
    lastSavedAt: s.lastSavedAt,
  }))
