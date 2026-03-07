/**
 * Flow Engine — Zustand Store, Types & Constants
 *
 * Central barrel for the intake-flow system.
 * Provides the Zustand store (persisted to localStorage with 24h expiry),
 * all shared types consumed by step components, and service catalogue data.
 *
 * Consumer pattern:
 *   import { useFlowStore, useFlowAnswers, serviceCategories } from '@/lib/flow'
 *   import type { FlowConfig, FieldConfig } from '@/lib/flow'
 */

"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { PRICING_DISPLAY } from "@/lib/constants"
import { DEFAULT_SAFETY_SYMPTOMS } from "@/lib/data/types/feature-flags"

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export * from "./safety"

/** Fallback safety symptoms list (client-safe, overridable via feature flags). */
export const SAFETY_SCREENING_SYMPTOMS = DEFAULT_SAFETY_SYMPTOMS

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
}

export type ConsentType = "telehealth_terms" | "privacy_policy" | "fee_agreement"

export interface ConsentRecord {
  type: ConsentType
  version: string
  grantedAt: string
  textHash: string
}

export interface FieldConfig {
  id: string
  type: string
  label: string
  placeholder?: string
  description?: string
  /** When true this field can disqualify the user from the service. */
  isRedFlag?: boolean
  /** Message shown when a red-flag answer is selected. */
  redFlagMessage?: string
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
  }
  options?: Array<{
    value: string | boolean
    label: string
    description?: string
    isDisqualifying?: boolean
  }>
  showIf?: {
    fieldId: string
    operator:
      | "equals"
      | "not_equals"
      | "contains"
      | "includes"
      | "not_includes"
      | "gt"
      | "lt"
    value: unknown
  }
}

export interface QuestionGroup {
  id: string
  title: string
  description?: string
  fields: FieldConfig[]
}

export interface FlowConfig {
  category?: string
  questionnaire: {
    eligibilityFields: FieldConfig[]
    groups: QuestionGroup[]
  }
}

// ---------------------------------------------------------------------------
// Service Catalogue
// ---------------------------------------------------------------------------

export interface ServiceCategory {
  slug: string
  name: string
  description: string
  price: string
  time: string
  features: string[]
  icon: string
  popular: boolean
}

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "medical-certificate",
    name: "Medical Certificate",
    description: "For work, study, or carer's leave. Reviewed and issued by a doctor.",
    price: PRICING_DISPLAY.FROM_MED_CERT,
    time: "Usually under 2 hours",
    features: ["Doctor-reviewed", "PDF delivered", "1–3 day coverage"],
    icon: "FileText",
    popular: true,
  },
  {
    slug: "repeat-prescription",
    name: "Repeat Prescription",
    description: "Renew a medication you already take. eScript sent to your phone.",
    price: PRICING_DISPLAY.REPEAT_SCRIPT,
    time: "Usually under 4 hours",
    features: ["eScript delivery", "PBS medications", "No phone call needed"],
    icon: "Pill",
    popular: true,
  },
  {
    slug: "general-consult",
    name: "General Consultation",
    description: "Speak to a doctor about a new condition or health concern.",
    price: PRICING_DISPLAY.CONSULT,
    time: "Same-day response",
    features: ["Doctor review", "Treatment plan", "Referrals if needed"],
    icon: "Stethoscope",
    popular: false,
  },
  {
    slug: "weight-loss",
    name: "Weight Management",
    description: "Clinician-guided weight management consultation.",
    price: PRICING_DISPLAY.WEIGHT_LOSS,
    time: "1–2 day turnaround",
    features: ["Personalised plan", "Medication options", "Ongoing support"],
    icon: "Scale",
    popular: false,
  },
  {
    slug: "mens-health",
    name: "Men's Health",
    description: "Confidential consultation for common men's health concerns.",
    price: PRICING_DISPLAY.MENS_HEALTH,
    time: "Same-day response",
    features: ["100% confidential", "Discreet delivery", "Doctor-guided"],
    icon: "User",
    popular: false,
  },
]

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const STORAGE_KEY = "instantmed-flow"
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface FlowState {
  // Data
  serviceSlug: string | null
  currentStep: number
  currentGroupIndex: number
  answers: Record<string, unknown>
  identity: IdentityData | null
  consents: ConsentRecord[]
  eligibility: { eligible: boolean; reason?: string } | null
  _createdAt: number

  // Actions
  setServiceSlug: (slug: string) => void
  nextStep: () => void
  prevStep: () => void
  nextGroup: () => void
  prevGroup: () => void
  updateAnswer: (key: string, value: unknown) => void
  setIdentityData: (data: IdentityData) => void
  addConsent: (consent: ConsentRecord) => void
  setEligibility: (eligible: boolean, reason?: string) => void
  reset: () => void
}

const initialState = {
  serviceSlug: null,
  currentStep: 0,
  currentGroupIndex: 0,
  answers: {} as Record<string, unknown>,
  identity: null as IdentityData | null,
  consents: [] as ConsentRecord[],
  eligibility: null as { eligible: boolean; reason?: string } | null,
  _createdAt: Date.now(),
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set) => ({
      ...initialState,

      setServiceSlug: (slug) => set({ serviceSlug: slug }),

      nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
      prevStep: () =>
        set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),

      nextGroup: () =>
        set((s) => ({ currentGroupIndex: s.currentGroupIndex + 1 })),
      prevGroup: () =>
        set((s) => ({
          currentGroupIndex: Math.max(0, s.currentGroupIndex - 1),
        })),

      updateAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } })),

      setIdentityData: (data) => set({ identity: data }),

      addConsent: (consent) =>
        set((s) => ({
          consents: [
            ...s.consents.filter((c) => c.type !== consent.type),
            consent,
          ],
        })),

      setEligibility: (eligible, reason) =>
        set({ eligibility: { eligible, reason } }),

      reset: () => set({ ...initialState, _createdAt: Date.now() }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // SSR no-op storage
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return localStorage
      }),
      // Expire persisted state after 24 hours
      onRehydrateStorage: () => (state) => {
        if (state && Date.now() - state._createdAt > EXPIRY_MS) {
          state.reset()
        }
      },
    }
  )
)

// ---------------------------------------------------------------------------
// Selector Hooks
// ---------------------------------------------------------------------------

/** Access just the answers record. */
export function useFlowAnswers(): Record<string, unknown> {
  return useFlowStore((s) => s.answers)
}

/** Current progress through the flow. */
export function useFlowProgress(): {
  currentStep: number
  currentGroupIndex: number
} {
  return useFlowStore((s) => ({
    currentStep: s.currentStep,
    currentGroupIndex: s.currentGroupIndex,
  }))
}

/** Patient identity data (if collected). */
export function useFlowIdentity(): IdentityData | null {
  return useFlowStore((s) => s.identity)
}

/** Currently selected service slug. */
export function useFlowService(): string | null {
  return useFlowStore((s) => s.serviceSlug)
}
