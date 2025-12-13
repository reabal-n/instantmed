'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useFlowStore, useFlowSync, useFlowDraft, useFlowService } from '../store'
import { saveLocalDraft, loadLocalDraft, getSessionId } from '../draft/storage'
import { getServiceName, calculateProgress } from '../draft/types'

interface UseDraftPersistenceOptions {
  /** Auto-save interval in ms (default: 30000 = 30s) */
  autoSaveInterval?: number
  /** Enable beforeunload warning (default: true) */
  warnOnUnload?: boolean
  /** Callback when save completes */
  onSave?: () => void
  /** Callback on save error */
  onError?: (error: string) => void
}

interface UseDraftPersistenceReturn {
  /** Current sync status */
  syncStatus: string
  /** Whether there are unsaved changes */
  pendingChanges: boolean
  /** Last saved timestamp */
  lastSavedAt: string | null
  /** Force immediate save */
  forceSave: () => Promise<void>
  /** Discard current draft */
  discardDraft: () => void
  /** Check if draft exists */
  hasDraft: boolean
}

/**
 * Hook to manage draft persistence with autosave
 */
export function useDraftPersistence(
  options: UseDraftPersistenceOptions = {}
): UseDraftPersistenceReturn {
  const {
    autoSaveInterval = 30000,
    warnOnUnload = true,
    onSave,
    onError,
  } = options

  const { syncStatus, pendingChanges, lastSyncError } = useFlowSync()
  const { draftId, sessionId } = useFlowDraft()
  const serviceSlug = useFlowService()
  const { forceSave, clearDraft, saveDraft } = useFlowStore()
  const lastSavedAt = useFlowStore((s) => s.lastSavedAt)

  // Track if we have a draft
  const hasDraft = !!(draftId || serviceSlug)

  // Ref to track if save is in progress
  const isSavingRef = useRef(false)

  // Auto-save on interval
  useEffect(() => {
    if (!serviceSlug) return

    const interval = setInterval(() => {
      if (pendingChanges && !isSavingRef.current) {
        saveDraft()
      }
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [serviceSlug, pendingChanges, autoSaveInterval, saveDraft])

  // Handle beforeunload
  useEffect(() => {
    if (!warnOnUnload || !pendingChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges) {
        // Try to save before leaving
        const state = useFlowStore.getState()
        if (state.serviceSlug) {
          // Synchronous localStorage save (best effort)
          const localDraft = {
            id: state.draftId,
            sessionId: state.sessionId,
            serviceSlug: state.serviceSlug,
            serviceName: getServiceName(state.serviceSlug),
            currentStep: state.currentStepId,
            currentGroupIndex: state.currentGroupIndex,
            data: state.answers,
            identityData: state.identityData as Record<string, unknown> | null,
            createdAt: state.startedAt,
            updatedAt: new Date().toISOString(),
            syncedAt: state.lastSavedAt,
            version: state.localVersion,
            progress: calculateProgress(state.currentStepId),
          }
          saveLocalDraft(localDraft)
        }

        // Show warning
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [warnOnUnload, pendingChanges])

  // Handle visibility change (save when tab loses focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingChanges) {
        // Quick save when user switches tabs
        saveDraft()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pendingChanges, saveDraft])

  // Notify on save completion
  useEffect(() => {
    if (syncStatus === 'saved' && onSave) {
      onSave()
    }
    if (syncStatus === 'error' && lastSyncError && onError) {
      onError(lastSyncError)
    }
  }, [syncStatus, lastSyncError, onSave, onError])

  // Force save handler
  const handleForceSave = useCallback(async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    try {
      await forceSave()
    } finally {
      isSavingRef.current = false
    }
  }, [forceSave])

  // Discard draft handler
  const handleDiscardDraft = useCallback(() => {
    clearDraft()
  }, [clearDraft])

  return {
    syncStatus,
    pendingChanges,
    lastSavedAt,
    forceSave: handleForceSave,
    discardDraft: handleDiscardDraft,
    hasDraft,
  }
}
