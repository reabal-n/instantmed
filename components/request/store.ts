"use client"

/**
 * Unified Request Store - Zustand store for the unified /request flow
 * 
 * Manages state for all service types with a common interface.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UnifiedServiceType, UnifiedStepId } from '@/lib/request/step-registry'
import { getStepsForService as _getStepsForService, getNextStepId, getPreviousStepId } from '@/lib/request/step-registry'

export interface RequestState {
  // Service
  serviceType: UnifiedServiceType | null
  
  // Navigation
  currentStepId: UnifiedStepId
  direction: 1 | -1
  
  // Safety
  safetyConfirmed: boolean
  safetyTimestamp: string | null
  
  // Chat session linkage (for transcript → intake linking)
  chatSessionId: string | null
  
  // Form answers (generic key-value store)
  answers: Record<string, unknown>
  
  // Identity
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  
  // Auth context (for step skipping logic)
  authContext: {
    isAuthenticated: boolean
    hasProfile: boolean
    hasMedicare: boolean
  }
  
  // Consents
  agreedToTerms: boolean
  confirmedAccuracy: boolean
  telehealthConsent: boolean
  
  // Status
  isLoading: boolean
  error: string | null
  
  // Draft
  draftId: string | null
  lastSavedAt: string | null
}

export interface IdentityData {
  email?: string
  fullName?: string
  dateOfBirth?: string
  phone?: string
}

export interface AuthContext {
  isAuthenticated: boolean
  hasProfile: boolean
  hasMedicare: boolean
}

export interface RequestActions {
  // Service
  setServiceType: (type: UnifiedServiceType) => void
  
  // Navigation
  nextStep: () => void
  prevStep: () => void
  goToStep: (stepId: UnifiedStepId) => void
  
  // Safety
  setSafetyConfirmed: (confirmed: boolean) => void
  
  // Chat session linkage
  setChatSessionId: (sessionId: string | null) => void
  
  // Answers
  setAnswer: (key: string, value: unknown) => void
  setAnswers: (answers: Record<string, unknown>) => void
  
  // Identity
  setIdentity: (data: Partial<Pick<RequestState, 'firstName' | 'lastName' | 'email' | 'phone' | 'dob'>>) => void
  getIdentity: () => IdentityData
  
  // Auth context for step navigation
  setAuthContext: (ctx: AuthContext) => void
  
  // Consents
  setConsent: (key: 'agreedToTerms' | 'confirmedAccuracy' | 'telehealthConsent', value: boolean) => void
  
  // Status
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Reset
  reset: () => void
}

const initialState: RequestState = {
  serviceType: null,
  currentStepId: 'certificate', // First step for med-cert (default)
  direction: 1,
  safetyConfirmed: false,
  safetyTimestamp: null,
  chatSessionId: null,
  answers: {},
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dob: '',
  authContext: {
    isAuthenticated: false,
    hasProfile: false,
    hasMedicare: false,
  },
  agreedToTerms: false,
  confirmedAccuracy: false,
  telehealthConsent: false,
  isLoading: false,
  error: null,
  draftId: null,
  lastSavedAt: null,
}

export const useRequestStore = create<RequestState & RequestActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setServiceType: (type) => set({ serviceType: type }),

      nextStep: () => {
        const { serviceType, currentStepId, authContext, answers } = get()
        if (!serviceType) return

        const context = {
          ...authContext,
          serviceType,
          answers,
        }

        const nextId = getNextStepId(serviceType, currentStepId, context)
        if (nextId) {
          set({ currentStepId: nextId, direction: 1 })
        }
      },

      prevStep: () => {
        const { serviceType, currentStepId, authContext, answers } = get()
        if (!serviceType) return

        const context = {
          ...authContext,
          serviceType,
          answers,
        }

        const prevId = getPreviousStepId(serviceType, currentStepId, context)
        if (prevId) {
          set({ currentStepId: prevId, direction: -1 })
        }
      },

      goToStep: (stepId) => {
        const { currentStepId, safetyConfirmed, answers } = get()
        const steps = ['safety', 'certificate', 'symptoms', 'medication', 'medication-history', 'medical-history', 'consult-reason', 'details', 'review', 'checkout']
        const currentIndex = steps.indexOf(currentStepId)
        const targetIndex = steps.indexOf(stepId)
        
        // Block forward navigation if prerequisites not met
        if (targetIndex > currentIndex) {
          // Safety step is always required first
          if (!safetyConfirmed && stepId !== 'safety') {
            return // Block navigation - safety not confirmed
          }
          // Block jumping to checkout without required data
          if (stepId === 'checkout' || stepId === 'review') {
            const hasRequiredAnswers = Object.keys(answers).length > 0
            if (!hasRequiredAnswers) {
              return // Block navigation - no answers provided
            }
          }
        }
        
        const direction = targetIndex > currentIndex ? 1 : -1
        set({ currentStepId: stepId, direction: direction as 1 | -1 })
      },

      setSafetyConfirmed: (confirmed) => set({ 
        safetyConfirmed: confirmed,
        safetyTimestamp: confirmed ? new Date().toISOString() : null,
      }),

      setChatSessionId: (sessionId) => set({ chatSessionId: sessionId }),

      setAnswer: (key, value) => set((state) => ({
        answers: { ...state.answers, [key]: value },
      })),

      setAnswers: (answers) => set((state) => ({
        answers: { ...state.answers, ...answers },
      })),

      setIdentity: (data) => set((state) => ({
        ...state,
        ...data,
      })),

      getIdentity: () => {
        const { firstName, lastName, email, phone, dob } = get()
        return {
          email: email || undefined,
          fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || undefined,
          dateOfBirth: dob || undefined,
          phone: phone || undefined,
        }
      },

      setAuthContext: (ctx) => set({ authContext: ctx }),

      setConsent: (key, value) => set({ [key]: value }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: 'instantmed-request-draft',
      partialize: (state) => ({
        serviceType: state.serviceType,
        currentStepId: state.currentStepId,
        safetyConfirmed: state.safetyConfirmed,
        safetyTimestamp: state.safetyTimestamp,
        chatSessionId: state.chatSessionId,
        answers: state.answers,
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        phone: state.phone,
        dob: state.dob,
        lastSavedAt: new Date().toISOString(),
      }),
    }
  )
)
