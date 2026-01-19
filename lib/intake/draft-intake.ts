/**
 * Draft Intake Management
 * 
 * Saves and restores interrupted intake sessions.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DraftIntake {
  id: string
  serviceType: string | null
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp?: number
  }>
  collectedData: Record<string, unknown>
  currentStep: number
  totalSteps: number
  createdAt: number
  updatedAt: number
  expiresAt: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DRAFT_STORAGE_KEY = 'instantmed_draft_intake'
const DRAFT_EXPIRY_HOURS = 24

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * Save current intake state as draft
 */
export function saveDraft(draft: Omit<DraftIntake, 'updatedAt' | 'expiresAt'>): void {
  if (typeof window === 'undefined') return
  
  try {
    const now = Date.now()
    const fullDraft: DraftIntake = {
      ...draft,
      updatedAt: now,
      expiresAt: now + DRAFT_EXPIRY_HOURS * 60 * 60 * 1000,
    }
    
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(fullDraft))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load saved draft if exists and not expired
 */
export function loadDraft(): DraftIntake | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!stored) return null
    
    const draft: DraftIntake = JSON.parse(stored)
    
    // Check expiry
    if (Date.now() > draft.expiresAt) {
      clearDraft()
      return null
    }
    
    // Require at least 2 messages to be worth resuming
    if (draft.messages.length < 2) {
      clearDraft()
      return null
    }
    
    return draft
  } catch {
    return null
  }
}

/**
 * Clear saved draft
 */
export function clearDraft(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DRAFT_STORAGE_KEY)
}

/**
 * Check if a draft exists
 */
export function hasDraft(): boolean {
  return loadDraft() !== null
}

/**
 * Get draft summary for resume prompt
 */
export function getDraftSummary(draft: DraftIntake): {
  serviceLabel: string
  messageCount: number
  lastActivity: string
  progress: number
} {
  const serviceLabels: Record<string, string> = {
    'med_cert': 'Medical Certificate',
    'medical_certificate': 'Medical Certificate',
    'repeat_rx': 'Repeat Prescription',
    'repeat_prescription': 'Repeat Prescription',
    'new_rx': 'New Prescription',
    'new_prescription': 'New Prescription',
    'consult': 'GP Consult',
    'general_consult': 'GP Consult',
  }
  
  const lastMessage = draft.messages[draft.messages.length - 1]
  const lastActivityDate = new Date(lastMessage?.timestamp || draft.updatedAt)
  
  // Format relative time
  const diffMs = Date.now() - lastActivityDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  let lastActivity: string
  if (diffMins < 1) {
    lastActivity = 'just now'
  } else if (diffMins < 60) {
    lastActivity = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    lastActivity = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else {
    lastActivity = lastActivityDate.toLocaleDateString()
  }
  
  return {
    serviceLabel: draft.serviceType ? serviceLabels[draft.serviceType] || 'Request' : 'Request',
    messageCount: draft.messages.length,
    lastActivity,
    progress: Math.round((draft.currentStep / draft.totalSteps) * 100),
  }
}

// =============================================================================
// DRAFT ID GENERATION
// =============================================================================

export function generateDraftId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `draft_${crypto.randomUUID()}`
  }
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}
