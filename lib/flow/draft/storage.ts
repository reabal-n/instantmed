'use client'

import type { LocalDraft, DraftSummary } from './types'
import { calculateProgress, getServiceName } from './types'

// ============================================
// LOCALSTORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  SESSION_ID: 'instantmed-session-id',
  CURRENT_DRAFT: 'instantmed-current-draft',
  DRAFT_PREFIX: 'instantmed-draft-',
  PENDING_FLOW: 'instantmed-pending-flow',
} as const

// ============================================
// SESSION ID MANAGEMENT
// ============================================

/**
 * Get or create a persistent session ID
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return `server_${Date.now()}`
  }

  let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID)
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId)
  }
  
  return sessionId
}

// ============================================
// DRAFT STORAGE
// ============================================

/**
 * Get the draft storage key for a session
 */
function getDraftKey(sessionId: string): string {
  return `${STORAGE_KEYS.DRAFT_PREFIX}${sessionId}`
}

/**
 * Save draft to localStorage
 */
export function saveLocalDraft(draft: LocalDraft): void {
  if (typeof window === 'undefined') return

  try {
    const key = getDraftKey(draft.sessionId)
    const updatedDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
      version: draft.version + 1,
      progress: calculateProgress(draft.currentStep),
    }
    
    localStorage.setItem(key, JSON.stringify(updatedDraft))
    
    // Also update the "current draft" pointer
    localStorage.setItem(STORAGE_KEYS.CURRENT_DRAFT, draft.sessionId)
  } catch (error) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Failed to save draft to localStorage:', error)
  }
}

/**
 * Load draft from localStorage
 */
export function loadLocalDraft(sessionId: string): LocalDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const key = getDraftKey(sessionId)
    const data = localStorage.getItem(key)
    
    if (!data) return null
    
    return JSON.parse(data) as LocalDraft
  } catch (error) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Failed to load draft from localStorage:', error)
    return null
  }
}

/**
 * Delete draft from localStorage
 */
export function deleteLocalDraft(sessionId: string): void {
  if (typeof window === 'undefined') return

  try {
    const key = getDraftKey(sessionId)
    localStorage.removeItem(key)
    
    // Clear current draft pointer if it matches
    const currentDraft = localStorage.getItem(STORAGE_KEYS.CURRENT_DRAFT)
    if (currentDraft === sessionId) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_DRAFT)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Failed to delete draft from localStorage:', error)
  }
}

/**
 * Get current active draft session ID
 */
export function getCurrentDraftSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.CURRENT_DRAFT)
}

/**
 * Get all local drafts
 */
export function getAllLocalDrafts(): DraftSummary[] {
  if (typeof window === 'undefined') return []

  const drafts: DraftSummary[] = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_KEYS.DRAFT_PREFIX)) {
        const data = localStorage.getItem(key)
        if (data) {
          const draft = JSON.parse(data) as LocalDraft
          
          // Only include incomplete drafts (not on checkout)
          if (draft.currentStep !== 'checkout') {
            drafts.push({
              id: draft.id || '',
              sessionId: draft.sessionId,
              serviceSlug: draft.serviceSlug,
              serviceName: draft.serviceName || getServiceName(draft.serviceSlug),
              currentStep: draft.currentStep,
              progress: draft.progress || calculateProgress(draft.currentStep),
              createdAt: draft.createdAt,
              updatedAt: draft.updatedAt,
              lastAccessedAt: draft.updatedAt,
              isLocal: !draft.syncedAt,
              isSynced: !!draft.syncedAt,
            })
          }
        }
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Failed to get local drafts:', error)
  }

  // Sort by most recently updated
  return drafts.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

/**
 * Check if there's a resumable draft for a service
 */
export function hasResumableDraft(serviceSlug?: string): boolean {
  const drafts = getAllLocalDrafts()
  
  if (serviceSlug) {
    return drafts.some(d => d.serviceSlug === serviceSlug)
  }
  
  return drafts.length > 0
}

/**
 * Get the most recent resumable draft
 */
export function getLatestDraft(serviceSlug?: string): DraftSummary | null {
  const drafts = getAllLocalDrafts()
  
  if (serviceSlug) {
    return drafts.find(d => d.serviceSlug === serviceSlug) || null
  }
  
  return drafts[0] || null
}

// ============================================
// PENDING FLOW STATE (for auth redirect)
// ============================================

export interface PendingFlowState {
  draftId?: string
  sessionId: string
  serviceSlug: string
  currentStep: string
  nextStep: string
  answers: Record<string, unknown>
  savedAt: string
}

/**
 * Save flow state before auth redirect
 */
export function savePendingFlow(state: Omit<PendingFlowState, 'savedAt'>): void {
  if (typeof window === 'undefined') return

  try {
    const data: PendingFlowState = {
      ...state,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.PENDING_FLOW, JSON.stringify(data))
  } catch (error) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Failed to save pending flow:', error)
  }
}

/**
 * Load and clear pending flow state
 */
export function loadPendingFlow(): PendingFlowState | null {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_FLOW)
    if (!data) return null

    // Clear it immediately
    localStorage.removeItem(STORAGE_KEYS.PENDING_FLOW)

    const state = JSON.parse(data) as PendingFlowState

    // Expire after 24 hours (extended from 1 hour per P3-10)
    const savedAt = new Date(state.savedAt).getTime()
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
    if (Date.now() - savedAt > TWENTY_FOUR_HOURS_MS) {
      return null
    }

    return state
  } catch (error) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Failed to load pending flow:', error)
    return null
  }
}

/**
 * Clear all draft data (for testing/reset)
 */
export function clearAllDrafts(): void {
  if (typeof window === 'undefined') return

  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_KEYS.DRAFT_PREFIX) || 
        key === STORAGE_KEYS.CURRENT_DRAFT ||
        key === STORAGE_KEYS.PENDING_FLOW) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key))
}
