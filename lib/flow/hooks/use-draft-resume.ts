'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFlowStore } from '../store'
import { 
  getAllLocalDrafts, 
  deleteLocalDraft, 
  getSessionId,
  loadLocalDraft,
} from '../draft/storage'
import type { DraftSummary } from '../draft/types'
import { getServiceName } from '../draft/types'

interface UseDraftResumeOptions {
  /** Filter by service slug */
  serviceSlug?: string
  /** Include server drafts (requires auth) */
  includeServerDrafts?: boolean
  /** Auto-check on mount */
  checkOnMount?: boolean
}

interface UseDraftResumeReturn {
  /** Whether there are resumable drafts */
  hasDrafts: boolean
  /** List of resumable drafts */
  drafts: DraftSummary[]
  /** Loading state */
  isLoading: boolean
  /** Resume a specific draft */
  resumeDraft: (draftId: string) => Promise<void>
  /** Delete a draft */
  deleteDraft: (draftId: string) => Promise<void>
  /** Refresh the draft list */
  refresh: () => Promise<void>
  /** Start fresh (ignore existing drafts) */
  startFresh: () => void
}

/**
 * Hook to detect and manage resumable drafts
 */
export function useDraftResume(
  options: UseDraftResumeOptions = {}
): UseDraftResumeReturn {
  const {
    serviceSlug,
    includeServerDrafts = true,
    checkOnMount = true,
  } = options

  const [drafts, setDrafts] = useState<DraftSummary[]>([])
  const [isLoading, setIsLoading] = useState(checkOnMount)
  const { restoreFromDraft, reset } = useFlowStore()

  // Load drafts from localStorage and server
  const loadDrafts = useCallback(async () => {
    setIsLoading(true)

    try {
      // 1. Get local drafts
      let localDrafts = getAllLocalDrafts()

      // Filter by service if specified
      if (serviceSlug) {
        localDrafts = localDrafts.filter(d => d.serviceSlug === serviceSlug)
      }

      // 2. Get server drafts if enabled
      let serverDrafts: DraftSummary[] = []
      if (includeServerDrafts) {
        try {
          const sessionId = getSessionId()
          const response = await fetch(`/api/flow/drafts?sessionId=${sessionId}`)
          
          if (response.ok) {
            const { drafts: fetchedDrafts } = await response.json()
            
            serverDrafts = (fetchedDrafts || []).map((d: any) => ({
              id: d.id,
              sessionId: d.sessionId,
              serviceSlug: d.serviceSlug,
              serviceName: getServiceName(d.serviceSlug),
              currentStep: d.currentStep,
              progress: 0, // Will calculate
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
              lastAccessedAt: d.lastAccessedAt || d.updatedAt,
              isLocal: false,
              isSynced: true,
            }))

            // Filter by service if specified
            if (serviceSlug) {
              serverDrafts = serverDrafts.filter(d => d.serviceSlug === serviceSlug)
            }
          }
        } catch (error) {
          console.error('Failed to fetch server drafts:', error)
        }
      }

      // 3. Merge and dedupe (prefer server version if both exist)
      const draftMap = new Map<string, DraftSummary>()

      // Add local drafts first
      localDrafts.forEach(draft => {
        const key = draft.id || draft.sessionId
        draftMap.set(key, draft)
      })

      // Override with server drafts
      serverDrafts.forEach(draft => {
        if (draft.id) {
          draftMap.set(draft.id, draft)
        }
      })

      // Convert to array and sort by most recent
      const mergedDrafts = Array.from(draftMap.values())
        .filter(d => d.currentStep !== 'checkout') // Exclude completed
        .sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )

      setDrafts(mergedDrafts)
    } catch (error) {
      console.error('Failed to load drafts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [serviceSlug, includeServerDrafts])

  // Load on mount if enabled
  useEffect(() => {
    if (checkOnMount) {
      loadDrafts()
    }
  }, [checkOnMount, loadDrafts])

  // Resume a draft
  const resumeDraft = useCallback(async (draftId: string) => {
    setIsLoading(true)

    try {
      // Find the draft
      const draft = drafts.find(d => d.id === draftId || d.sessionId === draftId)
      
      if (!draft) {
        throw new Error('Draft not found')
      }

      // Try to load from server first
      if (draft.id && draft.isSynced) {
        const sessionId = getSessionId()
        const response = await fetch(`/api/flow/drafts/${draft.id}?sessionId=${sessionId}`)
        
        if (response.ok) {
          const serverDraft = await response.json()
          
          restoreFromDraft({
            draftId: serverDraft.id,
            serviceSlug: serverDraft.serviceSlug,
            currentStep: serverDraft.currentStep,
            currentGroupIndex: serverDraft.currentGroupIndex || 0,
            data: serverDraft.data || {},
          })
          return
        }
      }

      // Fallback to localStorage
      const localDraft = loadLocalDraft(draft.sessionId)
      if (localDraft) {
        restoreFromDraft({
          draftId: localDraft.id || '',
          serviceSlug: localDraft.serviceSlug,
          currentStep: localDraft.currentStep,
          currentGroupIndex: localDraft.currentGroupIndex,
          data: localDraft.data,
        })
        return
      }

      throw new Error('Could not load draft data')
    } catch (error) {
      console.error('Failed to resume draft:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [drafts, restoreFromDraft])

  // Delete a draft
  const deleteDraft = useCallback(async (draftId: string) => {
    try {
      const draft = drafts.find(d => d.id === draftId || d.sessionId === draftId)
      
      if (!draft) return

      // Delete from localStorage
      deleteLocalDraft(draft.sessionId)

      // Delete from server if synced
      if (draft.id && draft.isSynced) {
        const sessionId = getSessionId()
        await fetch(`/api/flow/drafts/${draft.id}?sessionId=${sessionId}`, {
          method: 'DELETE',
        })
      }

      // Update state
      setDrafts(prev => prev.filter(d => 
        d.id !== draftId && d.sessionId !== draftId
      ))
    } catch (error) {
      console.error('Failed to delete draft:', error)
    }
  }, [drafts])

  // Start fresh
  const startFresh = useCallback(() => {
    reset()
  }, [reset])

  return {
    hasDrafts: drafts.length > 0,
    drafts,
    isLoading,
    resumeDraft,
    deleteDraft,
    refresh: loadDrafts,
    startFresh,
  }
}
