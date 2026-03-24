'use client'

import { useState, useEffect } from 'react'
import { useFlowStore, STEP_ORDER } from './store'
import { getSessionId } from './draft/storage'

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

// SSR placeholders - must match the values in store.ts
const SSR_SESSION_ID = 'ssr_placeholder'
const SSR_TIMESTAMP = '1970-01-01T00:00:00.000Z'

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
      useFlowStore.setState({ sessionId: getSessionId() })
    }
    if (state.startedAt === SSR_TIMESTAMP) {
      useFlowStore.setState({ startedAt: new Date().toISOString() })
    }

    setHydrated(true)
  }, [])

  return hydrated
}
