'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingState, OnboardingStep, IdentityData, ConsentRecord } from './types'
import type { ServiceType } from '@/types/database'

// Generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// Initial state factory
function createInitialState(): OnboardingState {
  return {
    currentStep: 'service',
    serviceSlug: null,
    serviceType: null,
    intakeId: null,
    draftId: null,
    eligibilityAnswers: {},
    questionnaireAnswers: {},
    identityData: null,
    consentsGiven: [],
    isEligible: null,
    eligibilityFailReason: null,
    isLoading: false,
    error: null,
    completedSteps: [],
    sessionId: generateSessionId(),
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  }
}

interface OnboardingStore extends OnboardingState {
  // Actions
  setStep: (step: OnboardingStep) => void
  nextStep: () => void
  prevStep: () => void
  
  selectService: (slug: string, type: ServiceType) => void
  
  setEligibilityAnswers: (answers: Record<string, unknown>) => void
  setQuestionnaireAnswers: (answers: Record<string, unknown>) => void
  updateQuestionnaireAnswer: (questionId: string, value: unknown) => void
  
  setIdentityData: (data: IdentityData) => void
  addConsent: (consent: ConsentRecord) => void
  
  setEligibilityResult: (isEligible: boolean, failReason?: string) => void
  setIntakeId: (id: string) => void
  setDraftId: (id: string) => void
  
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  markStepComplete: (step: OnboardingStep) => void
  
  reset: () => void
}

// Step order for navigation
const stepOrder: OnboardingStep[] = [
  'service',
  'eligibility',
  'questions',
  'identity',
  'consent',
  'review',
  'payment',
  'submitted',
]

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      
      setStep: (step) => set({ 
        currentStep: step,
        lastUpdatedAt: new Date().toISOString(),
      }),
      
      nextStep: () => {
        const { currentStep, completedSteps } = get()
        const currentIndex = stepOrder.indexOf(currentStep)
        
        if (currentIndex < stepOrder.length - 1) {
          // Mark current step as complete
          const newCompletedSteps = completedSteps.includes(currentStep) 
            ? completedSteps 
            : [...completedSteps, currentStep]
          
          set({ 
            currentStep: stepOrder[currentIndex + 1],
            completedSteps: newCompletedSteps,
            lastUpdatedAt: new Date().toISOString(),
          })
        }
      },
      
      prevStep: () => {
        const { currentStep } = get()
        const currentIndex = stepOrder.indexOf(currentStep)
        
        if (currentIndex > 0) {
          set({ 
            currentStep: stepOrder[currentIndex - 1],
            lastUpdatedAt: new Date().toISOString(),
          })
        }
      },
      
      selectService: (slug, type) => set({
        serviceSlug: slug,
        serviceType: type,
        lastUpdatedAt: new Date().toISOString(),
      }),
      
      setEligibilityAnswers: (answers) => set({
        eligibilityAnswers: answers,
        lastUpdatedAt: new Date().toISOString(),
      }),
      
      setQuestionnaireAnswers: (answers) => set({
        questionnaireAnswers: answers,
        lastUpdatedAt: new Date().toISOString(),
      }),
      
      updateQuestionnaireAnswer: (questionId, value) => set((state) => ({
        questionnaireAnswers: {
          ...state.questionnaireAnswers,
          [questionId]: value,
        },
        lastUpdatedAt: new Date().toISOString(),
      })),
      
      setIdentityData: (data) => set({
        identityData: data,
        lastUpdatedAt: new Date().toISOString(),
      }),
      
      addConsent: (consent) => set((state) => ({
        consentsGiven: [...state.consentsGiven, consent],
        lastUpdatedAt: new Date().toISOString(),
      })),
      
      setEligibilityResult: (isEligible, failReason) => set({
        isEligible,
        eligibilityFailReason: failReason || null,
        lastUpdatedAt: new Date().toISOString(),
      }),
      
      setIntakeId: (id) => set({
        intakeId: id,
        lastUpdatedAt: new Date().toISOString(),
      }),
      
      setDraftId: (id) => set({
        draftId: id,
        lastUpdatedAt: new Date().toISOString(),
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      markStepComplete: (step) => set((state) => ({
        completedSteps: state.completedSteps.includes(step)
          ? state.completedSteps
          : [...state.completedSteps, step],
        lastUpdatedAt: new Date().toISOString(),
      })),
      
      reset: () => set(createInitialState()),
    }),
    {
      name: 'instantmed-onboarding',
      partialize: (state) => ({
        // Only persist these fields
        serviceSlug: state.serviceSlug,
        serviceType: state.serviceType,
        intakeId: state.intakeId,
        draftId: state.draftId,
        eligibilityAnswers: state.eligibilityAnswers,
        questionnaireAnswers: state.questionnaireAnswers,
        identityData: state.identityData,
        consentsGiven: state.consentsGiven,
        isEligible: state.isEligible,
        completedSteps: state.completedSteps,
        sessionId: state.sessionId,
        startedAt: state.startedAt,
        lastUpdatedAt: state.lastUpdatedAt,
      }),
    }
  )
)

// Selector hooks for specific parts of the state
export const useCurrentStep = () => useOnboardingStore((state) => state.currentStep)
export const useServiceSelection = () => useOnboardingStore((state) => ({
  serviceSlug: state.serviceSlug,
  serviceType: state.serviceType,
}))
export const useIsEligible = () => useOnboardingStore((state) => state.isEligible)
export const useOnboardingProgress = () => useOnboardingStore((state) => ({
  currentStep: state.currentStep,
  completedSteps: state.completedSteps,
  totalSteps: stepOrder.length,
  currentStepIndex: stepOrder.indexOf(state.currentStep),
}))
