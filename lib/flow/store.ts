'use client'
/* eslint-disable no-console -- Flow state management needs console for debugging */

import { useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { FlowState, FlowActions, FlowStepId } from './types'
import type { IdentityData as _IdentityData, ConsentRecord as _ConsentRecord } from './types'
import type { SyncStatus } from './draft/types'
import { getSessionId, saveLocalDraft, loadLocalDraft } from './draft/storage'
import { validateIHI } from '@/lib/validation/ihi'
import { validateMedicareNumber } from '@/lib/validation/medicare'

// Placeholder values for SSR - will be replaced on client hydration
const SSR_SESSION_ID = 'ssr_placeholder'
const SSR_TIMESTAMP = '1970-01-01T00:00:00.000Z'

// Generate a unique session ID (with persistence) - only call on client
function generateSessionId(): string {
  if (typeof window === 'undefined') {
    return SSR_SESSION_ID
  }
  return getSessionId()
}

// Get current timestamp - only meaningful on client
function getTimestamp(): string {
  if (typeof window === 'undefined') {
    return SSR_TIMESTAMP
  }
  return new Date().toISOString()
}

// Extended state with sync tracking
interface ExtendedFlowState extends FlowState {
  // Sync state
  syncStatus: SyncStatus
  localVersion: number
  serverVersion: number
  pendingChanges: boolean
  lastSyncError: string | null
  retryCount: number
}

// Initial state factory - uses SSR-safe values
function createInitialState(): ExtendedFlowState {
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
    sessionId: SSR_SESSION_ID, // Will be replaced on client hydration
    startedAt: SSR_TIMESTAMP, // Will be replaced on client hydration
    lastSavedAt: null,
    isLoading: false,
    isSaving: false,
    error: null,
    // Sync state
    syncStatus: 'idle',
    localVersion: 0,
    serverVersion: 0,
    pendingChanges: false,
    lastSyncError: null,
    retryCount: 0,
  }
}

// 5-step order per refined intake spec
const STEP_ORDER: FlowStepId[] = ['service', 'safety', 'questions', 'details', 'checkout']

// Debounce timer
let saveTimer: NodeJS.Timeout | null = null
const SAVE_DEBOUNCE_MS = 1500
const _MAX_RETRY_COUNT = 3

// Validation result type
export interface ValidationResult {
  isValid: boolean
  missingFields: string[]
  errors: Record<string, string>
}

// Extended actions for sync
interface ExtendedFlowActions extends FlowActions {
  // Sync actions
  setSyncStatus: (status: SyncStatus) => void
  markPendingChanges: () => void
  syncToServer: () => Promise<void>
  forceSave: () => Promise<void>
  restoreFromDraft: (draftData: {
    draftId: string
    serviceSlug: string
    currentStep: string
    currentGroupIndex: number
    data: Record<string, unknown>
  }) => void
  // Aggregate validation
  validateAllRequiredFields: () => ValidationResult
}

interface FlowStore extends ExtendedFlowState, ExtendedFlowActions {}

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
          pendingChanges: true,
        })
        get().markPendingChanges()
      },

      nextStep: () => {
        const { currentStepId } = get()
        const currentIndex = STEP_ORDER.indexOf(currentStepId)

        if (currentIndex < STEP_ORDER.length - 1) {
          set({
            currentStepId: STEP_ORDER[currentIndex + 1],
            currentGroupIndex: 0,
            error: null,
            pendingChanges: true,
          })
          get().markPendingChanges()
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
            pendingChanges: true,
          })
          get().markPendingChanges()
        }
      },

      nextGroup: () => {
        set((state) => ({
          currentGroupIndex: state.currentGroupIndex + 1,
          pendingChanges: true,
        }))
        get().markPendingChanges()
      },

      prevGroup: () => {
        set((state) => ({
          currentGroupIndex: Math.max(0, state.currentGroupIndex - 1),
          pendingChanges: true,
        }))
        get().markPendingChanges()
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
          pendingChanges: true,
        })
        // Immediately trigger draft creation for new service
        get().forceSave()
      },

      updateAnswer: (fieldId, value) => {
        set((state) => ({
          answers: {
            ...state.answers,
            [fieldId]: value,
          },
          pendingChanges: true,
        }))
        // Debounced save
        get().markPendingChanges()
      },

      setAnswers: (answers) => {
        set({ answers, pendingChanges: true })
        get().markPendingChanges()
      },

      setIdentityData: (data) => {
        set({ identityData: data, pendingChanges: true })
        get().markPendingChanges()
      },

      addConsent: (consent) => {
        set((state) => ({
          consentsGiven: [...state.consentsGiven, consent],
          pendingChanges: true,
        }))
        get().markPendingChanges()
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
      // SYNC STATE
      // ============================================

      setSyncStatus: (status) => {
        set({ syncStatus: status })
      },

      markPendingChanges: () => {
        // Clear existing timer
        if (saveTimer) {
          clearTimeout(saveTimer)
        }

        set({ pendingChanges: true, syncStatus: 'pending' })

        // Set debounced save
        saveTimer = setTimeout(() => {
          get().saveDraft()
        }, SAVE_DEBOUNCE_MS)
      },

      // ============================================
      // PERSISTENCE
      // ============================================

      saveDraft: async () => {
        const state = get()
        
        // Don't save if no service selected
        if (!state.serviceSlug) return

        set({ isSaving: true, syncStatus: 'saving' })

        try {
          // 1. Always save to localStorage first (fast, reliable)
          const localDraft = {
            id: state.draftId,
            sessionId: state.sessionId,
            serviceSlug: state.serviceSlug,
            serviceName: state.serviceSlug, // Will be resolved by storage
            currentStep: state.currentStepId,
            currentGroupIndex: state.currentGroupIndex,
            data: state.answers,
            identityData: state.identityData as Record<string, unknown> | null,
            createdAt: state.startedAt,
            updatedAt: new Date().toISOString(),
            syncedAt: state.lastSavedAt,
            version: state.localVersion,
            progress: 0, // Will be calculated by storage
          }
          saveLocalDraft(localDraft)

          // 2. Try to sync to server (non-blocking)
          await get().syncToServer()

          set({
            lastSavedAt: new Date().toISOString(),
            isSaving: false,
            pendingChanges: false,
            syncStatus: 'saved',
            localVersion: state.localVersion + 1,
            retryCount: 0,
            lastSyncError: null,
          })
        } catch (error) {
          // Still mark as saved since localStorage succeeded
          if (process.env.NODE_ENV === 'development') {
            console.warn('Draft saved locally, server sync failed:', error)
          }
          set({
            lastSavedAt: new Date().toISOString(),
            isSaving: false,
            pendingChanges: false,
            syncStatus: 'saved', // Still saved to localStorage
            localVersion: state.localVersion + 1,
          })
        }
      },

      syncToServer: async () => {
        const state = get()

        if (!state.serviceSlug) return

        try {
          if (!state.draftId) {
            // Create new draft
            const response = await fetch('/api/flow/drafts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: state.sessionId,
                serviceSlug: state.serviceSlug,
                initialData: state.answers,
              }),
            })

            if (response.ok) {
              const { draftId } = await response.json()
              set({ draftId })
            }
            // Don't throw on failure - localStorage backup exists
          } else {
            // Update existing draft
            const response = await fetch(`/api/flow/drafts/${state.draftId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: state.sessionId,
                currentStep: state.currentStepId,
                currentGroupIndex: state.currentGroupIndex,
                data: state.answers,
              }),
            })

            if (response.ok) {
              const { serverVersion } = await response.json()
              set({ serverVersion })
            }
            // Don't throw on failure - localStorage backup exists
          }
        } catch (error) {
          // Server sync failed, but localStorage is saved - don't throw
          if (process.env.NODE_ENV === 'development') {
            console.warn('Server sync failed (data saved locally):', error)
          }
        }
      },

      forceSave: async () => {
        // Clear debounce timer
        if (saveTimer) {
          clearTimeout(saveTimer)
          saveTimer = null
        }

        await get().saveDraft()
      },

      loadDraft: async (draftId) => {
        set({ isLoading: true })

        try {
          const state = get()
          
          // Try to load from server
          const response = await fetch(`/api/flow/drafts/${draftId}?sessionId=${state.sessionId}`)
          
          if (response.ok) {
            const data = await response.json()
            
            set({
              draftId: data.id,
              serviceSlug: data.serviceSlug,
              currentStepId: data.currentStep as FlowStepId,
              currentGroupIndex: data.currentGroupIndex || 0,
              answers: data.data || {},
              isLoading: false,
              syncStatus: 'saved',
            })
          } else {
            // Fallback to localStorage
            const localDraft = loadLocalDraft(state.sessionId)
            if (localDraft) {
              set({
                draftId: localDraft.id,
                serviceSlug: localDraft.serviceSlug,
                currentStepId: localDraft.currentStep as FlowStepId,
                currentGroupIndex: localDraft.currentGroupIndex,
                answers: localDraft.data,
                isLoading: false,
                syncStatus: 'pending',
              })
            } else {
              throw new Error('Draft not found')
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to load draft:', error)
          }
          set({
            isLoading: false,
            error: 'Failed to load draft',
          })
        }
      },

      restoreFromDraft: (draftData) => {
        set({
          draftId: draftData.draftId,
          serviceSlug: draftData.serviceSlug,
          currentStepId: draftData.currentStep as FlowStepId,
          currentGroupIndex: draftData.currentGroupIndex,
          answers: draftData.data,
          pendingChanges: false,
          syncStatus: 'saved',
        })
      },

      // ============================================
      // AGGREGATE VALIDATION
      // ============================================

      validateAllRequiredFields: () => {
        const state = get()
        const missingFields: string[] = []
        const errors: Record<string, string> = {}

        // Must have a service selected
        if (!state.serviceSlug) {
          missingFields.push('serviceSlug')
          errors['serviceSlug'] = 'Please select a service'
        }

        // Check safety confirmation (emergency_symptoms should be empty/none)
        const emergencySymptoms = state.answers.emergency_symptoms as string[] | undefined
        if (emergencySymptoms && emergencySymptoms.length > 0 && !emergencySymptoms.includes('none')) {
          missingFields.push('emergency_symptoms')
          errors['emergency_symptoms'] = 'Emergency symptoms detected - please seek immediate care'
        }

        // Determine if this is a prescription flow (requires Medicare/IHI for eScript)
        const isPrescriptionFlow = state.serviceSlug && [
          'prescription',
          'repeat-script', 
          'new-script',
          'gp-consult',
          'consult',
        ].includes(state.serviceSlug)

        // Check identity data for details step
        const identityFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth']
        if (state.identityData) {
          for (const field of identityFields) {
            const value = state.identityData[field as keyof typeof state.identityData]
            if (!value) {
              missingFields.push(field)
              errors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`
            }
          }
          
          // For prescription flows: require address
          if (isPrescriptionFlow) {
            const addressFields = ['addressLine1', 'suburb', 'state', 'postcode']
            for (const field of addressFields) {
              const value = state.identityData[field as keyof typeof state.identityData]
              if (!value) {
                missingFields.push(field)
                errors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required for prescriptions`
              }
            }
            
            // For prescription flows: require valid Medicare OR valid IHI (for eScript issuance)
            const medicareValue = state.identityData.medicareNumber ? String(state.identityData.medicareNumber) : ''
            const ihiValue = state.identityData.ihi ? String(state.identityData.ihi) : ''
            
            const medicareValidation = medicareValue ? validateMedicareNumber(medicareValue) : { valid: false }
            const ihiValidation = ihiValue ? validateIHI(ihiValue) : { valid: false }
            
            const hasMedicare = medicareValidation.valid
            const hasIHI = ihiValidation.valid
            
            if (!hasMedicare && !hasIHI) {
              missingFields.push('medicareOrIhi')
              // Provide specific error if they entered something invalid
              if (medicareValue && !medicareValidation.valid) {
                errors['medicareOrIhi'] = medicareValidation.error || 'Invalid Medicare number'
              } else if (ihiValue && !ihiValidation.valid) {
                errors['medicareOrIhi'] = ihiValidation.error || 'Invalid IHI number'
              } else {
                errors['medicareOrIhi'] = 'Medicare number or IHI is required for prescriptions (needed for eScript)'
              }
            }
          }
        } else {
          // Check if identity fields are in answers (for guest checkout)
          for (const field of ['patient_name', 'patient_email', 'patient_phone', 'patient_dob']) {
            if (!state.answers[field]) {
              missingFields.push(field)
              errors[field] = `${field.replace(/_/g, ' ')} is required`
            }
          }
          
          // For prescription flows in guest checkout: require address fields
          if (isPrescriptionFlow) {
            for (const field of ['patient_address', 'patient_suburb', 'patient_state', 'patient_postcode']) {
              if (!state.answers[field]) {
                missingFields.push(field)
                errors[field] = `${field.replace(/patient_/g, '').replace(/_/g, ' ')} is required for prescriptions`
              }
            }
            
            // Require valid Medicare OR valid IHI
            const medicareValue = state.answers.patient_medicare ? String(state.answers.patient_medicare) : ''
            const ihiValue = state.answers.patient_ihi ? String(state.answers.patient_ihi) : ''
            
            const medicareValidation = medicareValue ? validateMedicareNumber(medicareValue) : { valid: false }
            const ihiValidation = ihiValue ? validateIHI(ihiValue) : { valid: false }
            
            const hasMedicare = medicareValidation.valid
            const hasIHI = ihiValidation.valid
            
            if (!hasMedicare && !hasIHI) {
              missingFields.push('medicareOrIhi')
              if (medicareValue && !medicareValidation.valid) {
                errors['medicareOrIhi'] = medicareValidation.error || 'Invalid Medicare number'
              } else if (ihiValue && !ihiValidation.valid) {
                errors['medicareOrIhi'] = ihiValidation.error || 'Invalid IHI number'
              } else {
                errors['medicareOrIhi'] = 'Medicare number or IHI is required for prescriptions (needed for eScript)'
              }
            }
          }
        }

        // Check consents
        if (state.consentsGiven.length === 0) {
          // Consents might be stored differently in some flows
          const termsAgreed = state.answers.agreedToTerms || state.answers.terms_agreed
          if (!termsAgreed) {
            missingFields.push('consents')
            errors['consents'] = 'Please agree to the terms and conditions'
          }
        }

        return {
          isValid: missingFields.length === 0,
          missingFields,
          errors,
        }
      },

      clearDraft: () => {
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('instantmed-flow')
          const state = get()
          if (state.sessionId) {
            localStorage.removeItem(`instantmed-draft-${state.sessionId}`)
          }
        }
      },

      // ============================================
      // RESET
      // ============================================

      reset: () => {
        if (saveTimer) {
          clearTimeout(saveTimer)
          saveTimer = null
        }
        // Create initial state with proper client values
        const newState = createInitialState()
        newState.sessionId = generateSessionId()
        newState.startedAt = getTimestamp()
        set(newState)
      },
    }),
    {
      name: 'instantmed-flow',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // Prevent hydration mismatch - we'll hydrate manually
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
        localVersion: state.localVersion,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, ensure we have valid sessionId and startedAt
        if (state) {
          if (!state.sessionId || state.sessionId === SSR_SESSION_ID) {
            state.sessionId = generateSessionId()
          }
          if (!state.startedAt || state.startedAt === SSR_TIMESTAMP) {
            state.startedAt = getTimestamp()
          }
        }
      },
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
export const useFlowSync = () =>
  useFlowStore((s) => ({
    syncStatus: s.syncStatus,
    pendingChanges: s.pendingChanges,
    lastSyncError: s.lastSyncError,
    localVersion: s.localVersion,
    serverVersion: s.serverVersion,
  }))
export const useFlowDraft = () =>
  useFlowStore((s) => ({
    draftId: s.draftId,
    sessionId: s.sessionId,
    startedAt: s.startedAt,
  }))

// ============================================
// HYDRATION
// ============================================

/**
 * Hook to hydrate the store on client mount
 * Call this in your app root or on pages that use the flow store
 */
export function useHydrateFlowStore() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Trigger Zustand's rehydration from localStorage
    useFlowStore.persist.rehydrate()
    
    // Ensure we have valid session ID and timestamp after hydration
    const state = useFlowStore.getState()
    if (state.sessionId === SSR_SESSION_ID) {
      useFlowStore.setState({ sessionId: generateSessionId() })
    }
    if (state.startedAt === SSR_TIMESTAMP) {
      useFlowStore.setState({ startedAt: getTimestamp() })
    }
    
     
    setHydrated(true)
  }, [])

  return hydrated
}
